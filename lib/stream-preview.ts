import { DictionaryResult } from "@/types";

function closeJsonPrefix(input: string) {
  let output = "";
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    output += char;

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char === "}" || char === "]") {
      const last = stack[stack.length - 1];
      if ((char === "}" && last === "{") || (char === "]" && last === "[")) {
        stack.pop();
      }
    }
  }

  if (escaped) {
    output = output.slice(0, -1);
  }

  if (inString) {
    output += '"';
  }

  const trailingKeyOrValue = /([{\[,]\s*"[^"]*"?\s*:?|\s*:)\s*$/.test(output);
  if (trailingKeyOrValue) {
    return null;
  }

  for (let i = stack.length - 1; i >= 0; i -= 1) {
    output += stack[i] === "{" ? "}" : "]";
  }

  return output.replace(/,\s*([}\]])/g, "$1");
}

export function parsePartialJson<T = any>(input: string): T | null {
  const normalized = input.replace(/```json/g, "").replace(/```/g, "").trim();
  if (!normalized) return null;

  const maxTrim = Math.min(120, normalized.length);
  for (let trim = 0; trim <= maxTrim; trim += 1) {
    const candidateBase = normalized.slice(0, normalized.length - trim).trim();
    if (!candidateBase) continue;

    const candidate = closeJsonPrefix(candidateBase);
    if (!candidate) continue;

    try {
      return JSON.parse(candidate) as T;
    } catch {
      // keep trying with a shorter prefix
    }
  }

  return null;
}

export interface SentenceAnalysisPreview {
  translation?: string;
  grammarExplanation?: string;
  structure?: {
    subject?: string;
    verb?: string;
    object?: string;
  };
  vocabulary?: string[];
  importantPhrases?: {
    phrase?: string;
    localExpression?: string;
    explanation?: string;
  }[];
}

export interface ArticlePreview {
  title?: string;
  title_zh?: string;
  content?: string;
  summary?: string;
  level?: string;
  difficulty?: string;
  tags?: string[];
}

export interface CardPreview {
  sentence?: string;
  translation?: string;
}

export interface ImportWordsPreviewItem {
  text?: string;
  word?: string;
  definition?: string;
  phonetic?: string;
  translation?: string;
  tags?: string[];
}

export function getSentenceAnalysisPreview(input: string): SentenceAnalysisPreview | null {
  const parsed = parsePartialJson<any>(input);
  if (!parsed || typeof parsed !== "object") return null;

  return {
    translation: typeof parsed.translation === "string" ? parsed.translation : undefined,
    grammarExplanation:
      typeof parsed.grammarExplanation === "string"
        ? parsed.grammarExplanation
        : undefined,
    structure:
      parsed.structure && typeof parsed.structure === "object"
        ? {
            subject:
              typeof parsed.structure.subject === "string"
                ? parsed.structure.subject
                : undefined,
            verb:
              typeof parsed.structure.verb === "string"
                ? parsed.structure.verb
                : undefined,
            object:
              typeof parsed.structure.object === "string"
                ? parsed.structure.object
                : undefined,
          }
        : undefined,
    vocabulary: Array.isArray(parsed.vocabulary)
      ? parsed.vocabulary.filter((item: unknown): item is string => typeof item === "string")
      : undefined,
    importantPhrases: Array.isArray(parsed.importantPhrases)
      ? parsed.importantPhrases
          .filter((item: unknown): item is Record<string, unknown> => !!item && typeof item === "object")
          .map((item: Record<string, unknown>) => ({
            phrase: typeof item.phrase === "string" ? item.phrase : undefined,
            localExpression:
              typeof item.localExpression === "string"
                ? item.localExpression
                : undefined,
            explanation:
              typeof item.explanation === "string"
                ? item.explanation
                : undefined,
          }))
      : undefined,
  };
}

export function getDictionaryPreview(input: string, fallbackWord?: string): Partial<DictionaryResult> | null {
  const parsed = parsePartialJson<any>(input);
  if (!parsed || typeof parsed !== "object") return null;

  const examples = Array.isArray(parsed.examples)
    ? parsed.examples.filter(
        (item: unknown): item is { sentence?: string; translation?: string } =>
          !!item && typeof item === "object"
      )
    : undefined;

  return {
    word:
      typeof parsed.word === "string"
        ? parsed.word
        : fallbackWord,
    phonetic: typeof parsed.phonetic === "string" ? parsed.phonetic : undefined,
    definition:
      typeof parsed.definition === "string"
        ? parsed.definition
        : typeof parsed.translation === "string"
          ? parsed.translation
          : undefined,
    cnDefinition:
      typeof parsed.cnDefinition === "string"
        ? parsed.cnDefinition
        : typeof parsed.translation === "string"
          ? parsed.translation
          : typeof parsed.definition === "string"
            ? parsed.definition
            : undefined,
    example: typeof parsed.example === "string" ? parsed.example : examples?.[0]?.sentence,
    exampleTranslation:
      typeof parsed.exampleTranslation === "string"
        ? parsed.exampleTranslation
        : examples?.[0]?.translation,
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.filter((item: unknown): item is string => typeof item === "string")
      : typeof parsed.tag === "string"
        ? parsed.tag.split(/\s+/).filter(Boolean)
        : undefined,
    examples,
    usage: typeof parsed.usage === "string" ? parsed.usage : undefined,
  };
}

export function getArticlePreview(input: string): ArticlePreview | null {
  const parsed = parsePartialJson<any>(input);
  if (!parsed || typeof parsed !== "object") return null;

  return {
    title: typeof parsed.title === "string" ? parsed.title : undefined,
    title_zh: typeof parsed.title_zh === "string" ? parsed.title_zh : undefined,
    content: typeof parsed.content === "string" ? parsed.content : undefined,
    summary: typeof parsed.summary === "string" ? parsed.summary : undefined,
    level: typeof parsed.level === "string" ? parsed.level : undefined,
    difficulty: typeof parsed.difficulty === "string" ? parsed.difficulty : undefined,
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.filter((item: unknown): item is string => typeof item === "string")
      : undefined,
  };
}

export function getCardPreview(input: string): CardPreview | null {
  const parsed = parsePartialJson<any>(input);
  if (!parsed || typeof parsed !== "object") return null;

  return {
    sentence: typeof parsed.sentence === "string" ? parsed.sentence : undefined,
    translation: typeof parsed.translation === "string" ? parsed.translation : undefined,
  };
}

export function getImportWordsPreview(input: string): ImportWordsPreviewItem[] {
  const parsed = parsePartialJson<any>(input);
  if (!parsed) return [];

  if (Array.isArray(parsed)) {
    return parsed.filter((item: unknown): item is ImportWordsPreviewItem => !!item && typeof item === "object");
  }

  if (Array.isArray(parsed.words)) {
    return parsed.words.filter((item: unknown): item is ImportWordsPreviewItem => !!item && typeof item === "object");
  }

  const values = Object.values(parsed);
  const firstArray = values.find((value) => Array.isArray(value));
  if (Array.isArray(firstArray)) {
    return firstArray.filter((item: unknown): item is ImportWordsPreviewItem => !!item && typeof item === "object");
  }

  return [];
}
