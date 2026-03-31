const YOUDAO_AUDIO_BASE = "https://dict.youdao.com/dictvoice";

export function normalizePronunciationAudioUrl(audio?: string | null) {
  const trimmed = audio?.trim();

  if (!trimmed) return null;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  return trimmed;
}

export function buildPronunciationAudioUrl(word?: string | null) {
  const normalizedWord = word?.trim().toLowerCase();

  if (!normalizedWord) return null;

  return `${YOUDAO_AUDIO_BASE}?audio=${encodeURIComponent(normalizedWord)}&type=2`;
}

export function resolvePronunciationAudioUrl(word?: string | null, audio?: string | null) {
  return normalizePronunciationAudioUrl(audio) || buildPronunciationAudioUrl(word);
}
