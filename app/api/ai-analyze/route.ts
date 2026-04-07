/**
 * 处理文章 AI 深度分析的 API 路由，支持通过哈希缓存结果、敏感词过滤、速率限制，并调用 DeepSeek API 生成文章的词汇、短语和句子分析。
 */
import { NextResponse } from "next/server";
import { checkContentSafety } from "@/lib/safety";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseJsonCompletion, streamOpenAIResponse } from "@/lib/ai-stream";
import { createAdminClient } from "@/lib/supabase-admin";

export const runtime = 'edge';

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

async function getSHA256Hash(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * 分析整篇文章文本，提取词汇、短语和句子结构。
 * 支持通过内容 SHA-256 哈希进行缓存。
 * 
 * @route POST /api/ai-analyze
 * @param {object} req.body
 * @param {string} req.body.text - 文章全文
 * @param {string} req.body.userId - 用户 ID，用于速率限制
 * @param {string} [req.body.level="IELTS"] - 目标难度等级
 * @param {string} [req.body.topicId] - 可选的主题 ID
 * @returns {Response} 分析结果的服务器发送事件流 (SSE) 或 JSON
 */
export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const { text, userId, level = "IELTS", topicId } = await req.json();

    if (!text || !userId) {
      return NextResponse.json({ error: "Missing text or userId" }, { status: 400 });
    }

    const slicedText = text.slice(0, 3500);
    const normalizedText = truncateToWords(slicedText, 3500);

    // ⚡ 0. 缓存策略 (Cache Reuse)
    const contentHash = await getSHA256Hash(normalizedText);
    
    // 检查数据库中是否已存在相同内容的已分析文章
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

    // 🚨 1. 第一道防线：敏感词检查
    const safetyCheck = checkContentSafety(slicedText);
    if (!safetyCheck.isSafe) {
      return NextResponse.json({
        title: "导入失败：内容违规",
        title_zh: "Content Blocked",
        content: "很抱歉，该文章包含敏感或违规信息（如政治、暴恐等），系统已自动拦截。请勿尝试导入违规内容。",
        phrases: [],
        vocabulary: [],
        sentences: [],
        tags: ["违规拦截"]
      });
    }

    // 🛡️ 2. 第二道防线：Rate Limiting
    const rateLimit = await checkRateLimit(userId, "analyze_article", 5);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.reason || "今日导入额度已用完 (每日限 2 篇)" }, { status: 429 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;
    const baseUrl = process.env.AI_BASE_URL || "https://api.deepseek.com";
    
    if (!apiKey) {
      return NextResponse.json({ error: "API Key is missing" }, { status: 500 });
    }

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

    const mandatoryKeywords = "None"; 

    const systemPrompt = `You are an expert IELTS/TOEFL exam passage writer and reviewer.
    **Reference Level:** ${level}
    **Level Guide:** ${levelGuide[level] || levelGuide.IELTS}
    **Length Limit:** ${lengthGuide[level] || lengthGuide.IELTS} words
    **Academic Constraints:** Formal exam tone, no conversational phrases (e.g., "I think"). Use complex logical connectors.
    **Mandatory Keywords:** ${mandatoryKeywords}
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
        stream: true, // Enable streaming
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("AI API Error:", errText);
        return NextResponse.json({ error: "AI Service Error" }, { status: response.status });
    }

    return streamOpenAIResponse({
      upstream: response,
      parse: (raw) => parseJsonCompletion<any>(raw),
    });

  } catch (error: any) {
    console.error("Handler error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
