/**
 * 分析特定文本选段（单词、短语或句子）的 API 路由，提供详细的中文释义、音标、用法建议和语法分析，支持上下文理解。
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkContentSafety } from "@/lib/safety";
import { parseJsonCompletion, streamOpenAIResponse } from "@/lib/ai-stream";

const apiKey = process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY;
const isDeepSeek = !process.env.AI_API_KEY && !!process.env.DEEPSEEK_API_KEY;

const baseUrl = process.env.AI_BASE_URL || (isDeepSeek ? "https://api.deepseek.com" : "https://api.openai.com/v1");
const model = process.env.AI_MODEL || (isDeepSeek ? "deepseek-chat" : "gpt-3.5-turbo");

/**
 * 分析特定的文本选段（单词、短语或句子）及其上下文。
 * 
 * @route POST /api/analyze-selection
 * @param {object} request.body
 * @param {string} request.body.selection - 要分析的选定文本
 * @param {string} [request.body.context] - 周围的文本上下文
 * @param {string} [request.body.type="word"] - 选段类型: "word" (单词) | "phrase" (短语) | "sentence" (句子)
 * @returns {object} 分析结果，包含释义、翻译和用法
 */
export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { selection, context, type = "word" } = await request.json();

    if (!selection) {
      return NextResponse.json({ error: "No selection provided" }, { status: 400 });
    }

    const safety = checkContentSafety(selection);
    if (!safety.isSafe) {
      return NextResponse.json({ error: "内容违规" }, { status: 400 });
    }

    const cleanWord = selection.trim().toLowerCase();

    if (type === "word") {
      const { data: cached } = await supabase
        .from("public_dictionary")
        .select("*")
        .eq("word", cleanWord)
        .single();
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    if (!apiKey) {
      return NextResponse.json({ error: "AI_API_KEY not configured" }, { status: 500 });
    }

    let systemPrompt = "You are an expert English teacher assisting an IELTS student.";
    let userPrompt = "";

    if (type === "word") {
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
    } else if (type === "phrase") {
      systemPrompt = `
你是一名资深雅思词汇与短语讲师。该短语属于我的考点库，请结合当前文章语境，给出该短语最准确的中文解释和雅思层面的用法建议。

**OUTPUT RULES (ZERO TOLERANCE):**
1. **definition**: 必须是简体中文释义，贴合语境。
2. **usage**: 必须是简体中文，给出雅思层面的用法建议与搭配重点。
3. **example**: 英文例句，尽量结合语境或生成自然句子。
4. **exampleTranslation**: 例句中文翻译（简体中文）。
5. **tags**: 简体中文标签（可选）。

**REQUIRED JSON FORMAT:**
{
  "word": "${selection}",
  "definition": "中文释义",
  "usage": "用法建议",
  "example": "English example.",
  "exampleTranslation": "中文翻译。",
  "tags": ["短语", "学术"]
}
`;
      userPrompt = `Analyze the phrase "${selection}"${context ? ` in this context: "...${context}..."` : ""}.`;
    } else {
      systemPrompt = `
你是一名资深英语阅读讲师，请对句子做中文导向的精读分析。

**输出要求：**
1. \`translation\`：给出自然、准确的简体中文翻译。
2. \`structure\`：提炼句子的主语、谓语、宾语/核心补足信息。
3. \`grammarExplanation\`：用简体中文解释句子结构、从句、非谓语、修饰关系等重点。
4. \`vocabulary\`：提取 2-6 个理解本句最关键的单词或短语。
5. \`importantPhrases\`：如果句中有值得积累的重要短语、搭配或表达，返回数组；如果没有，返回空数组。
6. \`importantPhrases[].localExpression\`：给出一个更地道、更口语化或更常见的英文表达方式。
7. \`importantPhrases[].explanation\`：用简体中文简短说明这个短语在原句中的意思或语气。

**JSON 格式：**
{
  "structure": {
    "subject": "...",
    "verb": "...",
    "object": "..."
  },
  "translation": "中文翻译",
  "vocabulary": ["word1", "word2"],
  "grammarExplanation": "中文语法解析",
  "importantPhrases": [
    {
      "phrase": "原句中的重要短语",
      "localExpression": "更地道的英文表达",
      "explanation": "中文说明"
    }
  ]
}`;
      userPrompt = `请分析这个句子：\n"${selection}"${context ? `\n上下文："...${context}..."` : ""}`;
    }

    const payload = {
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      stream: true,
      response_format: { type: "json_object" },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 504) {
          throw new Error("AI Service Timed Out");
        }
        throw new Error(`AI API Error: ${res.statusText} (${res.status})`);
      }

      return streamOpenAIResponse({
        upstream: res,
        parse: (raw) => parseJsonCompletion<any>(raw),
        onDone: async (aiResult) => {
          if (type === "word" && aiResult) {
            await supabase.from("public_dictionary").upsert({
              word: cleanWord,
              phonetic: aiResult.phonetic,
              definition: aiResult.definition,
              translation: aiResult.translation || aiResult.definition,
              example: aiResult.example,
              example_zh: aiResult.exampleTranslation,
              tags: aiResult.tags,
            });
          }

          return aiResult;
        },
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        return NextResponse.json({ error: "AI 分析超时 (60s)。请稍后再试或检查网络。" }, { status: 504 });
      }
      throw fetchError;
    }
  } catch (error: any) {
    return NextResponse.json({ error: "分析失败" }, { status: 500 });
  }
}
