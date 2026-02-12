"use server";

import { checkContentSafety } from "@/lib/safety";
import type { AIProcessResult } from "@/lib/ai-processor";
import vocabularyData from "@/lib/vocabulary-data.json";
import type { VocabularyCategory, VocabularyDatabase } from "@/types";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VOCAB_DB = vocabularyData as VocabularyDatabase;

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

export async function analyzeArticleWithAI(
  text: string,
  userId: string,
  level: string = "IELTS",
  topicId?: string
): Promise<AIProcessResult> {
  const slicedText = text.slice(0, 3500);
  const normalizedText = truncateToWords(slicedText, 3500);

  // ⚡ 0. 缓存策略 (Cache Reuse) - 必须在限流之前检查，避免浪费额度
  const contentHash = crypto.createHash("sha256").update(normalizedText).digest("hex");
  
  // 检查数据库中是否已存在相同内容的已分析文章
  const { data: cachedArticle } = await supabase
    .from("articles")
    .select("*")
    .eq("content_hash", contentHash)
    .not("aiVocabulary", "is", null) // 确保有分析结果
    .limit(1)
    .single();

  if (cachedArticle) {
      // 命中缓存！直接返回结果，不消耗额度
      return {
          id: cachedArticle.id,
          title: cachedArticle.title,
          title_zh: cachedArticle.title_zh,
          content: cachedArticle.content,
          level: cachedArticle.difficulty,
          phrases: cachedArticle.phrases || [],
          vocabulary: cachedArticle.aiVocabulary || [], // 映射回 AIProcessResult 格式
          sentences: cachedArticle.aiSentences || [],
          tags: cachedArticle.tags || [],
      };
  }

  // 🚨 1. 第一道防线：立刻检查敏感词
  // 如果这里通过不了，绝对不会调用 AI，也不会入库
  const safetyCheck = checkContentSafety(slicedText);
  
  if (!safetyCheck.isSafe) {
    console.error("❌ Blocked unsafe content import:", safetyCheck.reason);
    // 返回一个“伪造”的失败结果，前端会显示为导入失败
    return {
      title: "导入失败：内容违规",
      title_zh: "Content Blocked",
      content: "很抱歉，该文章包含敏感或违规信息（如政治、暴恐等），系统已自动拦截。请勿尝试导入违规内容。",
      phrases: [],
      vocabulary: [],
      sentences: [],
      tags: ["违规拦截"]
    };
  }
  if (!userId) {
    throw new Error("User ID is missing");
  }

  // 🛡️ 2. 第二道防线：Rate Limiting (IP & Daily Quota)
  const rateLimit = await checkRateLimit(userId, "analyze_article");
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.reason || "Rate limit exceeded");
  }

  // ... 以下是正常的 AI 处理逻辑 ...
  
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || "https://api.deepseek.com";
  
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  try {
    const levelGuide: Record<string, string> = {
      "CET-4": "Sentence length 15-20 words. Vocab: common 4000 words. Use formal but accessible exam tone.",
      "CET-6": "Formal exam tone with tighter logic. Vocab: common 6000 words.",
      "IELTS": "Varied sentence lengths, heavy paraphrasing, academic and objective tone.",
      "TOEFL": "Academic lecture style with dense discipline-specific terms.",
      "PG-Entrance": "High-density logic and long complex sentences."
    };

    const lengthGuide: Record<string, string> = {
      "CET-4": "300-500",
      "CET-6": "300-500",
      "IELTS": "700-1000",
      "TOEFL": "700-1000",
      "PG-Entrance": "700-1000",
    };

    const normalizedText = truncateToWords(slicedText, 3500);
    const wasTruncated = text.length > 3500 || countWords(text) > 3500;
    const mandatoryKeywords = pickMandatoryKeywords(topicId, 10);

    const systemPrompt = `You are an expert IELTS/TOEFL exam passage writer and reviewer.
    **Reference Level:** ${level}
    **Level Guide:** ${levelGuide[level] || levelGuide.IELTS}
    **Length Limit:** ${lengthGuide[level] || lengthGuide.IELTS} words
    **Academic Constraints:** Formal exam tone, no conversational phrases (e.g., "I think"). Use complex logical connectors.
    **Mandatory Keywords:** ${mandatoryKeywords.length > 0 ? mandatoryKeywords.join(", ") : "None"}
    If the input text violates style or length constraints, rewrite it to comply before analyzing.
    Output JSON format:
    {
      "title": "English Title",
      "title_zh": "Chinese Title",
      "summary": "One sentence summary",
      "level": "CEFR Level (A1-C2)",
      "tags": ["tag1", "tag2"],
      "vocabulary": [ {"word": "example", "definition": "...", "translation": "..."} ],
      "phrases": ["phrase 1", "phrase 2"],
      "sentences": [ {"text": "...", "grammar_point": "..."} ]
    }`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: normalizedText }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`AI API Error: ${response.status}`);
    }

    const data = await response.json();
    let contentStr = data.choices[0].message.content;
    contentStr = contentStr.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const result = JSON.parse(contentStr);
    const newArticleId = crypto.randomUUID();

    const baseTags = Array.isArray(result.tags) ? result.tags : [];
    const finalTags = wasTruncated ? ["⚠️内容超过3500词已截断", ...baseTags] : baseTags;
    const contentWordCount = countWords(normalizedText);

    await supabase.from("articles").insert([{
      id: newArticleId,
      title: result.title,
      title_zh: result.title_zh,
      content: normalizedText,
      difficulty: result.level || "Intermediate",
      tags: finalTags,
      is_public: false,
      word_count: contentWordCount,
      created_at: new Date().toISOString(),
      user_id: userId,
      content_hash: contentHash, // 存储 Hash
      aiVocabulary: result.vocabulary || [],
      aiSentences: result.sentences || [],
      phrases: result.phrases || [],
    }]);

    return {
      id: newArticleId,
      title: result.title,
      title_zh: result.title_zh,
      content: normalizedText,
      level: result.level,
      phrases: result.phrases || [],
      vocabulary: result.vocabulary || [],
      sentences: result.sentences || [],
      tags: finalTags
    };

  } catch (error) {
    console.error("AI Analysis Failed:", error);
    throw new Error("AI 分析服务暂时不可用，请稍后再试");
  }
}
