export interface ReadingLevelConfig {
  id: string;
  label: string;
  shortLabel: string;
  selectLabel: string;
  desc: string;
  generationGuide: string;
  importGuide: string;
  lengthRange: string;
  mandatoryKeywordCount: number;
  qualityRules: string[];
  aliases: string[];
}

export const DEFAULT_READING_LEVEL_ID = "IELTS";

export const READING_LEVELS: ReadingLevelConfig[] = [
  {
    id: "zk",
    label: "中考英语",
    shortLabel: "中考",
    selectLabel: "中考英语",
    desc: "A2-B1",
    generationGuide:
      "Level: Chinese Senior High School Entrance Exam English. Sentence length: mostly 8-16 words, with a few simple attributive/adverbial clauses. Vocabulary: junior-high core words and common phrases. Style: clear, natural, age-appropriate, and exam-like.",
    importGuide:
      "Junior-high exam tone. Keep language clear and age-appropriate. Prefer familiar school, life, culture, science, and social topics. Avoid dense academic jargon and IELTS-style abstraction.",
    lengthRange: "250-350",
    mandatoryKeywordCount: 0,
    qualityRules: [
      "Fit Chinese Zhongkao reading passages: practical, concrete, and suitable for junior-high learners.",
      "Use coherent paragraphs with one clear main idea each; include enough detail for inference questions.",
      "Avoid childish storytelling, slang, heavy academic wording, and college-level grammar density.",
      "Keep vocabulary mostly within junior-high exam scope; introduce at most a few supported new words."
    ],
    aliases: ["ZK", "zk", "zhongkao", "中考"]
  },
  {
    id: "gk",
    label: "高考英语",
    shortLabel: "高考",
    selectLabel: "高考英语",
    desc: "B1+-B2",
    generationGuide:
      "Level: Chinese National College Entrance Exam English. Sentence length: 14-24 words with controlled complex sentences. Vocabulary: high-school core vocabulary plus moderate academic words. Style: authentic magazine/exam passage, logical, informative, and readable.",
    importGuide:
      "Gaokao exam tone. Preserve authentic informational style with clear logic, moderate complexity, and high-school appropriate vocabulary. Avoid IELTS/TOEFL-level jargon overload.",
    lengthRange: "320-450",
    mandatoryKeywordCount: 0,
    qualityRules: [
      "Fit Chinese Gaokao reading passages: authentic, informative, and moderately challenging.",
      "Use varied sentence patterns, including attributive clauses, non-finite phrases, and logical connectors, without becoming IELTS-dense.",
      "Maintain strong cohesion and factual clarity so the article can support detail, inference, and main-idea questions.",
      "Use high-school vocabulary and collocations; avoid obscure specialist terms unless the context explains them."
    ],
    aliases: ["GK", "gk", "gaokao", "高考"]
  },
  {
    id: "CET-4",
    label: "大学四级",
    shortLabel: "四级",
    selectLabel: "大学四级 (CET-4)",
    desc: "CET-4",
    generationGuide:
      "Level: University English Band 4 (China). Sentence length: 15-20 words. Vocabulary: common 4000 words. Style: formal but accessible, structured, and exam-oriented.",
    importGuide:
      "CET-4 exam tone. Sentence length 15-20 words. Vocabulary should stay around common 4000-word college English range with clear paragraph logic.",
    lengthRange: "300-500",
    mandatoryKeywordCount: 6,
    qualityRules: [
      "Use formal but accessible college-English prose with clear cause-effect or comparison logic.",
      "Keep vocabulary close to CET-4 scope and avoid unexplained specialist terminology.",
      "Use paragraphs that can support common CET-4 reading tasks such as detail, inference, and vocabulary-in-context."
    ],
    aliases: ["cet4", "CET4", "cet-4", "CET-4", "四级"]
  },
  {
    id: "CET-6",
    label: "大学六级",
    shortLabel: "六级",
    selectLabel: "大学六级 (CET-6)",
    desc: "CET-6",
    generationGuide:
      "Level: University English Band 6 (China). Style: formal, argumentative, nuanced, and information-dense, with moderate academic vocabulary.",
    importGuide:
      "CET-6 exam tone. Use tighter logic, nuanced claims, and moderate academic vocabulary while keeping the passage readable.",
    lengthRange: "350-550",
    mandatoryKeywordCount: 8,
    qualityRules: [
      "Use a formal and nuanced college-English style with clear argumentative or explanatory structure.",
      "Allow moderate academic vocabulary, but keep meanings recoverable from context.",
      "Use cohesive devices and sentence variety suitable for CET-6 reading."
    ],
    aliases: ["cet6", "CET6", "cet-6", "CET-6", "六级"]
  },
  {
    id: "PG-Entrance",
    label: "考研英语",
    shortLabel: "考研",
    selectLabel: "考研英语",
    desc: "Postgrad",
    generationGuide:
      "Level: Chinese Postgraduate Entrance Exam English. Focus: high-density logic, long complex sentences, precise argumentation, and abstract academic prose.",
    importGuide:
      "Postgraduate entrance exam tone. Emphasize dense logic, long complex sentences, precise wording, and abstract academic argumentation.",
    lengthRange: "700-1000",
    mandatoryKeywordCount: 10,
    qualityRules: [
      "Use dense logical progression and precise abstract wording.",
      "Include long complex sentences where they genuinely serve the argument.",
      "Avoid loose narrative structure; the passage should feel like a serious exam reading text."
    ],
    aliases: ["PG", "PG-Entrance", "postgrad", "kaoyan", "ky", "考研"]
  },
  {
    id: "IELTS",
    label: "雅思学术",
    shortLabel: "雅思",
    selectLabel: "雅思 (IELTS)",
    desc: "Band 7+",
    generationGuide:
      "Level: IELTS Academic Band 7+. Sentence length: varied, with short and long sentences. Use heavy paraphrasing. Style: academic, objective, and evidence-led.",
    importGuide:
      "IELTS Academic tone. Use varied sentence lengths, heavy paraphrasing, and objective academic phrasing.",
    lengthRange: "700-1000",
    mandatoryKeywordCount: 10,
    qualityRules: [
      "Use an objective academic tone and strong paraphrasing.",
      "Build clear topic progression across paragraphs with evidence-led explanation.",
      "Use complex grammar naturally, without sacrificing readability."
    ],
    aliases: ["ielts", "IELTS", "雅思"]
  },
  {
    id: "TOEFL",
    label: "托福阅读",
    shortLabel: "托福",
    selectLabel: "托福 (TOEFL)",
    desc: "Academic",
    generationGuide:
      "Level: TOEFL iBT Reading. Context: academic lecture or textbook-style explanation. Increase discipline-specific terminology density while keeping definitions recoverable from context.",
    importGuide:
      "TOEFL academic tone. Use textbook-like explanation, discipline-specific vocabulary, and clear conceptual development.",
    lengthRange: "700-1000",
    mandatoryKeywordCount: 10,
    qualityRules: [
      "Use academic textbook or lecture-style development.",
      "Include discipline-specific terminology with enough context for comprehension.",
      "Keep paragraph transitions explicit and conceptually organized."
    ],
    aliases: ["toefl", "TOEFL", "托福"]
  }
];

