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
  tags?: string[];
  coverImage?: string;
  isRead?: boolean;
  level?: string;
  is_public?: boolean;
  userId?: string;
  user_id?: string;
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

export interface FeaturedCameraPreset {
  initialPosition: [number, number, number];
  target: [number, number, number];
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  minAzimuthAngle: number;
  maxAzimuthAngle: number;
}

export interface FeaturedDemoConfig {
  id: string;
  slug: string;
  title: string;
  titleZh?: string;
  summary: string;
  topic: string;
  difficulty: string;
  estimatedMinutes: number;
  body: string;
  keyPoints: string[];
  vocabularyFocus: string[];
  questions: string[];
  modelSrc: string;
  theme: {
    accent: string;
    glow: string;
    surface: string;
  };
  cameraPreset: FeaturedCameraPreset;
}

export interface RowSpan {
  y: number;
  leftStart: number;
  leftWidth: number;
  rightStart: number;
  rightWidth: number;
  isSplitRow: boolean;
}

export interface ContourFrame {
  rowSpans: RowSpan[];
  sampleScale: number;
  hasSilhouette: boolean;
  hash: number;
}

export interface WrappedRowSegment {
  text: string;
  x: number;
  y: number;
  width: number;
  rowIndex: number;
  segment: "left" | "right" | "full";
}
