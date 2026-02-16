/**
 * AI 单词卡片生成 API (Card Gen)
 * 作用：为指定单词生成高质量、语境丰富的例句和翻译。
 * 定义：POST 接口，接收单词和定义。
 * 逻辑：
 * 1. 构造 Prompt，要求 AI 模仿《经济学人》风格生成例句。
 * 2. 调用 AI 接口获取 JSON 格式的例句和翻译。
 * 3. 返回生成结果供前端展示。
 */
import { NextResponse } from "next/server";

const AI_API_KEY = process.env.AI_API_KEY;
const AI_BASE_URL = process.env.AI_BASE_URL || "https://api.openai.com/v1";
const AI_MODEL = process.env.AI_MODEL || "gpt-3.5-turbo";

/**
 * 为单词生成复杂且富含上下文的例句（经济学人风格）。
 * 
 * @route POST /api/ai/card-gen
 * @param {object} request.body
 * @param {string} request.body.word - 目标单词
 * @param {string} [request.body.definition] - 可选的释义上下文
 * @returns {object} 包含 "sentence" (英文) 和 "translation" (中文) 的 JSON
 */
export async function POST(request: Request) {
  try {
    const { word, definition } = await request.json();

    if (!word) {
      return NextResponse.json({ error: "No word provided" }, { status: 400 });
    }

    if (!AI_API_KEY) {
      // Mock response for dev
      return NextResponse.json({ 
        sentence: `The concept of ${word} is pivotal in understanding modern economics.`,
        translation: `${word}的概念对于理解现代经济学至关重要。`
      });
    }

    const systemPrompt = `
You are an expert editor for "The Economist".
Your task is to generate a sophisticated, context-rich example sentence for a given English word.

**REQUIREMENTS:**
1. **Style**: The sentence must mimic the style of "The Economist" or "New York Times" — intellectual, formal, and often related to economics, politics, technology, or sociology.
2. **Context**: The sentence should clearly demonstrate the meaning of the word in a complex context.
3. **Translation**: Provide a fluent, natural Simplified Chinese translation.
4. **Consistency**: Use the provided definition (if any) to ensure the sentence matches the intended meaning.

**OUTPUT FORMAT (JSON Only):**
{
  "sentence": "The sophisticated English sentence...",
  "translation": "The Simplified Chinese translation..."
}
`;

    const userPrompt = `Word: "${word}"\nDefinition: "${definition || 'General meaning'}"\n\nGenerate an Economist-style example sentence.`;

    const payload = {
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7, // Slightly higher for creativity
      response_format: { type: "json_object" },
    };

    const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AI_API_KEY}`,
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
    console.error("Card Gen Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
