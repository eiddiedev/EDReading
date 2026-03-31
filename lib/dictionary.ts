/**
 * 客户端词典工具 (Dictionary Client)
 * 作用：在客户端执行单词查询，聚合多个免费 API 的结果。
 * 定义：包含 `lookupWord` 核心查询函数及本地 NLP 分析功能。
 * 逻辑：
 * 1. 优先检查 LocalStorage 缓存。
 * 2. 并行调用 DictionaryAPI (释义) 和 MyMemory (翻译)。
 * 3. 生成 Youdao 音频链接。
 * 4. 使用 `compromise` 库进行离线的句子成分分析 (`analyzeSentence`)。
 * 5. 整合结果并缓存。
 */
import { DictionaryResult, DictionaryMeaning } from "@/types";
import { resolvePronunciationAudioUrl } from "@/lib/pronunciation";
// @ts-ignore
import nlp from "compromise";

const DICTIONARY_API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";
const MYMEMORY_API_BASE = "https://api.mymemory.translated.net/get";

export function getCachedDictionaryResult(word: string): DictionaryResult | null {
  const normalizedWord = word.trim().toLowerCase();
  const cacheKey = `dict_cache_${normalizedWord}`;

  if (!normalizedWord || typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const result = JSON.parse(cached);
    return result?.word ? result : null;
  } catch (e) {
    console.error("Cache parse error", e);
    localStorage.removeItem(cacheKey);
    return null;
  }
}

export async function lookupLocalDictionary(word: string): Promise<DictionaryResult | null> {
  const normalizedWord = word.trim().toLowerCase();
  const cacheKey = `local_dict_${normalizedWord}`;
  if (!normalizedWord) return null;
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const result = JSON.parse(cached);
        if (result?.word) {
          return result;
        }
      }
    } catch (e) {
      console.error("Local cache parse error", e);
      localStorage.removeItem(cacheKey);
    }
  }
  try {
    const response = await fetch(`/api/dictionary/lookup?word=${encodeURIComponent(normalizedWord)}&include_ai=0`);
    if (!response.ok) return null;
    const data = await response.json();
    const tags = typeof data.tag === "string" ? data.tag.split(/\s+/).filter(Boolean) : [];
    const result = {
      word: normalizedWord,
      phonetic: data.phonetic || "",
      audio: resolvePronunciationAudioUrl(normalizedWord, data.audio) || undefined,
      cnDefinition: data.translation || "",
      tags,
      definition: data.translation || "暂无释义",
      isAiGenerated: false
    };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
      } catch (e) {
        console.error("Local cache write error", e);
      }
    }
    return result;
  } catch (error) {
    console.error("Local dictionary lookup failed:", error);
    return null;
  }
}