export const READING_LEVEL_BY_ID = READING_LEVELS.reduce<Record<string, ReadingLevelConfig>>(
  (acc, level) => {
    acc[level.id] = level;
    return acc;
  },
  {}
);

const READING_LEVEL_ALIAS_MAP = READING_LEVELS.reduce<Record<string, string>>((acc, level) => {
  acc[level.id] = level.id;
  acc[level.id.toLowerCase()] = level.id;
  level.aliases.forEach((alias) => {
    acc[alias] = level.id;
    acc[alias.toLowerCase()] = level.id;
    acc[alias.toLowerCase().replace(/[\s_-]+/g, "")] = level.id;
  });
  return acc;
}, {});

export const findReadingLevel = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const raw = value.trim();
  if (!raw) return undefined;

  const direct = READING_LEVEL_BY_ID[raw];
  if (direct) return direct;

  const normalized = raw.toLowerCase().replace(/[\s_-]+/g, "");
  const matchedId = READING_LEVEL_ALIAS_MAP[raw] || READING_LEVEL_ALIAS_MAP[raw.toLowerCase()] || READING_LEVEL_ALIAS_MAP[normalized];
  return matchedId ? READING_LEVEL_BY_ID[matchedId] : undefined;
};

export const normalizeReadingLevelId = (value: unknown) =>
  findReadingLevel(value)?.id || DEFAULT_READING_LEVEL_ID;

export const getReadingLevel = (value: unknown) =>
  findReadingLevel(value) || READING_LEVEL_BY_ID[DEFAULT_READING_LEVEL_ID];

export const formatQualityRules = (level: ReadingLevelConfig) =>
  level.qualityRules.map((rule, index) => `${index + 1}. ${rule}`).join("\n");

export const getReadingLevelMatchValues = (value: unknown) => {
  const level = findReadingLevel(value);
  if (!level) return typeof value === "string" ? [value] : [];
  return Array.from(new Set([level.id, level.label, level.shortLabel, level.selectLabel, ...level.aliases]));
};
