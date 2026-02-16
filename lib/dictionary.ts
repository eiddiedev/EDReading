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
// @ts-ignore
import nlp from "compromise";

const DICTIONARY_API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";
const MYMEMORY_API_BASE = "https://api.mymemory.translated.net/get";
const YOUDAO_AUDIO_BASE = "https://dict.youdao.com/dictvoice";

export async function lookupWord(word: string, context?: string): Promise<DictionaryResult | null> {
  const normalizedWord = word.trim().toLowerCase();
  const cacheKey = `dict_cache_${normalizedWord}`;

  // 1. Check local storage cache
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const result = JSON.parse(cached);
        // Simple validation
        if (result.word) {
          return result;
        }
      }
    } catch (e) {
      console.error("Cache parse error", e);
      localStorage.removeItem(cacheKey);
    }
  }

  try {
    // 2. Parallel requests
    const [dictApiResponse, myMemoryResponse] = await Promise.allSettled([
      fetch(`${DICTIONARY_API_BASE}/${normalizedWord}`),
      fetch(`${MYMEMORY_API_BASE}?q=${normalizedWord}&langpair=en|zh`),
    ]);

    let meanings: DictionaryMeaning[] = [];
    let phonetic = "";
    let audio = "";
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

    // Generate Youdao Audio Link
    audio = `${YOUDAO_AUDIO_BASE}?audio=${normalizedWord}&type=2`;

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
const sentenceTranslations: Record<string, string> = {
  "Artificial intelligence is transforming the way we live and work.": "人工智能正在改变我们的生活方式和工作方式。",
  "Machine learning algorithms can now process vast amounts of data and make predictions with remarkable accuracy.": "机器学习算法现在可以处理大量数据，并以惊人的准确性进行预测。",
  "The applications of AI are endless, from healthcare to transportation, from education to entertainment.": "人工智能的应用是无穷无尽的，从医疗保健到交通运输，从教育到娱乐。",
  "Climate change is one of the most pressing issues of our time.": "气候变化是我们这个时代最紧迫的问题之一。",
  "Rising global temperatures are causing sea levels to rise, weather patterns to shift, and ecosystems to change.": "全球气温上升正在导致海平面上升、天气模式转变和生态系统变化。",
  "Scientists around the world are working to understand these changes and develop solutions.": "世界各地的科学家正在努力理解这些变化并开发解决方案。",
  "Reading is a fundamental skill that opens doors to knowledge and imagination.": "阅读是一项基本技能，为知识和想象力打开大门。",
  "When you read regularly, you improve your vocabulary, enhance your comprehension skills, and expand your understanding of the world.": "当你定期阅读时，你会提高词汇量，增强理解能力，并扩展对世界的理解。",
  "Books can transport you to different places and times.": "书籍可以带你到不同的地方和时代。",
};

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
