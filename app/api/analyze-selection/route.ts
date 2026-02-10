import { NextResponse } from "next/server";

const apiKey = process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY;
const isDeepSeek = !process.env.AI_API_KEY && !!process.env.DEEPSEEK_API_KEY;

const baseUrl = process.env.AI_BASE_URL || (isDeepSeek ? "https://api.deepseek.com" : "https://api.openai.com/v1");
const model = process.env.AI_MODEL || (isDeepSeek ? "deepseek-chat" : "gpt-3.5-turbo");

export async function POST(request: Request) {
  try {
    const { selection, context, type } = await request.json();

    if (!selection) {
      return NextResponse.json({ error: "No selection provided" }, { status: 400 });
    }

    if (!apiKey) {
      console.warn("Missing API Key. Env vars:", { 
        hasAiKey: !!process.env.AI_API_KEY, 
        hasDeepSeekKey: !!process.env.DEEPSEEK_API_KEY 
      });
      // Fallback for dev without key (or implement local logic here)
      return NextResponse.json({ 
        error: "AI_API_KEY not configured",
        mock: true,
        analysis: "AI key missing. Please configure env vars.",
        translation: "AI 密钥未配置。",
        vocabulary: [] 
      });
    }

    let systemPrompt = "You are an expert English teacher assisting an IELTS student.";
    let userPrompt = "";

    if (type === "word") {
      // Strict Dictionary Mode
      systemPrompt = `
You are a strict IELTS Dictionary Generator for Chinese students.
Analyze the target word/phrase in the context of the provided sentence.

**OUTPUT RULES (ZERO TOLERANCE):**
1.  **definition**: MUST be in **SIMPLIFIED CHINESE (简体中文)**. Do NOT return English definitions.
2.  **phonetic**: MUST include the IPA symbol (e.g., /wɜːd/). If unknown, estimate it.
3.  **translation**: The translation of the example sentence MUST be in **SIMPLIFIED CHINESE**. **ABSOLUTELY NO SPANISH OR FRENCH.**
4.  **tags**: Return tags in **Simplified Chinese** (e.g., "名词", "动词", "形容词", "雅思核心", "学术").
5.  **example**: Keep the example sentence in English (use the context if appropriate, or generate a good one).
6.  **exampleTranslation**: Translate the example to Chinese.

**REQUIRED JSON FORMAT:**
{
  "word": "${selection}",
  "phonetic": "/.../",
  "definition": "中文释义",
  "example": "English example.",
  "exampleTranslation": "中文翻译。",
  "tags": ["词性", "标签"]
}
`;
      userPrompt = `Analyze the word "${selection}"${context ? ` in this context: "...${context}..."` : ""}.`;

    } else {
      // Sentence Analysis Mode
      systemPrompt += " Analyze the sentence grammar (SVO), provide Chinese translation, and list core vocabulary. Return JSON: { \"structure\": {\"subject\": \"...\", \"verb\": \"...\", \"object\": \"...\"}, \"translation\": \"...\", \"vocabulary\": [\"word1\", \"word2\"], \"grammarExplanation\": \"...\" }.";
      userPrompt = `Analyze this sentence:\n"${selection}"${context ? `\nContext: "...${context}..."` : ""}`;
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

    console.log(`Calling AI API: ${baseUrl} (Model: ${model})`);

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("AI API Error:", res.status, errText);
      throw new Error(`AI API Error: ${res.statusText}`);
    }

    const data = await res.json();
    const content = data.choices[0].message.content;
    
    return NextResponse.json(JSON.parse(content));

  } catch (error) {
    console.error("Analyze Selection Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
