/**
 * 批量处理单词的 API 路由，用于生成单词列表的详细字典数据（包括音标、释义、例句等），主要用于导入单词功能。
 */
import { NextResponse } from "next/server";
import { parseJsonCompletion, streamOpenAIResponse } from "@/lib/ai-stream";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;
const AI_BASE_URL = process.env.AI_BASE_URL || "https://api.deepseek.com";

function normalizeWords(words: unknown[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  words.forEach((item) => {
    if (typeof item !== "string") return;

    const value = item.trim().replace(/\s+/g, " ");
    if (!value) return;

    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(value);
  });

  return normalized;
}

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
    const body = await req.json();
    const words = Array.isArray(body?.words) ? normalizeWords(body.words) : [];
    const rawInput = typeof body?.rawInput === "string" ? body.rawInput.trim() : "";

    if (words.length === 0 && !rawInput) {
      return NextResponse.json({ error: "Invalid import payload" }, { status: 400 });
    }

    const systemPrompt = `You are a strict vocabulary import assistant for an English learning app.
Your job is to extract useful English vocabulary items and generate dictionary data for import.

Rules:
1. The input may be:
   - a clean list of English words
   - English words mixed with Chinese explanations
   - numbered lists, bullets, slashes, commas, semicolons, or messy pasted text
2. Extract unique English vocabulary items in the original order.
3. Keep useful single words and short phrases only. A phrase must be concise and practical, no more than 4 English words.
4. Ignore Chinese text, numbering, empty fragments, duplicate items, and full sentences or clauses that are too long for a vocabulary notebook.
5. For each extracted item, generate high-quality dictionary data.

Output must be raw JSON only, with this exact shape:
{
  "results": [
    {
      "text": "word or phrase",
      "phonetic": "/IPA/",
      "definition": "简体中文释义",
      "translation": "例句的简体中文翻译",
      "example": "A natural English example sentence",
      "tags": ["tag1", "tag2"]
    }
  ]
}

Do not wrap JSON in markdown code fences.
Do not include any explanation outside the JSON.`;

    const userPrompt =
      words.length > 0
        ? `Please generate dictionary import data for these vocabulary items:\n${JSON.stringify(words)}`
        : `Please extract vocabulary items from the following raw input, then generate dictionary import data:\n${rawInput}`;

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
        stream: true,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API Error:", errorText);
      return NextResponse.json({ error: "AI Processing Failed" }, { status: 500 });
    }

    return streamOpenAIResponse({
      upstream: response,
      parse: (raw) => {
        let parsed = parseJsonCompletion<any>(raw);
        if (Array.isArray(parsed.results)) {
          parsed = parsed.results;
        } else if (parsed.words && Array.isArray(parsed.words)) {
          parsed = parsed.words;
        } else if (!Array.isArray(parsed)) {
          const values = Object.values(parsed);
          if (values.length === 1 && Array.isArray(values[0])) {
            parsed = values[0];
          }
        }
        return { results: parsed };
      },
    });

  } catch (error) {
    console.error("Batch Process Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
