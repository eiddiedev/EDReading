/**
 * 生成阅读文章的 API 路由，根据用户选择的主题和难度，利用 AI 生成更灵活、更高质量的文章。
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkContentSafety } from "@/lib/safety";
import { countWords, pickMandatoryKeywords } from "@/lib/vocab-utils";
import { parseJsonCompletion, streamOpenAIResponse } from "@/lib/ai-stream";
import { formatQualityRules, getReadingLevel, normalizeReadingLevelId } from "@/lib/reading-levels";

type TopicMeta = {
  broadTag: string;
  label: string;
  fallbackAngles: string[];
};

type RecentArticle = {
  title?: string | null;
  topic?: string | null;
  tags?: string[] | null;
  created_at?: string | null;
};

type SubtopicCandidate = {
  subtopic: string;
  focus: string;
  keywords: string[];
  why_it_is_distinct: string;
  outline: string[];
};

type PlanningResult = {
  candidates: SubtopicCandidate[];
};

type ArticlePayload = {
  title?: string;
  title_zh?: string;
  content?: string;
  difficulty?: string;
  level?: string;
  topic?: string;
  tags?: string[];
  vocabulary?: unknown[];
  sentences?: unknown[];
};

type ValidationResult = {
  isValid: boolean;
  issues: string[];
  wordCount: number;
};

const TOPIC_META: Record<string, TopicMeta> = {
  tech: {
    broadTag: "Technology",
    label: "Technology and Future",
    fallbackAngles: [
      "The Ethics of Artificial Intelligence in Healthcare",
      "Space Debris: The Hidden Danger Orbiting Earth",
      "Quantum Computing: A New Era of Processing Power",
      "The Impact of 5G on Global Communication",
      "Biometrics and Privacy in the Digital Age",
      "Autonomous Vehicles: Legal and Moral Dilemmas",
    ],
  },
  env: {
    broadTag: "Environment",
    label: "Environment and Nature",
    fallbackAngles: [
      "Microplastics in the Ocean Ecosystem",
      "Urban Vertical Farming as a Sustainability Solution",
      "The Economic Impact of Carbon Tax Policies",
      "Renewable Energy Storage Challenges",
      "Biodiversity Loss and Its Effect on Agriculture",
    ],
  },
  edu: {
    broadTag: "Education",
    label: "Education and Growth",
    fallbackAngles: [
      "The Shift from Rote Learning to Critical Thinking",
      "Gamification in Modern Classrooms",
      "The Psychological Effects of Remote Learning",
      "Lifelong Learning in a Gig Economy",
      "Standardized Testing: Pros and Cons",
    ],
  },
  soc: {
    broadTag: "Society",
    label: "Society and Modern Life",
    fallbackAngles: [
      "The Gig Economy and Worker Rights",
      "Urbanization and Mental Health",
      "The Role of Social Media in Political Polarization",
      "Aging Populations and Economic Strain",
      "Cultural Homogenization in a Globalized World",
    ],
  },
  cul: {
    broadTag: "Culture",
    label: "Culture and Arts",
    fallbackAngles: [
      "Preserving Indigenous Languages via Technology",
      "The Evolution of Street Art",
      "Minimalism vs. Consumerism",
      "The Influence of Streaming Services on Cinema",
      "Traditional Architecture in Modern Cities",
    ],
  },
};

const MAX_TOPIC_HISTORY = 20;
const MAX_SUBTOPIC_CANDIDATES = 5;
const MAX_REWRITE_ATTEMPTS = 2;

const normalizeCompareText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenizeCompareText = (value: string) =>
  normalizeCompareText(value)
    .split(" ")
    .filter((token) => token.length >= 4);

const parseLengthRange = (range: string) => {
  const matched = range.match(/(\d+)\s*-\s*(\d+)/);
  if (!matched) return { min: 0, max: Number.MAX_SAFE_INTEGER };
  return { min: Number(matched[1]), max: Number(matched[2]) };
};

const dedupeStrings = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const enrichTags = (tags: string[] | undefined, broadTag: string) =>
  dedupeStrings([...(tags || []), broadTag]).slice(0, 5);

const extractRecentReferences = (articles: RecentArticle[]) =>
  articles
    .map((article) =>
      [article.title, article.topic, ...(article.tags || [])]
        .filter(Boolean)
        .join(" | ")
    )
    .filter(Boolean);

const similarityScore = (left: string, right: string) => {
  const normalizedLeft = normalizeCompareText(left);
  const normalizedRight = normalizeCompareText(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) {
    return 1;
  }

  const leftTokens = new Set(tokenizeCompareText(left));
  const rightTokens = new Set(tokenizeCompareText(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let overlap = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) overlap += 1;
  });

  const unionSize = new Set([...leftTokens, ...rightTokens]).size;
  return unionSize === 0 ? 0 : overlap / unionSize;
};

const isCandidateTooSimilar = (candidate: string, recentReferences: string[]) =>
  recentReferences.some((reference) => similarityScore(candidate, reference) >= 0.45);

const buildFallbackCandidate = (
  topicPrompt: string,
  topicMeta: TopicMeta | undefined,
  recentReferences: string[]
): SubtopicCandidate => {
  const fallbackAngles = topicMeta?.fallbackAngles || [topicPrompt];
  const selectedAngle =
    fallbackAngles.find((angle) => !isCandidateTooSimilar(angle, recentReferences)) || fallbackAngles[0] || topicPrompt;

  return {
    subtopic: selectedAngle,
    focus: `Explain the topic with clear progression, concrete examples, and a level-appropriate tone for ${topicMeta?.label || topicPrompt}.`,
    keywords: [],
    why_it_is_distinct: "Fallback topic selected because dynamic subtopic planning failed or produced overly similar candidates.",
    outline: [
      "Introduce the issue and explain why it matters.",
      "Describe the main mechanism, process, or conflict with concrete details.",
      "Discuss implications, trade-offs, or future significance with a clear conclusion.",
    ],
  };
};

const validateCandidate = (candidate: Partial<SubtopicCandidate>): candidate is SubtopicCandidate =>
  typeof candidate.subtopic === "string" &&
  candidate.subtopic.trim().length > 8 &&
  typeof candidate.focus === "string" &&
  candidate.focus.trim().length > 10 &&
  Array.isArray(candidate.keywords) &&
  Array.isArray(candidate.outline) &&
  candidate.outline.length >= 2;

async function requestJsonCompletion<T>({
  apiKey,
  baseUrl,
  messages,
  temperature = 0.7,
}: {
  apiKey: string;
  baseUrl: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
}) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API Error: ${response.status}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("AI JSON completion missing message content");
  }

  return parseJsonCompletion<T>(content);
}

async function fetchRecentArticlesForTopic({
  supabase,
  level,
  broadTag,
}: {
  supabase: any;
  level: string;
  broadTag?: string;
}) {
  let query = supabase
    .from("articles")
    .select("title, topic, tags, created_at")
    .eq("difficulty", level)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(MAX_TOPIC_HISTORY);

  if (broadTag) {
    query = query.contains("tags", [broadTag]);
  }

  const { data } = await query;
  return (data || []) as RecentArticle[];
}

function selectSubtopicCandidate(
  candidates: SubtopicCandidate[],
  recentReferences: string[],
  fallbackCandidate: SubtopicCandidate
) {
  const selected =
    candidates.find((candidate) => !isCandidateTooSimilar(candidate.subtopic, recentReferences)) || fallbackCandidate;

  return {
    selected,
    usedFallback: selected.subtopic === fallbackCandidate.subtopic,
  };
}

async function buildSubtopicPlan({
  apiKey,
  baseUrl,
  topicPrompt,
  topicMeta,
  levelLabel,
  levelGuide,
  recentReferences,
}: {
  apiKey: string;
  baseUrl: string;
  topicPrompt: string;
  topicMeta?: TopicMeta;
  levelLabel: string;
  levelGuide: string;
  recentReferences: string[];
}) {
  const avoidBlock =
    recentReferences.length > 0
      ? recentReferences.slice(0, MAX_TOPIC_HISTORY).map((item, index) => `${index + 1}. ${item}`).join("\n")
      : "None";

  const planning = await requestJsonCompletion<PlanningResult>({
    apiKey,
    baseUrl,
    temperature: 1.05,
    messages: [
      {
        role: "system",
        content: `You are a creative English exam reading planner.

Your job is to propose exactly ${MAX_SUBTOPIC_CANDIDATES} DISTINCT subtopics for a reading passage.

Rules:
1. All subtopics must stay under the broad theme the user selected.
2. They must be fresh, concrete, and suitable for ${levelLabel}.
3. Avoid topics that are too close to the "avoid similar to" list.
4. Each candidate must feel different in angle, not just wording.
5. Return strict JSON only.

Output JSON:
{
  "candidates": [
    {
      "subtopic": "Specific angle title",
      "focus": "What the passage should mainly explain or argue",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "why_it_is_distinct": "Why this angle differs from common passages",
      "outline": ["Paragraph goal 1", "Paragraph goal 2", "Paragraph goal 3"]
    }
  ]
}`,
      },
      {
        role: "user",
        content: `Broad topic: ${topicMeta?.label || topicPrompt}
User prompt: ${topicPrompt}
Broad tag to keep in final article tags: ${topicMeta?.broadTag || "General"}
Target level: ${levelLabel}
Level guide: ${levelGuide}

Avoid similar to:
${avoidBlock}

Generate exactly ${MAX_SUBTOPIC_CANDIDATES} candidates now.`,
      },
    ],
  });

  return Array.isArray(planning.candidates)
    ? planning.candidates.filter(validateCandidate)
    : [];
}

async function buildDraftArticle({
  apiKey,
  baseUrl,
  level,
  levelLabel,
  levelGuide,
  targetLength,
  specificTopic,
  topicMeta,
  mandatoryKeywords,
  qualityRules,
  selectedCandidate,
}: {
  apiKey: string;
  baseUrl: string;
  level: string;
  levelLabel: string;
  levelGuide: string;
  targetLength: string;
  specificTopic: string;
  topicMeta?: TopicMeta;
  mandatoryKeywords: string[];
  qualityRules: string;
  selectedCandidate: SubtopicCandidate;
}) {
  return requestJsonCompletion<ArticlePayload>({
    apiKey,
    baseUrl,
    temperature: 0.92,
    messages: [
      {
        role: "system",
        content: `You are an expert English exam passage writer.

Write a high-quality reading passage draft that fits the selected exam level.

Hard rules:
1. JSON only.
2. Keep the final article within ${targetLength} words.
3. Follow the target level exactly and avoid generic filler writing.
4. The article must be coherent, concrete, and naturally paragraph-based.
5. Return title, title_zh, content, difficulty, level, topic, tags, vocabulary, sentences.`,
      },
      {
        role: "user",
        content: `Target level: ${levelLabel} (${level})
Level guide: ${levelGuide}
Target length: ${targetLength}
Broad category: ${topicMeta?.label || specificTopic}
Broad tag: ${topicMeta?.broadTag || "General"}
Selected subtopic: ${specificTopic}
Focus: ${selectedCandidate.focus}
Distinctness note: ${selectedCandidate.why_it_is_distinct}
Outline:
${selectedCandidate.outline.map((item, index) => `${index + 1}. ${item}`).join("\n")}
Suggested keywords from planning: ${selectedCandidate.keywords.join(", ") || "None"}
Mandatory keywords: ${mandatoryKeywords.join(", ") || "None"}

Quality bar:
${qualityRules}

Return strict JSON:
{
  "title": "English Title",
  "title_zh": "Chinese Title",
  "content": "Full article with paragraph breaks",
  "difficulty": "${level}",
  "level": "${level}",
  "topic": "${specificTopic}",
  "tags": ["${topicMeta?.broadTag || "General"}", "Tag2", "Tag3"],
  "vocabulary": [],
  "sentences": []
}`,
      },
    ],
  });
}

function validateArticlePayload(article: ArticlePayload, targetLength: string) {
  const issues: string[] = [];
  const content = typeof article.content === "string" ? article.content.trim() : "";
  const title = typeof article.title === "string" ? article.title.trim() : "";
  const tags = Array.isArray(article.tags) ? article.tags.filter(Boolean) : [];
  const { min, max } = parseLengthRange(targetLength);
  const wordCount = countWords(content);

  if (!title) issues.push("missing title");
  if (!content) issues.push("missing content");
  if (wordCount < min || wordCount > max) {
    issues.push(`word count ${wordCount} outside ${targetLength}`);
  }
  if (tags.length === 0) issues.push("missing tags");

  return {
    isValid: issues.length === 0,
    issues,
    wordCount,
  } satisfies ValidationResult;
}

function getSoftWordCountMargin(targetLength: string) {
  const { min, max } = parseLengthRange(targetLength);
  const spread = Math.max(max - min, 0);
  return Math.min(60, Math.max(20, Math.round(spread * 0.18)));
}

function normalizeArticlePayload({
  article,
  level,
  specificTopic,
  broadTag,
}: {
  article: ArticlePayload;
  level: string;
  specificTopic: string;
  broadTag: string;
}) {
  const normalizedContent = typeof article.content === "string" ? article.content.trim() : "";
  const normalizedTitle =
    typeof article.title === "string" && article.title.trim().length > 0 ? article.title.trim() : specificTopic;

  return {
    ...article,
    title: normalizedTitle,
    content: normalizedContent,
    difficulty: level,
    level,
    topic: specificTopic,
    tags: enrichTags(article.tags, broadTag),
  } satisfies ArticlePayload;
}

function isSoftValidArticlePayload(article: ArticlePayload, targetLength: string) {
  const validation = validateArticlePayload(article, targetLength);
  if (validation.isValid) return true;

  const { min, max } = parseLengthRange(targetLength);
  const margin = getSoftWordCountMargin(targetLength);

  return (
    validation.issues.every((issue) => issue.startsWith("word count")) &&
    validation.wordCount >= Math.max(1, min - margin) &&
    validation.wordCount <= max + margin
  );
}

function scoreArticlePayload(article: ArticlePayload, targetLength: string) {
  const validation = validateArticlePayload(article, targetLength);
  const { min, max } = parseLengthRange(targetLength);
  const midpoint = (min + max) / 2;

  let penalty = 0;

  if (!article.title?.trim()) penalty += 2000;
  if (!article.content?.trim()) penalty += 5000;
  if (!article.tags || article.tags.length === 0) penalty += 500;

  if (validation.wordCount < min) {
    penalty += (min - validation.wordCount) * 3;
  } else if (validation.wordCount > max) {
    penalty += (validation.wordCount - max) * 3;
  } else {
    penalty += Math.abs(validation.wordCount - midpoint) * 0.2;
  }

  penalty += validation.issues.length * 100;
  return penalty;
}

function chooseBestArticlePayload(candidates: ArticlePayload[], targetLength: string) {
  const viable = candidates.filter((candidate) => candidate.content?.trim());
  if (viable.length === 0) return null;

  return [...viable].sort((left, right) => {
    return scoreArticlePayload(left, targetLength) - scoreArticlePayload(right, targetLength);
  })[0];
}

async function repairArticlePayload({
  apiKey,
  baseUrl,
  level,
  levelLabel,
  targetLength,
  qualityRules,
  specificTopic,
  broadTag,
  article,
  issues,
}: {
  apiKey: string;
  baseUrl: string;
  level: string;
  levelLabel: string;
  targetLength: string;
  qualityRules: string;
  specificTopic: string;
  broadTag: string;
  article: ArticlePayload;
  issues: string[];
}) {
  return requestJsonCompletion<ArticlePayload>({
    apiKey,
    baseUrl,
    temperature: 0.35,
    messages: [
      {
        role: "system",
        content: `You are a strict English exam passage fixer.

Repair the article JSON so it fully matches the target level and target length.
Return strict JSON only.`,
      },
      {
        role: "user",
        content: `Target level: ${levelLabel} (${level})
Target length: ${targetLength}
Broad tag: ${broadTag}
Topic: ${specificTopic}
Problems to fix: ${issues.join("; ")}

Quality bar:
${qualityRules}

Current article JSON:
${JSON.stringify(article)}

Return strict JSON with fields:
{
  "title": "English Title",
  "title_zh": "Chinese Title",
  "content": "Fixed content",
  "difficulty": "${level}",
  "level": "${level}",
  "topic": "${specificTopic}",
  "tags": ["${broadTag}", "Tag2", "Tag3"],
  "vocabulary": [],
  "sentences": []
}`,
      },
    ],
  });
}

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || "https://api.deepseek.com";

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    let { topicPrompt, topicId, level = "IELTS", userId } = body;
    level = normalizeReadingLevelId(level);
    const levelConfig = getReadingLevel(level);
    const topicMeta = topicId ? TOPIC_META[topicId] : undefined;

    if (!userId) {
      return NextResponse.json({ error: "未登录，无法生成公共文章。" }, { status: 401 });
    }

    const { checkRateLimit } = await import("@/lib/rate-limit");
    const rateLimit = await checkRateLimit(userId, "generate_ielts", 2);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.reason || "今日生成额度已用完 (每日限 2 篇)" }, { status: 429 });
    }

    const inputSafety = checkContentSafety(String(topicPrompt || ""));
    if (!inputSafety.isSafe) {
      return NextResponse.json({ error: "输入内容包含敏感信息，无法生成。" }, { status: 400 });
    }

    const recentArticles = await fetchRecentArticlesForTopic({
      supabase,
      level,
      broadTag: topicMeta?.broadTag,
    });
    const recentReferences = extractRecentReferences(recentArticles);
    const fallbackCandidate = buildFallbackCandidate(String(topicPrompt || ""), topicMeta, recentReferences);

    let candidates: SubtopicCandidate[] = [];
    try {
      candidates = await buildSubtopicPlan({
        apiKey,
        baseUrl,
        topicPrompt: String(topicPrompt || ""),
        topicMeta,
        levelLabel: levelConfig.label,
        levelGuide: levelConfig.generationGuide,
        recentReferences,
      });
    } catch (error) {
      console.error("Subtopic planning failed, using fallback:", error);
    }

    const { selected: selectedCandidate } = selectSubtopicCandidate(candidates, recentReferences, fallbackCandidate);
    const specificTopic = selectedCandidate.subtopic;

    const { data: cachedArticle } = await supabase
      .from("articles")
      .select("*")
      .eq("topic", specificTopic)
      .eq("difficulty", level)
      .eq("is_public", true)
      .limit(1)
      .single();

    if (cachedArticle) {
      return NextResponse.json(cachedArticle);
    }

    const mandatoryKeywords =
      levelConfig.mandatoryKeywordCount > 0
        ? pickMandatoryKeywords(topicId || "", levelConfig.mandatoryKeywordCount)
        : [];
    const targetLength = levelConfig.lengthRange;
    const qualityRules = formatQualityRules(levelConfig);

    const draftArticle = await buildDraftArticle({
      apiKey,
      baseUrl,
      level,
      levelLabel: levelConfig.label,
      levelGuide: levelConfig.generationGuide,
      targetLength,
      specificTopic,
      topicMeta,
      mandatoryKeywords,
      qualityRules,
      selectedCandidate,
    });

    const reviewPrompt = `You are a strict English exam passage reviewer and rewriter.

Review the draft article and return the FINAL improved version as strict JSON only.

Quality rubric:
1. The topic must feel fresh and specific, not vague.
2. Paragraph progression must be clear and logical.
3. Sentence complexity must fit the target level exactly.
4. Examples and explanations must be concrete, not template-like.
5. Title, content, topic, and tags must align.
6. Word count must stay within ${targetLength} words.

Target level: ${levelConfig.label} (${level})
Level guide: ${levelConfig.generationGuide}
Broad category: ${topicMeta?.label || topicPrompt}
Broad tag: ${topicMeta?.broadTag || "General"}
Topic: ${specificTopic}
Mandatory keywords: ${mandatoryKeywords.join(", ") || "None"}

Draft article JSON:
${JSON.stringify({
  ...draftArticle,
  difficulty: level,
  level,
  topic: specificTopic,
})}

Return strict JSON:
{
  "title": "English Title",
  "title_zh": "Chinese Title",
  "content": "Final polished article",
  "difficulty": "${level}",
  "level": "${level}",
  "topic": "${specificTopic}",
  "tags": ["${topicMeta?.broadTag || "General"}", "Tag2", "Tag3"],
  "vocabulary": [],
  "sentences": []
}`;

    const reviewResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are an expert English exam passage reviewer who returns strict JSON only.",
          },
          {
            role: "user",
            content: reviewPrompt,
          },
        ],
        temperature: 0.45,
        stream: true,
        response_format: { type: "json_object" },
      }),
    });

    if (!reviewResponse.ok) {
      throw new Error(`AI API Error: ${reviewResponse.status}`);
    }

    return streamOpenAIResponse({
      upstream: reviewResponse,
      parse: (raw) => parseJsonCompletion<ArticlePayload>(raw),
      onDone: async (aiResult) => {
        const broadTag = topicMeta?.broadTag || "General";
        const articleCandidates: ArticlePayload[] = [];
        const pushCandidate = (candidate: ArticlePayload | null | undefined) => {
          if (!candidate) return;
          articleCandidates.push(
            normalizeArticlePayload({
              article: candidate,
              level,
              specificTopic,
              broadTag,
            })
          );
        };

        pushCandidate(draftArticle);
        pushCandidate(aiResult);

        let finalized = articleCandidates[articleCandidates.length - 1];

        let validation = validateArticlePayload(finalized, targetLength);

        for (let attempt = 0; !validation.isValid && attempt < MAX_REWRITE_ATTEMPTS; attempt += 1) {
          const repaired = await repairArticlePayload({
            apiKey,
            baseUrl,
            level,
            levelLabel: levelConfig.label,
            targetLength,
            qualityRules,
            specificTopic,
            broadTag: topicMeta?.broadTag || "General",
            article: finalized,
            issues: validation.issues,
          });

          pushCandidate(repaired);
          finalized = articleCandidates[articleCandidates.length - 1];
          validation = validateArticlePayload(finalized, targetLength);
        }

        if (!validation.isValid) {
          const softAccepted = articleCandidates.find((candidate) =>
            isSoftValidArticlePayload(candidate, targetLength)
          );

          if (softAccepted) {
            finalized = softAccepted;
            validation = validateArticlePayload(finalized, targetLength);
            console.warn("Accepted softly validated article:", {
              topic: specificTopic,
              level,
              issues: validation.issues,
              wordCount: validation.wordCount,
            });
          } else {
            const bestCandidate = chooseBestArticlePayload(articleCandidates, targetLength);
            if (!bestCandidate) {
              throw new Error(`生成文章未通过质量校验: ${validation.issues.join(", ")}`);
            }

            finalized = bestCandidate;
            validation = validateArticlePayload(finalized, targetLength);
            console.warn("Falling back to best available generated article:", {
              topic: specificTopic,
              level,
              issues: validation.issues,
              wordCount: validation.wordCount,
            });
          }
        }

        const normalizedContent = typeof finalized.content === "string" ? finalized.content.trim() : "";
        const outputSafety = checkContentSafety(`${normalizedContent} ${finalized.title || ""}`);
        if (!outputSafety.isSafe) {
          throw new Error("生成内容未通过安全审查，请重试。");
        }

        const wordCount = countWords(normalizedContent);
        const tags = enrichTags(finalized.tags, broadTag);

        const finalArticleData = {
          id: crypto.randomUUID(),
          title: finalized.title,
          title_zh: finalized.title_zh,
          content: normalizedContent,
          topic: specificTopic,
          difficulty: level,
          level,
          word_count: wordCount,
          tags,
          user_id: userId,
          is_public: true,
        };

        let savedArticle = null;
        try {
          const { data: inserted, error: insertError } = await supabase
            .from("articles")
            .insert([finalArticleData])
            .select("*")
            .single();
          if (insertError) throw insertError;
          savedArticle = inserted;
        } catch (dbError) {
          console.error("Cache failed:", dbError);
        }

        const finalPayload = {
          ...finalized,
          ...finalArticleData,
          id: savedArticle?.id || finalArticleData.id,
          created_at: savedArticle?.created_at || new Date().toISOString(),
          word_count: wordCount,
          wordCount,
          tags,
        };

        if (savedArticle) {
          return { ...savedArticle, ...finalPayload };
        }

        return finalPayload;
      },
    });
  } catch (error: any) {
    console.error("Gen Error:", error);
    return NextResponse.json({ error: error.message || "Generation failed, please try again." }, { status: 500 });
  }
}
