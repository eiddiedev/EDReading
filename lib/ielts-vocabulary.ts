/**
 * 雅思词汇库 (IELTS Vocabulary)
 * 作用：加载和导出雅思/学术核心词汇数据。
 * 定义：从 JSON 文件导入数据并强类型化导出。
 * 逻辑：已废弃硬编码数据，导出空对象以防止构建错误。
 */
import type { VocabularyDatabase } from "@/types";

export const IELTS_VOCAB_DB: VocabularyDatabase = {};
