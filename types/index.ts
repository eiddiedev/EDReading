export interface StructureNote {
  sentence_index: number;
  analysis: string;
}

export interface AIVocabulary {
  word: string;
  translation: string; // Legacy: acts as definition
  definition?: string; // Preferred: Simplified Chinese definition
  phonetic?: string;
  tags?: string[];
  context_meaning?: string;
  example?: string;
  exampleTranslation?: string; // Chinese translation of the example
}

export interface AISentence {
  original: string;
  translation: string;
  structure: string;
}

export interface Article {
  id: string;
  title: string;
  title_zh?: string; // Chinese translation of the title
  original_title?: string; // Legacy: Original English title if title was localized
  content: string;
  difficulty: string; // Changed from literal union to string to support "Band X.X"
  wordCount: number;
  createdAt: string;
  phrases?: string[]; // AI-detected phrases
  structure_notes?: StructureNote[]; // AI-detected sentence structure notes (Legacy)
  aiVocabulary?: AIVocabulary[];
  aiSentences?: AISentence[];
  questions?: {
    question: string;
    options: string[];
    answer: string;
  }[];
  topic?: string;
  tags?: string[]; // Added tags support
  coverImage?: string; // Cover image URL
  isRead?: boolean; // Track reading progress
}

export interface VocabularyWord {
  id: string;
  word: string;
  phonetic?: string;
  definition: string;
  example?: string;
  exampleTranslation?: string;
  createdAt: string;
  reviewCount?: number; // Defaults to 0
  correctCount?: number; // Defaults to 0
  lastReviewed?: string; // ISO Date
}

export interface DictionaryResult {
  word: string;
  phonetic?: string;
  definition: string;
  example?: string;
  exampleTranslation?: string;
  tags?: string[];
  isAiGenerated?: boolean; // Badge for AI results
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
  icon?: string; // Emoji or Favicon URL
  openMode: 'iframe' | 'new_tab'; // User chooses how to open it
}
