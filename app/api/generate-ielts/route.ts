/**
 * 生成雅思/托福阅读文章的 API 路由，根据用户选择的主题和难度，利用 AI 生成符合考试标准的学术文章，包含智能选题和缓存机制。
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkContentSafety } from '@/lib/safety';
import { shuffle, flattenWords, pickMandatoryKeywords, TOPIC_VOCAB_LABELS } from '@/lib/vocab-utils';
import { parseJsonCompletion, streamOpenAIResponse } from '@/lib/ai-stream';
import { formatQualityRules, getReadingLevel, normalizeReadingLevelId } from '@/lib/reading-levels';

// --- 配置区域 ---

// 1. 定义细分角度池 (Sub-topic Roulette)
// 解决“千篇一律”的核心：每次生成都强制从这里随机选一个具体切入点
const TOPIC_ANGLES: Record<string, string[]> = {
  'tech': [
    "The Ethics of Artificial Intelligence in Healthcare",
    "Space Debris: The Hidden Danger Orbiting Earth",
    "Quantum Computing: A New Era of Processing Power",
    "The Impact of 5G on Global Communication",
    "Biometrics and Privacy in the Digital Age",
    "Autonomous Vehicles: Legal and Moral Dilemmas"
  ],
  'env': [
    "Microplastics in the Ocean Ecosystem",
    "Urban Vertical Farming as a Sustainability Solution",
    "The Economic Impact of Carbon Tax Policies",
    "Renewable Energy Storage Challenges",
    "Biodiversity Loss and Its Effect on Agriculture"
  ],
  'edu': [
    "The Shift from Rote Learning to Critical Thinking",
    "Gamification in Modern Classrooms",
    "The Psychological Effects of Remote Learning",
    "Lifelong Learning in a Gig Economy",
    "Standardized Testing: Pros and Cons"
  ],
  'soc': [
    "The Gig Economy and Worker Rights",
    "Urbanization and Mental Health",
    "The Role of Social Media in Political Polarization",
    "Aging Populations and Economic Strain",
    "Cultural Homogenization in a Globalized World"
  ],
  'cul': [
    "Preserving Indigenous Languages via Technology",
    "The Evolution of Street Art",
    "Minimalism vs. Consumerism",
    "The Influence of Streaming Services on Cinema",
    "Traditional Architecture in Modern Cities"
  ]
};

/**
 * 根据主题和难度等级生成新的阅读文章。
 * 
 * @route POST /api/generate-ielts
 * @param {object} req.body
 * @param {string} req.body.topicPrompt - 用户提供的主题或关键词
 * @param {string} [req.body.topicId] - 宽泛的分类 ID (tech, env 等)
 * @param {string} [req.body.level="IELTS"] - 难度等级 (CET-4, IELTS 等)
 * @param {string} req.body.userId - 请求用户的 ID
 * @returns {object} 生成的文章对象 (已保存到数据库)
 */
