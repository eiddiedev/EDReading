/**
 * 词汇引擎 (Vocab Engine)
 * 作用：处理单词高亮匹配和分级逻辑。
 * 重构：改为基于服务端数据的动态高亮，移除静态 JSON 依赖。
 */

export interface WordMetadata {
  word: string;
  collins: number | null;
  tag: string | null;
  base_word?: string | null;
}

export type HighlightLevel = 0 | 1 | 2 | 3 | 4;

export interface HighlightResult {
  word: string;
  level: HighlightLevel;
}

const TARGET_ALIASES: Record<string, string[]> = {
  ielts: ["ielts", "雅思"],
  toefl: ["toefl", "托福"],
  cet4: ["cet4", "cet-4", "cet 4", "四级"],
  cet6: ["cet6", "cet-6", "cet 6", "六级"],
  gk: ["gk", "gaokao", "高考"],
  zk: ["zk", "zhongkao", "中考"],
  ky: ["ky", "kaoyan", "考研"],
};

const CONTRACTION_MAP: Record<string, string> = {
  "don't": "do",
  "doesn't": "does",
  "didn't": "did",
  "can't": "can",
  "won't": "will",
  "isn't": "is",
  "aren't": "are",
  "wasn't": "was",
  "weren't": "were",
  "hasn't": "has",
  "haven't": "have",
  "hadn't": "had",
  "shouldn't": "should",
  "wouldn't": "would",
  "couldn't": "could",
  "mustn't": "must",
  "i'm": "i",
  "you're": "you",
  "we're": "we",
  "they're": "they",
  "it's": "it",
  "that's": "that",
  "there's": "there",
  "here's": "here",
  "who's": "who",
  "what's": "what",
  "where's": "where",
  "when's": "when",
  "why's": "why",
  "how's": "how",
  "let's": "let",
  "i've": "i",
  "you've": "you",
  "we've": "we",
  "they've": "they",
  "i'll": "i",
  "you'll": "you",
  "we'll": "we",
  "they'll": "they",
  "i'd": "i",
  "you'd": "you",
  "we'd": "we",
  "they'd": "they",
  "he's": "he",
  "she's": "she",
};

const IRREGULAR_MAP: Record<string, string> = {
  went: "go",
  gone: "go",
  saw: "see",
  seen: "see",
  did: "do",
  done: "do",
  was: "be",
  were: "be",
  been: "be",
  had: "have",
  has: "have",
  got: "get",
  gotten: "get",
  took: "take",
  taken: "take",
  made: "make",
  gave: "give",
  given: "give",
  wrote: "write",
  written: "write",
  bought: "buy",
  brought: "bring",
  thought: "think",
  taught: "teach",
  caught: "catch",
  left: "leave",
  felt: "feel",
  found: "find",
  kept: "keep",
  slept: "sleep",
  spoke: "speak",
  spoken: "speak",
  chose: "choose",
  chosen: "choose",
  ran: "run",
  eaten: "eat",
  drank: "drink",
  driven: "drive",
  drove: "drive",
  rose: "rise",
  risen: "rise",
};

const STOPWORDS = new Set([
  "a","an","the","and","or","but","if","as","at","by","for","from","in","into","on","onto","of","to","up","down","over","under","about","after","before","between","during","through","without","within","while","because","so","that","this","these","those","it","its","is","am","are","was","were","be","been","being","do","does","did","done","have","has","had","having","will","would","can","could","shall","should","may","might","must","i","you","he","she","we","they","me","him","her","us","them","my","your","his","their","our","mine","yours","hers","theirs","ours","there","here","then","than","also","not","no","yes","what","who","whom","which","when","where","why","how","all","any","each","few","more","most","other","some","such","only","own","same","too","very","just","ever","even","still","yet","already","again","once","i'm","you're","we're","they're","it's","that's","there's","here's","who's","what's","where's","when's","why's","how's","i've","you've","we've","they've","i'll","you'll","we'll","they'll","i'd","you'd","we'd","they'd","don't","doesn't","didn't","can't","won't","isn't","aren't","wasn't","weren't","hasn't","haven't","hadn't","shouldn't","wouldn't","couldn't","mustn't"
]);

const normalizeTagToken = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "");

