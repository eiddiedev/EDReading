export interface StructureNote {
  sentence_index: number;
  analysis: string;
}

export interface AIVocabulary {
  word: string;
  translation: string;
  definition?: string;
  phonetic?: string;
  tags?: string[];
  context_meaning?: string;
  example?: string;
  exampleTranslation?: string;
}

export interface AISentence {
  original: string;
  translation: string;
  structure: string;
}

export interface VocabularyEntry {
  id: number;
  word: string;
  pos: string;
  meaning: string;
  example: string;
  extra?: string;
}

export interface VocabularyCategory {
  label: string;
  audio?: string;
  words: VocabularyEntry[][];
}

export type VocabularyDatabase = Record<string, VocabularyCategory>;

export interface Article {
  id: string;
  title: string;
  title_zh?: string;
  original_title?: string;
  content: string;
  difficulty: string;
  wordCount: number;
  createdAt: string;
  phrases?: string[];
  structure_notes?: StructureNote[];
  aiVocabulary?: AIVocabulary[];
  aiSentences?: AISentence[];
  questions?: {
    question: string;
    options: string[];
    answer: string;
  }[];
  topic?: string;
  tags?: string[]; // 已添加标签支持
  coverImage?: string; // 封面图片 URL
  isRead?: boolean; // 追踪阅读进度
  level?: string; // 已添加等级支持 (中考, 高考, CET4, CET6, IELTS, TOEFL)
  is_public?: boolean; // 已添加公开分享支持
  userId?: string; // 本地缓存中可能保留 camelCase 所有者字段
  user_id?: string; // Supabase 记录和旧缓存中的 snake_case 所有者字段
  is_local_only?: boolean;
  isGenerating?: boolean;
}

export interface VocabularyWord {
  id: string;
  word: string;
  phonetic?: string;
  audio?: string;
  definition: string;
  example?: string;
  exampleTranslation?: string;
  createdAt: string;
  reviewCount?: number;
  correctCount?: number;
  lastReviewed?: string;
  tags?: string[];
  nextReviewAt?: string;
  reviewStage?: number;
  masteryLevel?: number;
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: {
    definition: string;
    example?: string;
  }[];
}

export interface DictionaryResult {
  word: string;
  phonetic?: string;
  audio?: string;
  cnDefinition?: string;
  meanings?: DictionaryMeaning[];
  examples?: {
    sentence: string;
    translation?: string;
  }[];
  definition: string;
  usage?: string;
  example?: string;
  exampleTranslation?: string;
  tags?: string[];
  isAiGenerated?: boolean;
}

export interface SentenceAnalysis {
  sentence: string;
  structure: {
    subject: string;
    verb: string;
    object: string;
  };
  translation: string;
  vocabulary: string[];
  grammarExplanation: string;
}

export interface PortalLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  icon?: string;
  openMode: "iframe" | "new_tab";
}
