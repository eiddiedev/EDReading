
/**
 * 代表特定句子的结构分析笔记。
 * 通常用于标记句子中的语法重点。
 */
export interface StructureNote {
  sentence_index: number;
  analysis: string;
}

/**
 * 代表由 AI 分析生成的词汇。
 * 包含翻译、释义、音标和用法上下文。
 */
export interface AIVocabulary {
  word: string;
  translation: string; // 旧版字段：作为定义使用
  definition?: string; // 首选：简体中文释义
  phonetic?: string;
  tags?: string[];
  context_meaning?: string;
  example?: string;
  exampleTranslation?: string; // 例句的中文翻译
}

/**
 * 代表经 AI 分析的句子。
 * 包含原文、翻译和语法结构分解。
 */
export interface AISentence {
  original: string;
  translation: string;
  structure: string;
}

/**
 * 代表字典中的标准词汇条目。
 */
export interface VocabularyEntry {
  id: number;
  word: string;
  pos: string; // 词性 (例如：名词, 动词)
  meaning: string;
  example: string;
  extra?: string;
}

/**
 * 代表一类词汇（例如：“食物”，“旅行”）。
 */
export interface VocabularyCategory {
  label: string;
  audio?: string;
  words: VocabularyEntry[][];
}

/**
 * 将分类名称映射到其内容的字典。
 */
export type VocabularyDatabase = Record<string, VocabularyCategory>;

/**
 * 核心文章实体。
 * 代表一篇带有元数据和 AI 生成分析的阅读文章。
 */
export interface Article {
  id: string;
  title: string;
  title_zh?: string; // 标题的中文翻译
  original_title?: string; // 旧版字段：如果标题被本地化，则保留原始英文标题
  content: string;
  difficulty: string; // "Band X.X" 或 CEFR 等级
  wordCount: number;
  createdAt: string;
  phrases?: string[]; // AI 检测到的短语
  structure_notes?: StructureNote[]; // AI 检测到的句子结构笔记（旧版）
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
  level?: string; // 已添加等级支持 (CET4, CET6, IELTS, TOEFL)
  is_public?: boolean; // 已添加公开分享支持
  is_local_only?: boolean;
  isGenerating?: boolean;
}

/**
 * 代表用户个人的复习词汇（SRS）。
 */
export interface VocabularyWord {
  id: string;
  word: string;
  phonetic?: string;
  definition: string;
  example?: string;
  exampleTranslation?: string;
  createdAt: string;
  reviewCount?: number; // 默认为 0
  correctCount?: number; // 默认为 0
  lastReviewed?: string; // ISO 日期
  tags?: string[];
  // SRS (间隔重复系统) 字段
  nextReviewAt?: string;
  reviewStage?: number;
  masteryLevel?: number;
}

/**
 * 代表字典查询的结果。
 */
export interface DictionaryResult {
  word: string;
  phonetic?: string;
  definition: string;
  usage?: string;
  example?: string;
  exampleTranslation?: string;
  tags?: string[];
  isAiGenerated?: boolean; // AI 生成结果的标记
}

/**
 * 句子的详细语法分析。
 */
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

/**
 * 代表外部链接或门户资源。
 */
export interface PortalLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  icon?: string; // Emoji 或 Favicon URL
  openMode: 'iframe' | 'new_tab'; // 用户选择打开方式
}