const splitTags = (raw: string | null) => {
  if (!raw) return [];
  return raw
    .split(/[\s,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const buildAliasSet = (level: string) => {
  const normalizedLevel = normalizeTagToken(level);
  const rawAliases = TARGET_ALIASES[level.toLowerCase()] || [level];
  const aliasSet = new Set(
    rawAliases.map((alias) => normalizeTagToken(alias)).filter(Boolean)
  );
  if (normalizedLevel) aliasSet.add(normalizedLevel);
  return aliasSet;
};

export const normalizeWordInput = (value: string) => {
  if (!value) return "";
  const normalized = value
    .replace(/[’]/g, "'")
    .toLowerCase()
    .trim();
  return normalized.replace(/^[^a-z']+|[^a-z']+$/g, "");
};

const expandContraction = (word: string) => {
  if (!word) return "";
  if (CONTRACTION_MAP[word]) return CONTRACTION_MAP[word];
  if (word.endsWith("n't") && word.length > 3) return word.slice(0, -3);
  const match = word.match(/^([a-z]+)('ll|'re|'ve|'d|'m|'s)$/);
  if (match) return match[1];
  return "";
};

const deriveLemmaCandidates = (word: string) => {
  if (!word) return [];
  const candidates = new Set<string>();
  if (IRREGULAR_MAP[word]) candidates.add(IRREGULAR_MAP[word]);

  if (word.endsWith("ies") && word.length > 4) {
    candidates.add(`${word.slice(0, -3)}y`);
  }
  if (word.endsWith("es") && word.length > 3) {
    candidates.add(word.slice(0, -2));
  }
  if (word.endsWith("s") && word.length > 3) {
    candidates.add(word.slice(0, -1));
  }
  if (word.endsWith("ing") && word.length > 5) {
    const base = word.slice(0, -3);
    candidates.add(base);
    if (base.endsWith(base.slice(-1).repeat(2))) {
      candidates.add(base.slice(0, -1));
    }
    if (base.endsWith("i")) {
      candidates.add(`${base.slice(0, -1)}y`);
    }
    candidates.add(`${base}e`);
  }
  if (word.endsWith("ed") && word.length > 4) {
    const base = word.slice(0, -2);
    candidates.add(base);
    if (base.endsWith(base.slice(-1).repeat(2))) {
      candidates.add(base.slice(0, -1));
    }
    if (base.endsWith("i")) {
      candidates.add(`${base.slice(0, -1)}y`);
    }
    candidates.add(`${base}e`);
  }

  return Array.from(candidates).filter(Boolean);
};

export const buildLookupCandidates = (rawWord: string) => {
  const normalized = normalizeWordInput(rawWord);
  if (!normalized) return [];
  const candidates: string[] = [];
  const add = (value: string) => {
    if (value && !candidates.includes(value)) candidates.push(value);
  };
  add(normalized);
  add(expandContraction(normalized));
  deriveLemmaCandidates(normalized).forEach(add);
  return candidates;
};

export function calculateWordLevel(
  meta: WordMetadata, 
  targetLevel: string = 'ielts'
): HighlightLevel {
  const originalWord = normalizeWordInput(meta.word || "");
  const baseWord = normalizeWordInput(meta.base_word || meta.word || "");
  if (!originalWord || originalWord.length <= 2) return 0;
  if (STOPWORDS.has(originalWord) || (baseWord && STOPWORDS.has(baseWord))) return 0;

  const collins = meta.collins ?? 3;
  const resolvedLevel = targetLevel?.trim() ? targetLevel : "ielts";
  const aliasSet = buildAliasSet(resolvedLevel);
  const tagTokens = splitTags(meta.tag).map((tag) => normalizeTagToken(tag));
  const isTarget = tagTokens.some((tag) => aliasSet.has(tag));

  if (collins >= 3) return 0;

  let level: HighlightLevel = 0;
  if (isTarget) {
    if (collins <= 1) level = 4;
    else level = 2;
  } else {
    level = 1;
  }

  if (baseWord && baseWord !== originalWord && level > 0) {
    level = (level - 1) as HighlightLevel;
  }

  if (level === 4 && (originalWord.endsWith("s") || originalWord.endsWith("ed"))) {
    level = 3;
  }

  if (level === 1) return 0;

  return level;
}

export function extractWords(text: string): string[] {
  const words = new Set<string>();
  const regex = /\b[a-zA-Z]{2,}\b/g; 
  let match;
  while ((match = regex.exec(text)) !== null) {
    words.add(match[0].toLowerCase());
  }
  return Array.from(words);
}
