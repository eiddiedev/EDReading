import { IELTS_VOCAB_DB } from "@/lib/ielts-vocabulary";
import type { VocabularyDatabase, VocabularyEntry } from "@/types";

export interface StaticVocabEntry {
  word: string;
  meaning: string;
  pos: string;
  example: string;
  label: string;
  difficulty: string;
}

export interface StaticVocabMatch {
  start: number;
  end: number;
  word: string;
  normalized: string;
  entry: StaticVocabEntry;
}

const WORD_REGEX = /\b[a-zA-Z][a-zA-Z-]*\b/g;

const normalizeWord = (word: string) => word.trim().toLowerCase();

const getDifficultyTier = (groupIndex: number, totalGroups: number) => {
  if (totalGroups <= 1) return "easy";
  const ratio = groupIndex / (totalGroups - 1);
  if (ratio <= 0.25) return "easy";
  if (ratio <= 0.5) return "medium";
  if (ratio <= 0.75) return "hard";
  return "expert";
};

const buildIndex = (db: VocabularyDatabase) => {
  const index = new Map<string, StaticVocabEntry>();
  Object.values(db).forEach((category) => {
    const totalGroups = category.words.length;
    category.words.forEach((group, groupIndex) => {
      const difficulty = getDifficultyTier(groupIndex, totalGroups);
      group.forEach((entry: VocabularyEntry) => {
        const key = normalizeWord(entry.word);
        if (!key) return;
        if (!index.has(key)) {
          index.set(key, {
            word: entry.word,
            meaning: entry.meaning,
            pos: entry.pos,
            example: entry.example,
            label: category.label,
            difficulty,
          });
        }
      });
    });
  });
  return index;
};

const STATIC_VOCAB_INDEX = buildIndex(IELTS_VOCAB_DB);

const resolveVariant = (word: string) => {
  const candidates: string[] = [];
  if (word.endsWith("ies") && word.length > 3) {
    candidates.push(`${word.slice(0, -3)}y`);
  }
  if (word.endsWith("es") && word.length > 2) {
    candidates.push(word.slice(0, -2));
  }
  if (word.endsWith("s") && word.length > 1) {
    candidates.push(word.slice(0, -1));
  }
  if (word.endsWith("ed") && word.length > 2) {
    candidates.push(word.slice(0, -2));
  }
  if (word.endsWith("ing") && word.length > 3) {
    candidates.push(word.slice(0, -3));
    if (word.endsWith("ying") && word.length > 4) {
      candidates.push(`${word.slice(0, -4)}ie`);
    }
  }
  if (word.endsWith("er") && word.length > 2) {
    candidates.push(word.slice(0, -2));
  }
  if (word.endsWith("est") && word.length > 3) {
    candidates.push(word.slice(0, -3));
  }
  return candidates;
};

export const highlightStaticVocab = (text: string): StaticVocabMatch[] => {
  if (!text) return [];
  const matches: StaticVocabMatch[] = [];
  const seen = new Set<string>();
  const regex = new RegExp(WORD_REGEX);
  let match: RegExpExecArray | null = regex.exec(text);

  while (match) {
    const word = match[0];
    const start = match.index ?? 0;
    const end = start + word.length;
    const normalized = normalizeWord(word);
    let entry = STATIC_VOCAB_INDEX.get(normalized);
    let resolvedKey = normalized;

    if (!entry) {
      for (const candidate of resolveVariant(normalized)) {
        const found = STATIC_VOCAB_INDEX.get(candidate);
        if (found) {
          entry = found;
          resolvedKey = candidate;
          break;
        }
      }
    }

    if (entry) {
      const key = `${start}-${end}`;
      if (!seen.has(key)) {
        matches.push({ start, end, word, normalized: resolvedKey, entry });
        seen.add(key);
      }
    }
    match = regex.exec(text);
  }

  return matches;
};
