/**
 * 生成雅思/托福阅读文章的 API 路由，根据用户选择的主题和难度，利用 AI 生成符合考试标准的学术文章，包含智能选题和缓存机制。
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkContentSafety } from '@/lib/safety';
import { IELTS_VOCAB_DB } from '@/lib/ielts-vocabulary';
import type { VocabularyCategory, VocabularyDatabase } from '@/types';

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

const LEVEL_CONFIG: Record<string, string> = {
  'CET-4': 'Level: University English Band 4 (China). Sentence length: 15-20 words. Vocab: common 4000 words. Style: clear, structured.',
  'CET-6': 'Level: University English Band 6 (China). Style: formal, argumentative, nuanced.',
  'IELTS': 'Level: IELTS Academic Band 7+. Sentence length: varied (short + long). Use heavy paraphrasing. Style: academic, objective.',
  'TOEFL': 'Level: TOEFL iBT. Context: academic lecture. Increase discipline-specific terminology density.',
  'PG-Entrance': 'Level: Chinese Postgraduate Entrance Exam (Kaoyan). Focus: long complex sentences and precise logic.'
};

const VOCAB_DB = IELTS_VOCAB_DB as VocabularyDatabase;

const TOPIC_VOCAB_LABELS: Record<string, string[]> = {
  env: ['自然地理', '植物研究', '动物保护'],
  tech: ['科技发明', '太空探索'],
  edu: ['学校教育'],
  soc: ['文化历史', '物品材料'],
  cul: ['文化历史', '语言演化', '娱乐运动', '时尚潮流']
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

const pickMandatoryKeywords = (topicId: string, count = 10) => {
  const labels = TOPIC_VOCAB_LABELS[topicId] || [];
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

    // 默认回退
    if (!LEVEL_CONFIG[level]) level = 'IELTS';
    
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
    const levelGuide = LEVEL_CONFIG[level];
    const mandatoryKeywords = pickMandatoryKeywords(topicId || "", 10);
    const targetLength = level === "IELTS" ? "700-1000" : "350-500";
    
    const systemPrompt = `You are an Expert English Exam Content Creator.
    **Task:** Write a reading passage based on the topic provided.
    **Topic:** "${specificTopic}"
    **Target Level:** ${level}
    **Style Guide:** ${levelGuide}

    **Mandatory Keywords:** ${mandatoryKeywords.length > 0 ? mandatoryKeywords.join(", ") : "None"}

    **Strict Requirements:**
    1. **Format:** JSON only. NO markdown.
    2. **Length:** ${targetLength} words.
    3. **Content:** Academic, neutral, and educational. Avoid controversial politics.
    4. **Variety:** Use a mix of passive voice, inversions, and participial phrases suitable for the level.
    5. **Mandatory Keywords:** Use every keyword naturally in context, and build key test-style sentences around them.
    6. **Self-Check:** After writing, verify the article meets academic reading standards. If tone is too childish or logic is broken, rewrite before outputting the final JSON.

    **Output JSON Structure:**
    {
      "title": "Engaging English Title",
      "title_zh": "Simplified Chinese Title",
      "content": "Full article text with paragraph breaks...",
      "difficulty": "${level}",
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
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
      
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`AI API Error: ${response.status}`);

    const data = await response.json();
    const contentStr = data.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
    let aiResult;
    try {
      aiResult = JSON.parse(contentStr);
    } catch (e) {
      console.error("JSON Parse Error", e);
      throw new Error("AI生成格式错误");
    }

    const outputSafety = checkContentSafety(`${aiResult.content || ""} ${aiResult.title || ""}`);
    if (!outputSafety.isSafe) {
      return NextResponse.json({ error: "生成内容未通过安全审查，请重试。" }, { status: 400 });
    }

    // --- 5. 存入公共库 (Public Share) ---
    const finalArticleData = {
        id: crypto.randomUUID(),
        title: aiResult.title,
        title_zh: aiResult.title_zh,
        content: aiResult.content,
        topic: specificTopic, // 存入细分主题
        difficulty: level,
        level: level,
        tags: aiResult.tags,
        user_id: userId,
        is_public: true, 
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
      return NextResponse.json({ ...savedArticle, ...aiResult });
    }

    return NextResponse.json({ ...finalArticleData, ...aiResult });

  } catch (error: any) {
    console.error("Gen Error:", error);
    return NextResponse.json({ error: "Generation failed, please try again." }, { status: 500 });
  }
}
