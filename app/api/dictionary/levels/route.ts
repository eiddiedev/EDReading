import { buildLookupCandidates, normalizeWordInput } from "@/lib/vocab-engine";
import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const words = Array.isArray(payload?.words) ? payload.words : [];

    const candidatesByWord = new Map<string, string[]>();
    const allCandidates = new Set<string>();

    words.forEach((rawWord: string) => {
      const normalized = normalizeWordInput(rawWord);
      if (!normalized) return;
      const candidates = buildLookupCandidates(normalized);
      if (candidates.length === 0) return;
      candidatesByWord.set(normalized, candidates);
      candidates.forEach((candidate) => allCandidates.add(candidate));
    });

    if (allCandidates.size === 0) {
      return NextResponse.json([]);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("dictionary")
      .select("word, collins, tag")
      .in("word", Array.from(allCandidates));

    if (error) {
      console.error("Levels lookup error:", error);
      return NextResponse.json([]);
    }

    const recordMap = new Map((data || []).map((item) => [item.word, item]));
    const results: { word: string; base_word: string; collins: number | null; tag: string | null }[] = [];

    candidatesByWord.forEach((candidates, original) => {
      const matched = candidates.find((candidate) => recordMap.has(candidate));
      if (!matched) return;
      const record = recordMap.get(matched)!;
      results.push({
        word: original,
        base_word: matched,
        collins: record.collins,
        tag: record.tag,
      });
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Levels API exception:", error);
    return NextResponse.json([]);
  }
}