export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || "https://api.deepseek.com";

  if (!apiKey) return NextResponse.json({ error: "Missing API Key" }, { status: 500 });

  try {
    const body = await req.json().catch(() => ({}));
    let { topicPrompt, topicId, level = 'IELTS', userId } = body;
    level = normalizeReadingLevelId(level);
    const levelConfig = getReadingLevel(level);
    if (!userId) {
      return NextResponse.json({ error: "未登录，无法生成公共文章。" }, { status: 401 });
    }

    // 🛡️ Rate Limiting & Admin Bypass
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const rateLimit = await checkRateLimit(userId, "generate_ielts", 2);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.reason || "今日生成额度已用完 (每日限 2 篇)" }, { status: 429 });
    }

    const inputSafety = checkContentSafety(String(topicPrompt || ""));
    if (!inputSafety.isSafe) {
      return NextResponse.json({ error: "输入内容包含敏感信息，无法生成。" }, { status: 400 });
    }

    // --- 2. 智能选题逻辑 (Smart Selection) ---
    // 如果用户选了大类 (topicId 存在)，我们帮他随机选个细分角度
    let specificTopic = topicPrompt;
    if (topicId && TOPIC_ANGLES[topicId]) {
      const angles = TOPIC_ANGLES[topicId];
      // 随机选一个角度，让每次生成都不一样
      const randomAngle = angles[Math.floor(Math.random() * angles.length)];
      specificTopic = `${randomAngle} (Broad Topic: ${topicPrompt})`;
    }

    // --- 3. 查缓存 (Cache First) ---
    // Key 变了 (specificTopic)，所以用户不会再刷到重复的旧文了
    const { data: cachedArticle } = await supabase
      .from('articles')
      .select('*')
      .eq('topic', specificTopic) // 注意：这里匹配的是细分主题
      .eq('difficulty', level)   // 匹配难度
      .eq('is_public', true)
      .limit(1)
      .single();

    if (cachedArticle) {
      return NextResponse.json(cachedArticle);
    }

    // --- 4. 生成新文章 (Calling AI) ---
    const mandatoryKeywords = levelConfig.mandatoryKeywordCount > 0
      ? pickMandatoryKeywords(topicId || "", levelConfig.mandatoryKeywordCount)
      : [];
    const targetLength = levelConfig.lengthRange;
    const qualityRules = formatQualityRules(levelConfig);
    
    const systemPrompt = `You are an Expert English Exam Content Creator.
    **Task:** Write a reading passage based on the topic provided.
    **Topic:** "${specificTopic}"
    **Target Level:** ${levelConfig.label} (${level})
    **Style Guide:** ${levelConfig.generationGuide}
    **Target Length:** ${targetLength} words

    **Mandatory Keywords:** ${mandatoryKeywords.length > 0 ? mandatoryKeywords.join(", ") : "None"}

    **Strict Requirements:**
    1. **Format:** JSON only. NO markdown.
    2. **Length:** ${targetLength} words.
    3. **Content:** Neutral, educational, and exam-appropriate for the selected level. Avoid controversial politics.
    4. **Level Fit:** Follow the target level exactly. Do not make Zhongkao/Gaokao passages sound like IELTS/TOEFL academic writing.
    5. **Variety:** Use grammar patterns suitable for the level; avoid overcomplicating lower-level passages.
    6. **Mandatory Keywords:** If keywords are provided, use every keyword naturally in context and build key test-style sentences around them.
    7. **Self-Check:** Before output, verify the passage meets the level-specific quality bar below. If tone, vocabulary, logic, or length is off-level, rewrite first.

    **Level-Specific Quality Bar:**
    ${qualityRules}

    **Output JSON Structure:**
    {
      "title": "Engaging English Title",
      "title_zh": "Simplified Chinese Title",
      "content": "Full article text with paragraph breaks...",
      "difficulty": "${level}",
      "level": "${level}",
      "tags": ["Tag1", "Tag2"],
      "vocabulary": [
        { "word": "word1", "phonetic": "/.../", "definition": "Chinese def", "example": "Sentence from text." }
      ],
      "sentences": [
         { "original": "Complex sentence from text.", "translation": "Chinese trans.", "structure": "Analysis." }
      ]
    }`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Generate now." },
          ],
          temperature: 1.25, // 提高一点温度，增加创造性
          stream: true,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
      
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`AI API Error: ${response.status}`);

    return streamOpenAIResponse({
      upstream: response,
      parse: (raw) => parseJsonCompletion<any>(raw),
      onDone: async (aiResult) => {
        const outputSafety = checkContentSafety(`${aiResult.content || ""} ${aiResult.title || ""}`);
        if (!outputSafety.isSafe) {
          throw new Error("生成内容未通过安全审查，请重试。");
        }

        const finalArticleData = {
          id: crypto.randomUUID(),
          title: aiResult.title,
          title_zh: aiResult.title_zh,
          content: aiResult.content,
          topic: specificTopic,
          difficulty: level,
          level,
          tags: aiResult.tags,
          user_id: userId,
          is_public: true,
        };
        const normalizedAiResult = {
          ...aiResult,
          difficulty: level,
          level,
        };

        let savedArticle = null;
        try {
          const { data: inserted, error: insertError } = await supabase
            .from('articles')
            .insert([finalArticleData])
            .select('*')
            .single();
          if (insertError) throw insertError;
          savedArticle = inserted;
        } catch (dbError) {
          console.error("Cache failed:", dbError);
        }

        if (savedArticle) {
          return { ...savedArticle, ...normalizedAiResult };
        }

        return { ...finalArticleData, ...normalizedAiResult };
      },
    });

  } catch (error: any) {
    console.error("Gen Error:", error);
    return NextResponse.json({ error: "Generation failed, please try again." }, { status: 500 });
  }
}
