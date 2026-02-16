/**
 * 批量处理单词的 API 路由，用于生成单词列表的详细字典数据（包括音标、释义、例句等），主要用于导入单词功能。
 */
import { NextResponse } from "next/server";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;
const AI_BASE_URL = process.env.AI_BASE_URL || "https://api.deepseek.com";

/**
 * 批量处理单词列表，生成字典数据（释义、翻译等）。
 * 
 * @route POST /api/batch-process-words
 * @param {object} req.body
 * @param {string[]} req.body.words - 要处理的单词数组
 * @returns {object} 包含字典条目数组 "results" 的 JSON 对象
 */
export async function POST(req: Request) {
  if (!DEEPSEEK_API_KEY) {
    return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
  }

  try {
    const { words } = await req.json();

    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: "Invalid words array" }, { status: 400 });
    }

    const systemPrompt = `You are a strict Dictionary Data Generator.
Input: A list of English words.
Output: A JSON Array of objects.
**For EACH word, strictly follow this schema:**
{
  "text": "word",
  "phonetic": "/IPA/",
  "definition": "Simplified Chinese Definition",
  "translation": "Simplified Chinese Translation of the example",
  "example": "English example sentence",
  "tags": ["Tag1", "Tag2"]
}
**Constraint:** Do NOT wrap the JSON in markdown code blocks. Just return the raw JSON array.`;

    const userPrompt = `Generate dictionary data for these words: ${JSON.stringify(words)}`;

    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API Error:", errorText);
      return NextResponse.json({ error: "AI Processing Failed" }, { status: 500 });
    }

    const data = await response.json();
    let content = data.choices[0].message.content;

    // Remove markdown code blocks if present
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();

    // Sometimes AI returns object like { "words": [...] } instead of direct array
    // We need to parse it carefully
    let parsed;
    try {
      parsed = JSON.parse(content);
      if (parsed.words && Array.isArray(parsed.words)) {
        parsed = parsed.words;
      } else if (!Array.isArray(parsed)) {
        // If it's a single object, wrap in array? Or maybe it's { "result": [...] }
        // Let's assume strict instruction works, but handle object wrapper just in case
        const values = Object.values(parsed);
        if (values.length === 1 && Array.isArray(values[0])) {
            parsed = values[0];
        }
      }
    } catch (e) {
      console.error("JSON Parse Error:", e, content);
      return NextResponse.json({ error: "Invalid AI Response Format" }, { status: 500 });
    }

    return NextResponse.json({ results: parsed });

  } catch (error) {
    console.error("Batch Process Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
