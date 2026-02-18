import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch (error) {
      console.error("Batch API invalid JSON:", error);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { words } = (payload || {}) as { words?: string[] };

    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: "Words array is required" }, { status: 400 });
    }

    const normalizedWords = Array.from(
      new Set(
        words
          .map((word) => (typeof word === "string" ? word.trim().toLowerCase() : ""))
          .filter(Boolean)
      )
    );

    if (normalizedWords.length === 0) {
      return NextResponse.json({ error: "Words array is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const chunkSize = 100;
    const results: { word: string; collins: number | null; tag: string | null }[] = [];

    const queryChunk = async (chunk: string[], attempt = 1) => {
      const { data, error } = await supabase
        .from("dictionary")
        .select("word, collins, tag")
        .in("word", chunk);

      if (!error) return data || [];

      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
        return queryChunk(chunk, attempt + 1);
      }

      console.error("Batch dictionary lookup error:", error);
      return null;
    };

    for (let i = 0; i < normalizedWords.length; i += chunkSize) {
      const chunk = normalizedWords.slice(i, i + chunkSize);
      const data = await queryChunk(chunk);
      if (data && data.length > 0) {
        results.push(...data);
      }
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error("Batch API exception:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
