import { AIVocabulary, AISentence } from "@/types";

export interface AIProcessResult {
  id?: string;
  title: string;
  title_zh?: string;
  content: string;
  level?: string;
  phrases: string[];
  vocabulary: AIVocabulary[];
  sentences: AISentence[];
  tags: string[];
}

export async function processTextWithAI(text: string): Promise<AIProcessResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;
  const baseUrl = process.env.DEEPSEEK_API_KEY 
    ? "https://api.deepseek.com" 
    : (process.env.AI_BASE_URL || "https://api.deepseek.com");

  if (!apiKey) {
    console.warn("⚠️ No API key found. Returning MOCK analysis for demonstration.");
    // Mock Analysis Result
    return {
      title: "Processed Article (Demo)",
      title_zh: "已处理文章 (演示)",
      content: text,
      phrases: ["vertical farming", "food security", "carbon footprint", "renewable energy", "urban core"],
      vocabulary: [
        {
          word: "sustainable",
          phonetic: "/səˈsteɪnəbl/",
          definition: "adj. 可持续的；不破坏生态平衡的",
          translation: "可持续的",
          example: "We need to find sustainable ways to produce energy.",
          exampleTranslation: "我们需要找到生产能源的可持续方式。",
          tags: ["雅思核心", "环境"]
        },
        {
          word: "viability",
          phonetic: "/ˌvaɪəˈbɪləti/",
          definition: "n. 可行性；生存能力",
          translation: "可行性",
          example: "The economic viability of the project is questionable.",
          exampleTranslation: "该项目的经济可行性值得怀疑。",
          tags: ["学术词汇", "名词"]
        }
      ],
      sentences: [
        {
          original: "Unlike conventional farming, which requires vast tracts of arable land, vertical farming utilizes controlled-environment agriculture (CEA) technology to optimize plant growth in skyscrapers, shipping containers, and repurposed warehouses.",
          translation: "与需要大量耕地的传统农业不同，垂直农业利用受控环境农业（CEA）技术在摩天大楼、集装箱和改建仓库中优化植物生长。",
          structure: "这是一个复杂的复合句。主句是 'vertical farming utilizes... technology to optimize...'。'Unlike conventional farming' 是介词短语作状语，后接非限制性定语从句 'which requires vast tracts of arable land' 修饰 'farming'。"
        }
      ],
      tags: ["Demo", "MockData"]
    };
  }

  const systemPrompt = `You are an IELTS expert. Process the user's text.
Return a STRICT JSON object with the following fields:
1. "title": Auto-generate a short, engaging English title if the text lacks one.
2. "title_zh": Translate the title into engaging Simplified Chinese.
3. "content": The cleaned text.
4. "phrases": An array of strings. Identify 5-10 key IELTS idioms/collocations (e.g., "account for").
5. "vocabulary": An array of objects. For each item, generate a JSON object following these ZERO TOLERANCE rules:
   - "word": The word or phrase.
   - "phonetic": **REQUIRED**. The International Phonetic Alphabet (IPA) symbol (e.g., /ðə/, /hjuːmən/). If unknown, estimate it.
   - "definition": **STRICTLY SIMPLIFIED CHINESE (简体中文)**. Do NOT return English definitions. Explain the meaning in the context of the article.
   - "example": An original example sentence in English.
   - "exampleTranslation": **STRICTLY SIMPLIFIED CHINESE (简体中文)** translation of the example sentence. **ABSOLUTELY NO SPANISH OR FRENCH.**
   - "tags": An array of tags in **Simplified Chinese** (e.g., "雅思核心", "学术", "高频", "动词", "名词"). Do not use English tags like "noun".

   **Example Output (Follow this format exactly):**
   {
     "word": "paradigm shift",
     "phonetic": "/ˈpærədaɪm ʃɪft/",
     "definition": "n. 范式转移；根本性的观念转变",
     "example": "This discovery marks a paradigm shift in our understanding.",
     "exampleTranslation": "这一发现标志着我们理解上的一个根本性转变。",
     "tags": ["雅思核心", "学术词汇"]
   }

6. "sentences": An array of objects identifying complex sentences with { "original": "...", "translation": "Chinese translation", "structure": "Analysis of the sentence structure in Simplified Chinese" }.
   CRITICAL INSTRUCTION: The "structure" field in "sentences" MUST BE IN SIMPLIFIED CHINESE (简体中文). Do not use English for the explanation text.
7. "tags": An array of strings representing the article's category/topic in English (e.g., "Politics", "Technology", "Health", "Culture"). Max 3 tags.

Respond with valid JSON only. Do not include markdown formatting.`;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const result = JSON.parse(content);
      return {
        title: result.title || "Untitled Article",
        title_zh: result.title_zh || "",
        content: result.content || text,
        phrases: Array.isArray(result.phrases) ? result.phrases : [],
        vocabulary: Array.isArray(result.vocabulary) 
          ? result.vocabulary.map((v: any) => ({
              ...v,
              translation: v.translation || v.definition || "", 
              definition: v.definition || v.translation || "" 
            })) 
          : [],
        sentences: Array.isArray(result.sentences) ? result.sentences : [],
        tags: Array.isArray(result.tags) ? result.tags : [],
      };
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      return { 
        title: "Error Parsing AI Response",
        content: text,
        phrases: [], 
        vocabulary: [], 
        sentences: [],
        tags: []
      };
    }

  } catch (error) {
    console.error("processTextWithAI failed:", error);
    throw error;
  }
}

