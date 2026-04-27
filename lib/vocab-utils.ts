import { IELTS_VOCAB_DB } from "@/lib/ielts-vocabulary";
import type { VocabularyCategory, VocabularyDatabase } from "@/types";

const VOCAB_DB = IELTS_VOCAB_DB as VocabularyDatabase;

export const TOPIC_VOCAB_LABELS: Record<string, string[]> = {
  env: ["自然地理", "植物研究", "动物保护"],
  tech: ["科技发明", "太空探索"],
  edu: ["学校教育"],
  soc: ["文化历史", "物品材料"],
  cul: ["文化历史", "语言演化", "娱乐运动", "时尚潮流"],
};

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function flattenWords(category: VocabularyCategory): string[] {
  return category.words.flat().map((entry) => entry.word).filter(Boolean);
}

export function pickMandatoryKeywords(topicId: string | undefined, count = 10): string[] {
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
}

export function countWords(input: string): number {
  const normalized = input.trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/).length;
}
