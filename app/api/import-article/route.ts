import { NextResponse } from "next/server";
import crypto from "crypto";
import { checkContentSafety } from "@/lib/safety";
import { IELTS_VOCAB_DB } from "@/lib/ielts-vocabulary";
import type { VocabularyCategory, VocabularyDatabase } from "@/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseJsonCompletion, streamOpenAIResponse } from "@/lib/ai-stream";
import { createAdminClient } from "@/lib/supabase-admin";
import { formatQualityRules, getReadingLevel, normalizeReadingLevelId } from "@/lib/reading-levels";

const VOCAB_DB = IELTS_VOCAB_DB as VocabularyDatabase;

const TOPIC_VOCAB_LABELS: Record<string, string[]> = {
  env: ["自然地理", "植物研究", "动物保护"],
  tech: ["科技发明", "太空探索"],
  edu: ["学校教育"],
  soc: ["文化历史", "物品材料"],
  cul: ["文化历史", "语言演化", "娱乐运动", "时尚潮流"],
};

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const flattenWords = (category: VocabularyCategory) =>
  category.words.flat().map((entry) => entry.word).filter(Boolean);

const pickMandatoryKeywords = (topicId: string | undefined, count = 10) => {
  const labels = topicId ? TOPIC_VOCAB_LABELS[topicId] || [] : [];
  const availableLabels = labels.filter((label) => Boolean(VOCAB_DB[label]));
  const fallbackLabels = Object.keys(VOCAB_DB);
  const targetLabels = availableLabels.length > 0 ? availableLabels : fallbackLabels;
  const words = targetLabels.flatMap((label) => {
    const category = VOCAB_DB[label];
    return category ? flattenWords(category) : [];
  });
  const seen = new Set<string>();
  const unique = words.filter((word) => {
    const key = word.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return shuffle(unique).slice(0, count);
};

const countWords = (input: string) => {
  const normalized = input.trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/).length;
};

const truncateToWords = (input: string, limit: number) => {
  const normalized = input.trim();
  if (!normalized) return "";
  const words = normalized.split(/\s+/);
  if (words.length <= limit) return normalized;
  return words.slice(0, limit).join(" ");
};

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const { text, userId, level: rawLevel = "IELTS", topicId, userTitle } = await request.json();
    const level = normalizeReadingLevelId(rawLevel);
    const levelConfig = getReadingLevel(level);

    if (!text || !userId) {
      return NextResponse.json({ error: "Missing text or userId" }, { status: 400 });
    }

    const slicedText = String(text).slice(0, 3500);
    const normalizedText = truncateToWords(slicedText, 3500);
    const hashInput = userTitle ? `${normalizedText}|${level}|${userTitle}` : `${normalizedText}|${level}`;
    const contentHash = crypto.createHash("sha256").update(hashInput).digest("hex");

    const { data: cachedArticle } = await supabase
      .from("articles")
      .select("*")
      .eq("content_hash", contentHash)
      .not("aiVocabulary", "is", null)
      .limit(1)
      .single();

    if (cachedArticle) {
      return NextResponse.json({
        id: cachedArticle.id,
        title: cachedArticle.title,
        title_zh: cachedArticle.title_zh,
        content: cachedArticle.content,
        level: cachedArticle.difficulty,
        phrases: cachedArticle.phrases || [],
        vocabulary: cachedArticle.aiVocabulary || [],
        sentences: cachedArticle.aiSentences || [],
        tags: cachedArticle.tags || [],
      });
    }

    const safetyCheck = checkContentSafety(slicedText);
    if (!safetyCheck.isSafe) {
      return NextResponse.json({
        title: "导入失败：内容违规",
        title_zh: "Content Blocked",
        content: "很抱歉，该文章包含敏感或违规信息（如政治、暴恐等），系统已自动拦截。请勿尝试导入违规内容。",
        phrases: [],
        vocabulary: [],
        sentences: [],
        tags: ["违规拦截"],
      });
    }

    const rateLimit = await checkRateLimit(userId, "analyze_article", 5);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.reason || "今日导入额度已用完 (每日限 5 篇)" },
        { status: 429 }
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;
    const baseUrl = process.env.AI_BASE_URL || "https://api.deepseek.com";
    if (!apiKey) {
      return NextResponse.json({ error: "API Key is missing" }, { status: 500 });
    }

    const wasTruncated = String(text).length > 3500 || countWords(String(text)) > 3500;
    const mandatoryKeywords = levelConfig.mandatoryKeywordCount > 0
      ? pickMandatoryKeywords(topicId, levelConfig.mandatoryKeywordCount)
      : [];
    const qualityRules = formatQualityRules(levelConfig);
    const titleInstruction = userTitle
      ? `CRITICAL: The user has explicitly provided the title: "${userTitle}". You MUST use this EXACT string for the "title" field. For "title_zh", provide a direct Simplified Chinese translation of "${userTitle}". Do NOT generate a new title.`
      : `Auto-generate a short, engaging English title for "title", and its Simplified Chinese translation for "title_zh".`;

    const systemPrompt = `You are an expert IELTS/TOEFL exam passage writer and editor.
    
**TASK: Content Import & Cleanup**
Your goal is to prepare raw text for a reading app.

**CRITICAL CLEANUP RULES:**
1. **Remove Gibberish/Noise:** AGGRESSIVELY remove random strings of characters, keyboard mashing, or non-content noise (e.g., "dawuyfdktgaewbfkuwseftugq", "asdfjkl", "123123").
2. **Remove Ads/Meta:** Remove "Subscribe", "Read more", URLs, navigation text, and footer content.
3. **Fix Formatting:** Ensure proper paragraph spacing and remove excessive line breaks.

**Reference Level:** ${levelConfig.label} (${level})
**Level Guide:** ${levelConfig.importGuide}
**Quality Bar:**
${qualityRules}
**Exam Constraints:** Keep the cleaned text suitable for the selected exam level. Do not upgrade Zhongkao/Gaokao text into IELTS-style academic prose.
**Mandatory Keywords:** ${mandatoryKeywords.length > 0 ? mandatoryKeywords.join(", ") : "None"}
${titleInstruction}

**Optimization Mode:**
- Do NOT generate vocabulary lists, phrases, or sentence analysis yet.
- ONLY return: title, cleaned content, level, tags.
- The "level" field must be exactly "${level}".

Output JSON format:
{
  "title": "English Title",
  "title_zh": "Chinese Title",
  "summary": "One sentence summary",
  "level": "${level}",
  "tags": ["tag1", "tag2"],
  "content": "The cleaned and processed text content..."
}`;

    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: normalizedText },
        ],
        temperature: 0.3,
        stream: true,
        response_format: { type: "json_object" },
      }),
    });

    if (!upstream.ok) {
      throw new Error(`AI API Error: ${upstream.status}`);
    }

    return streamOpenAIResponse({
      upstream,
      parse: (raw) => parseJsonCompletion<any>(raw),
      onDone: async (result) => {
        const newArticleId = crypto.randomUUID();
        const baseTags = Array.isArray(result.tags) ? result.tags : [];
        const finalTags = wasTruncated ? ["⚠️内容超过3500词已截断", ...baseTags] : baseTags;
        const finalContent = result.content || normalizedText;
        const contentWordCount = countWords(finalContent);

        await supabase.from("articles").insert([
          {
            id: newArticleId,
            title: result.title,
            title_zh: result.title_zh,
            content: finalContent,
            difficulty: level,
            level,
            tags: finalTags,
            is_public: false,
            word_count: contentWordCount,
            created_at: new Date().toISOString(),
            user_id: userId,
            content_hash: contentHash,
            aiVocabulary: [],
            aiSentences: [],
            phrases: [],
          },
        ]);

        return {
          id: newArticleId,
          title: result.title,
          title_zh: result.title_zh,
          content: finalContent,
          level,
          phrases: [],
          vocabulary: [],
          sentences: [],
          tags: finalTags,
        };
      },
    });
  } catch (error) {
    console.error("Import article failed:", error);
    return NextResponse.json({ error: "AI 分析服务暂时不可用，请稍后再试" }, { status: 500 });
  }
}