export interface RSSItem {
  title: string;
  link: string;
  contentSnippet?: string;
  pubDate?: string;
}

export interface CuratedItem {
  title: string;
  url: string;
  difficulty: string;
  reason: string;
  tags: string[];
  date?: string;
}

export async function batchTranslateTitles(titles: string[]): Promise<Record<string, string>> {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;
  const baseUrl = process.env.DEEPSEEK_API_KEY 
    ? "https://api.deepseek.com" 
    : (process.env.AI_BASE_URL || "https://api.deepseek.com");

  if (!apiKey || titles.length === 0) return {};

  const systemPrompt = `You are a professional translator. 
Translate the following English news titles into Simplified Chinese. 
The translations should be concise, professional, and suitable for a news feed.
Maintain the original meaning accurately.
Return a STRICT JSON object where keys are the original English titles and values are the Chinese translations.`;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(titles) },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return {};
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error("Translation failed:", error);
    return {};
  }
}

export async function curateFeedWithAI(items: RSSItem[]): Promise<CuratedItem[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;
  const baseUrl = process.env.DEEPSEEK_API_KEY 
    ? "https://api.deepseek.com" 
    : (process.env.AI_BASE_URL || "https://api.deepseek.com");

  // Fallback if no API key
  if (!apiKey) {
    return items.slice(0, 5).map(i => ({
      title: i.title,
      url: i.link,
      difficulty: "Band 6.5",
      reason: i.contentSnippet || "Good for general reading.",
      tags: ["General"]
    }));
  }

  const systemPrompt = `Analyze these article summaries for an IELTS student. 
Return a STRICT JSON object with an "items" field containing an array.
Each item must have:
- title: Article title.
- url: The link.
- difficulty: Estimated IELTS difficulty (e.g., 'Band 7.0', 'Band 6.0', 'Band 8.0').
- reason: A persuasive 1-sentence reason to read (e.g., 'Contains excellent inversion structures' or 'Great vocab for Environment topic').
- tags: A list of short tags (e.g., ['Science', 'Tech', 'Sport', 'Hard']).
Select the top 5-8 most suitable articles for IELTS preparation.`;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(items) },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) throw new Error("AI API Error");
    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return result.items || [];
  } catch (error) {
    console.error("Curation failed:", error);
    // Fallback: return original items adapted to new interface
    return items.slice(0, 5).map(i => ({
      title: i.title,
      url: i.link,
      difficulty: "Band ?",
      reason: i.contentSnippet || "Recommended reading.",
      tags: ["Fallback"]
    }));
  }
}
