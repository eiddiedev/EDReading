/**
 * AI 辅助工具 (AI Utilities)
 * 作用：提供前端调用的 AI 辅助功能，如短语提取、句子分析和单词查询。
 * 定义：封装了对后端 `/api/ai` 路由的 fetch 调用。
 * 逻辑：
 * 1. `analyzeTextForPhrases`: 调用 API 提取文本中的关键短语。
 * 2. `analyzeSentenceAI`: 调用 API 分析长难句结构。
 * 3. `lookupWordAI`: 调用 API 进行 AI 增强的单词查询。
 * 4. 处理网络请求错误并提供默认返回值。
 */
import { DictionaryResult, SentenceAnalysis } from "@/types";
//123
export async function analyzeTextForPhrases(text: string): Promise<string[]> {
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "extract_phrases",
        text,
      }),
    });
    
    if (!response.ok) throw new Error("API Error");
    
    const data = await response.json();
    return data.phrases || [];
  } catch (error) {
    console.error("AI Phrase Extraction Failed:", error);
    // Fallback: Return empty or simple heuristic
    return [];
  }
}

export async function analyzeSentenceAI(sentence: string): Promise<SentenceAnalysis | null> {
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "analyze_sentence",
        text: sentence,
      }),
    });

    if (!response.ok) throw new Error("API Error");
    return await response.json();
  } catch (error) {
    console.error("AI Sentence Analysis Failed:", error);
    return null;
  }
}

export async function lookupWordAI(word: string, context?: string): Promise<DictionaryResult | null> {
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "lookup_word",
        text: word,
        context,
      }),
    });

    if (!response.ok) throw new Error("API Error");
    return await response.json();
  } catch (error) {
    console.error("AI Dictionary Lookup Failed:", error);
    return null;
  }
}
