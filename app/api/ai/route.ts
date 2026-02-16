import { NextResponse } from "next/server";
import nlp from "compromise";

// Config (simulate env vars for now if needed, or rely on process.env)
const apiKey = process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY;
const isDeepSeek = !process.env.AI_API_KEY && !!process.env.DEEPSEEK_API_KEY;

const baseUrl = process.env.AI_BASE_URL || (isDeepSeek ? "https://api.deepseek.com" : "https://api.openai.com/v1");
const model = process.env.AI_MODEL || (isDeepSeek ? "deepseek-chat" : "gpt-3.5-turbo");

/**
 * 通用 AI 端点，用于处理各种文本分析任务。
 * 
 * @route POST /api/ai
 * @param {object} request.body - 请求体
 * @param {string} request.body.action - 执行的操作: "extract_phrases" (提取短语) | "analyze_sentence" (分析句子) | "lookup_word" (查词)
 * @param {string} request.body.text - 要分析的文本
 * @param {string} [request.body.context] - 文本的上下文（可选）
 * @returns {object} 包含分析结果的 JSON 响应
 */
export async function POST(request: Request) {
  try {
    const { action, text, context } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // 1. Try LLM if Key is present
    if (apiKey) {
      try {
        const result = await callLLM(action, text, context);
        if (result) return NextResponse.json(result);
      } catch (e) {
        console.error("LLM Call Failed, falling back to local:", e);
      }
    }

    // 2. Local Fallback (Compromise / Rule-based)
    const result = localFallback(action, text, context);
    return NextResponse.json(result);

  } catch (error) {
    console.error("AI Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// --- LLM Implementation ---
async function callLLM(action: string, text: string, context?: string) {
  let systemPrompt = "You are an expert English teacher assisting an IELTS student.";
  let userPrompt = "";

  if (action === "extract_phrases") {
    systemPrompt += " Identify key phrases, idioms, and collocations in the text. Return JSON only: { \"phrases\": [\"phrase1\", \"phrase2\"] }.";
    userPrompt = `Analyze this text:\n"${text}"`;
  } else if (action === "analyze_sentence") {
    systemPrompt += " Analyze the sentence grammar (SVO), provide Chinese translation, and list core vocabulary. Return JSON: { \"structure\": {\"subject\": \"...\", \"verb\": \"...\", \"object\": \"...\"}, \"translation\": \"...\", \"vocabulary\": [\"word1\", \"word2\"], \"grammarExplanation\": \"...\" }.";
    userPrompt = `Analyze this sentence:\n"${text}"`;
  } else if (action === "lookup_word") {
    // Strict Dictionary Mode
    systemPrompt = `
You are a strict IELTS Dictionary Generator for Chinese students.
Analyze the target word/phrase in the context of the provided sentence.

**OUTPUT RULES (ZERO TOLERANCE):**
1.  **definition**: MUST be in **SIMPLIFIED CHINESE (简体中文)**. Do NOT return English definitions.
2.  **phonetic**: MUST include the IPA symbol (e.g., /wɜːd/). If unknown, estimate it.
3.  **translation**: The translation of the example sentence MUST be in **SIMPLIFIED CHINESE**. **ABSOLUTELY NO SPANISH OR FRENCH.**
4.  **tags**: Return tags in **Simplified Chinese** (e.g., "名词", "动词", "形容词", "雅思核心", "学术").
5.  **example**: Keep the example sentence in English.

**REQUIRED JSON FORMAT:**
{
  "word": "${text}",
  "phonetic": "/.../",
  "definition": "中文释义 (e.g. n. 范式转移)",
  "example": "English example sentence.",
  "exampleTranslation": "中文翻译 (e.g. 这是一个范式转移。)",
  "tags": ["名词", "核心词汇"]
}
`;
    userPrompt = `Analyze the word "${text}"${context ? ` in this context: "...${context}..."` : ""}.`;
  }

  const payload = {
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`LLM API Error: ${res.statusText}`);
  const data = await res.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}

// --- Local Fallback Implementation ---
function localFallback(action: string, text: string, context?: string) {
  const doc = nlp(text);

  if (action === "extract_phrases") {
    // Compromise Noun Phrases + hardcoded list fallback
    const nounPhrases = doc.nouns().out("array");
    // Also add some common ones if they appear
    const commonPhrases = [
      "account for", "lead to", "result in", "be responsible for", "contribute to",
      "cope with", "come up with", "as well as", "in terms of", "due to",
      "artificial intelligence", "climate change", "global warming"
    ];
    
    const foundCommon = commonPhrases.filter(p => text.toLowerCase().includes(p));
    // Merge unique
    const phrases = Array.from(new Set([...foundCommon, ...nounPhrases.filter((p: string) => p.includes(" "))]));
    
    return { phrases: phrases.slice(0, 20) }; // Limit to 20
  }

  if (action === "analyze_sentence") {
    // Basic SVO extraction with compromise
    // Note: Compromise SVO is experimental but better than nothing
    // We can simulate structure
    const subjects = doc.match("#Noun+").out("array");
    const verbs = doc.verbs().out("array");
    
    return {
      sentence: text,
      structure: {
        subject: subjects[0] || "Subject",
        verb: verbs[0] || "Verb",
        object: "Object/Complement", // Hard to extract reliably without full parser
      },
      translation: "[AI Key Missing] 这是一个模拟的翻译结果。请配置 API Key 以获取真实翻译。",
      vocabulary: doc.nouns().out("array").slice(0, 3),
      grammarExplanation: "Detected Subject: " + (subjects[0] || "None") + ", Verb: " + (verbs[0] || "None"),
    };
  }

  if (action === "lookup_word") {
    // Basic fallback for abbreviations
    const abbreviations: Record<string, string> = {
      "UK": "United Kingdom",
      "USA": "United States of America",
      "AI": "Artificial Intelligence",
      "IT": "Information Technology",
    };
    
    if (abbreviations[text.toUpperCase()]) {
      return {
        word: text,
        definition: abbreviations[text.toUpperCase()],
        example: "No example available.",
        tags: ["Abbreviation", "Fallback"],
        isAiGenerated: true,
      };
    }

    return {
      word: text,
      definition: `[Fallback] Definition for ${text}. (Configure AI for better results)`,
      tags: ["Fallback"],
      isAiGenerated: true,
    };
  }
}