export async function lookupAiDictionary(word: string, targetLevel: string): Promise<DictionaryResult | null> {
  const normalizedWord = word.trim().toLowerCase();
  if (!normalizedWord) return null;
  try {
    const response = await fetch(
      `/api/dictionary/lookup?word=${encodeURIComponent(normalizedWord)}&include_ai=1&target_level=${encodeURIComponent(targetLevel || "ielts")}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    const tags = typeof data.tag === "string" ? data.tag.split(/\s+/).filter(Boolean) : [];
    const examples = Array.isArray(data.examples) ? data.examples : [];
    return {
      word: normalizedWord,
      phonetic: data.phonetic || "",
      audio: resolvePronunciationAudioUrl(normalizedWord, data.audio) || undefined,
      cnDefinition: data.translation || "",
      tags,
      definition: data.translation || "暂无释义",
      examples,
      example: examples[0]?.sentence || "",
      exampleTranslation: examples[0]?.translation || "",
      isAiGenerated: true
    };
  } catch (error) {
    console.error("AI dictionary lookup failed:", error);
    return null;
  }
}

export async function lookupExternalDictionary(word: string): Promise<DictionaryResult | null> {
  const normalizedWord = word.trim().toLowerCase();
  if (!normalizedWord) return null;
  try {
    const response = await fetch(`${DICTIONARY_API_BASE}/${normalizedWord}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const entry = data[0];
    const meanings: DictionaryMeaning[] = Array.isArray(entry.meanings)
      ? entry.meanings.map((m: any) => ({
          partOfSpeech: m.partOfSpeech,
          definitions: Array.isArray(m.definitions)
            ? m.definitions.map((d: any) => ({
                definition: d.definition,
                example: d.example
              }))
            : []
        }))
      : [];
    let examples: { sentence: string; translation?: string }[] = [];
    if (Array.isArray(entry.meanings)) {
      entry.meanings.forEach((m: any) => {
        if (Array.isArray(m.definitions)) {
          m.definitions.forEach((d: any) => {
            if (d.example) examples.push({ sentence: d.example });
          });
        }
      });
    }
    examples = examples.slice(0, 3);
    const phonetic = entry.phonetic || entry.phonetics?.find((p: any) => p.text)?.text || "";
    const audio = resolvePronunciationAudioUrl(normalizedWord, entry.phonetics?.find((p: any) => p.audio)?.audio || "") || undefined;
    const definition = meanings[0]?.definitions?.[0]?.definition || "暂无释义";
    return {
      word: entry.word || normalizedWord,
      phonetic,
      audio,
      meanings,
      examples,
      definition,
      isAiGenerated: false
    };
  } catch (error) {
    console.error("External dictionary lookup failed:", error);
    return null;
  }
}

export async function lookupWord(word: string, context?: string): Promise<DictionaryResult | null> {
  const normalizedWord = word.trim().toLowerCase();

  // 1. Check local storage cache
  const cachedResult = getCachedDictionaryResult(normalizedWord);
  if (cachedResult) {
    return cachedResult;
  }

  try {
    // 2. Parallel requests
    const [dictApiResponse, myMemoryResponse] = await Promise.allSettled([
      fetch(`${DICTIONARY_API_BASE}/${normalizedWord}`),
      fetch(`${MYMEMORY_API_BASE}?q=${normalizedWord}&langpair=en|zh`),
    ]);

    let meanings: DictionaryMeaning[] = [];
    let phonetic = "";
    let audio = resolvePronunciationAudioUrl(normalizedWord) || undefined;
    let examples: { sentence: string; translation?: string }[] = [];
    let cnDefinition = "";
    let returnedWord = word;

    // Process Dictionary API response
    if (dictApiResponse.status === "fulfilled" && dictApiResponse.value.ok) {
      try {
        const data = await dictApiResponse.value.json();
        if (Array.isArray(data) && data.length > 0) {
          const entry = data[0];
          returnedWord = entry.word || word;
          
          // Phonetic
          phonetic = entry.phonetic || entry.phonetics?.find((p: any) => p.text)?.text || "";
          audio = resolvePronunciationAudioUrl(normalizedWord, entry.phonetics?.find((p: any) => p.audio)?.audio || "") || undefined;
          
          // Meanings
          if (entry.meanings && Array.isArray(entry.meanings)) {
            meanings = entry.meanings.map((m: any) => ({
              partOfSpeech: m.partOfSpeech,
              definitions: m.definitions.map((d: any) => ({
                definition: d.definition,
                example: d.example
              }))
            }));

            // Extract examples
            entry.meanings.forEach((m: any) => {
              if (m.definitions) {
                m.definitions.forEach((d: any) => {
                  if (d.example) {
                    examples.push({ sentence: d.example });
                  }
                });
              }
            });
            // Limit examples
            examples = examples.slice(0, 3);
          }
        }
      } catch (e) {
        console.error("Error parsing DictionaryAPI response", e);
      }
    }

    // Process MyMemory API response
    if (myMemoryResponse.status === "fulfilled" && myMemoryResponse.value.ok) {
      try {
        const data = await myMemoryResponse.value.json();
        if (data && data.responseData) {
          const translatedText = data.responseData.translatedText;
          // Filter out if it just returns the same word (often happens when no translation found)
          if (translatedText && translatedText.toLowerCase() !== normalizedWord) {
            cnDefinition = translatedText;
          }
        }
      } catch (e) {
        console.error("Error parsing MyMemory response", e);
      }
    }

    // If we found nothing relevant, return null
    if (meanings.length === 0 && !cnDefinition) {
      return null;
    }

    const result: DictionaryResult = {
      word: returnedWord,
      phonetic,
      audio,
      cnDefinition,
      meanings,
      examples,
      // Compatibility fields
      definition: cnDefinition || meanings[0]?.definitions?.[0]?.definition || "暂无释义",
      example: examples[0]?.sentence,
      isAiGenerated: false
    };

    // 3. Cache result
    if (typeof window !== "undefined") {
      try {
        const cacheKey = `dict_cache_${normalizedWord}`;
        localStorage.setItem(cacheKey, JSON.stringify(result));
      } catch (e) {
        console.error("Cache write error", e);
      }
    }

    return result;

  } catch (error) {
    console.error("Dictionary lookup failed:", error);
    return null;
  }
}

// 句子翻译映射表（保留常用句子供分析使用）
const sentenceTranslations: Record<string, string> = {};

// 获取句子翻译
function translateSentence(sentence: string): string | null {
  const trimmed = sentence.trim();
  if (sentenceTranslations[trimmed]) {
    return sentenceTranslations[trimmed];
  }
  const normalized = trimmed.toLowerCase().replace(/[.,!?;:]/g, "");
  for (const [key, value] of Object.entries(sentenceTranslations)) {
    const normalizedKey = key.toLowerCase().replace(/[.,!?;:]/g, "");
    if (normalizedKey === normalized) {
      return value;
    }
  }
  return null;
}

export function analyzeSentence(sentence: string): { analysis: string; translation: string | null } {
  const translation = translateSentence(sentence);
  
  try {
    const doc = nlp(sentence);
    
    const subjects = doc.match('#Noun+').out('array');
    const verbs = doc.match('#Verb+').out('array');
    const objects = doc.match('#Noun+').not('#Pronoun').out('array');
    const clauses = doc.clauses().out('array');
    const terms = doc.terms().out('terms');
    const posAnalysis = terms.map((term: any) => 
      `${term.text} (${term.tags.join(', ')})`
    ).join(' | ');
    
    const analysis = `句子结构分析（使用compromise NLP库）：\n\n` +
      `📖 主语: ${subjects.length > 0 ? subjects.join(', ') : '未识别到明确主语'}\n` +
      `🏃 谓语: ${verbs.length > 0 ? verbs.join(', ') : '未识别到明确谓语'}\n` +
      `🎯 宾语: ${objects.length > 0 ? objects.join(', ') : '未识别到明确宾语'}\n\n` +
      `🔍 从句分析: ${clauses.length > 0 ? clauses.join(' | ') : '无从句结构'}\n\n` +
      `🏷️ 词性标注:\n${posAnalysis}\n\n` +
      `💡 说明：这是基于compromise NLP库的真实语法分析，完全离线运行。`;
    
    return {
      analysis,
      translation,
    };
  } catch (error) {
    console.error("语法分析错误:", error);
    const words = sentence.trim().split(/\s+/);
    const subject = words[0] || "未知";
    const verb = words.length > 1 ? words[1] : "未知";
    const object = words.length > 2 ? words.slice(2).join(" ") : "无";
    
    const analysis = `句子结构分析（备用模式）：\n\n主语: ${subject}\n谓语: ${verb}\n宾语: ${object}\n\n说明：compromise分析失败，使用简单分析。`;
    
    return {
      analysis,
      translation,
    };
  }
}
