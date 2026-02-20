import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: Request) {
  const start = Date.now();
  const { searchParams } = new URL(request.url);
  const rawWord = searchParams.get("word");
  const includeAi = searchParams.get("include_ai") === "1";
  const targetLevel = searchParams.get("target_level") || "ielts";

  if (!rawWord) return NextResponse.json({ error: "Word required" }, { status: 400 });

  const word = rawWord.trim().toLowerCase();

  // 1. 建立 Supabase 连接
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // 定义通用的超时包装器 (2秒)
  const timeoutPromise = (ms: number) => new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Database timeout')), ms)
  );

  // --- 核心逻辑 A: 本地数据库优先 (极速模式) ---
  let localData = null;

  // 构造词根数组，把时态和复数全部放进去，一次性查询！
  const stems = [word];
  if (word.endsWith("s")) stems.push(word.slice(0, -1));
  if (word.endsWith("es")) stems.push(word.slice(0, -2));
  if (word.endsWith("ing")) stems.push(word.slice(0, -3));
  if (word.endsWith("ed")) stems.push(word.slice(0, -2));

  try {
    // 数据库查询：使用 .in 一次性查出所有的词根可能
    const dbQuery = supabase
      .from("dictionary")
      .select("*")
      .in("word", stems)
      .limit(1)
      .maybeSingle();

    // 强硬的 2 秒超时竞争
    const { data } = await Promise.race([
      dbQuery,
      timeoutPromise(2000)
    ]) as any;

    if (data) localData = data;
  } catch (err) {
    console.warn(`⚠️ [Lookup] DB Timeout/Error for "${word}":`, err);
  }

  // ✅ 命中本地数据：直接返回！
  if (localData) {
    console.log(`🚀 [Lookup] Local Hit: "${word}" -> "${localData.word}" in ${Date.now() - start}ms`);
    return NextResponse.json({
      ...localData,
      source: "local",
      isAiGenerated: false
    });
  }

  // --- 核心逻辑 B: 本地没有，进入 AI 兜底 (慢速模式) ---

  if (!includeAi) {
    console.warn(`⚠️ [Lookup] Local Miss (No AI): "${word}" in ${Date.now() - start}ms`);
    return NextResponse.json({ error: "Not found locally" }, { status: 404 });
  }

  console.log(`🤖 [Lookup] Calling AI for: "${word}"`);

  try {
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;
    const baseUrl = process.env.AI_BASE_URL || "https://api.deepseek.com";
    if (!apiKey) {
      return NextResponse.json({ error: "AI configuration missing" }, { status: 500 });
    }

    // 并行执行：DeepSeek + 音频获取
    const deepSeekPromise = callDeepSeek(word, targetLevel, apiKey, baseUrl);
    const audioPromise = callFreeDictionaryApiForAudio(word);

    // 等待 AI 结果
    const aiResult = await deepSeekPromise;

    if (!aiResult) {
      return NextResponse.json({ error: "AI lookup failed" }, { status: 500 });
    }

    let audioUrl: string | null = null;
    try {
      // 音频获取也加个1.5秒超时防卡死
      const audioResult = await Promise.race([
        audioPromise,
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
      ]);
      if (typeof audioResult === 'string') {
        audioUrl = audioResult;
      }
    } catch (e) {
      console.log("Audio fetch timeout/failed, ignoring...");
    }

    const finalResult = {
      ...aiResult,
      audio: audioUrl,
    };
    
    // 异步写入数据库，不阻塞用户
    writeToSupabase(word, finalResult);

    return NextResponse.json({
      word: word,
      phonetic: finalResult.phonetic,
      translation: finalResult.translation,
      tag: finalResult.tag,
      collins: finalResult.collins,
      examples: finalResult.examples,
      audio: finalResult.audio,
      is_ai: true,
      isAiGenerated: true
    });

  } catch (error) {
    console.error("AI Lookup Failed:", error);
    return NextResponse.json({ error: "AI failed" }, { status: 500 });
  }
}

// ================== 辅助函数区域 ==================

async function callFreeDictionaryApiForAudio(word: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const entry = data[0];
      const audio = entry.phonetics?.find((p: any) => p.audio)?.audio || "";
      return audio;
    }
    return null;
  } catch (error) {
    console.error("Free Dictionary API audio fetch error:", error);
    return null;
  }
}

async function callDeepSeek(word: string, targetLevel: string, apiKey: string, baseUrl: string) {
  const prompt = `You are an IELTS/TOEFL vocabulary assistant. Return JSON only.
{
  "phonetic": "IPA",
  "translation": "Simplified Chinese definition",
  "collins": 0,
  "level": 1,
  "examples": [
    { "sentence": "Example 1", "translation": "中文翻译1" },
    { "sentence": "Example 2", "translation": "中文翻译2" }
  ]
}
Rules:
- "collins" is 0-5 if known, otherwise 0.
- "level" is 1-4 (1 easiest, 4 hardest).
- Examples must match target level: ${targetLevel}.`;

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
          { role: "system", content: prompt },
          { role: "user", content: word },
        ],
        temperature: 0.6,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI lookup error:", errText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      console.error("AI lookup parse error:", error);
      return null;
    }

    const aiPhonetic = typeof parsed.phonetic === "string" ? parsed.phonetic : "";
    const aiTranslation = typeof parsed.translation === "string" ? parsed.translation : "暂无释义";
    const aiCollins =
      typeof parsed.collins === "number"
        ? parsed.collins
        : typeof parsed.level === "number"
          ? parsed.level === 1 ? 4 : parsed.level === 2 ? 3 : parsed.level === 3 ? 2 : 0
          : 0;
    const aiTag = `${targetLevel} ai`;

    return {
      phonetic: aiPhonetic,
      translation: aiTranslation,
      tag: aiTag,
      collins: aiCollins,
      examples: Array.isArray(parsed.examples) ? parsed.examples : [],
    };
  } catch (error) {
    console.error("callDeepSeek failed:", error);
    return null;
  }
}

async function writeToSupabase(word: string, data: any) {
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceUrl && serviceKey) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const serviceClient = createClient(serviceUrl, serviceKey);
      await serviceClient.from("dictionary").upsert({
        word: word,
        phonetic: data.phonetic,
        translation: data.translation,
        tag: data.tag,
        collins: data.collins,
        audio: data.audio,
        examples: data.examples,
      });
      console.log(`✅ [Lookup] Word "${word}" saved to database`);
    } catch (e) {
      console.error("Supabase write-back error:", e);
    }
  }
}