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

    const candidatesArray = Array.from(allCandidates);
    
    // 1. 打印日志：监控每次请求到底向数据库发送了多少个候选词
    console.log(`[Levels API] 准备向 Supabase 查询 ${candidatesArray.length} 个候选词.`);

    // 2. 防御性限制：如果一次性查询太多词，可以考虑截断或在后续引入分批查询 (Chunking)
    // 这里暂时设置一个警告阈值
    if (candidatesArray.length > 300) {
      console.warn("[Levels API] 警告：查询词汇量过大，可能会导致 Supabase 响应缓慢甚至超时！");
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("dictionary")
      .select("word, collins, tag")
      .in("word", candidatesArray); // <- 超时通常发生在这里

    if (error) {
      console.error("Levels lookup error:", error);
      // 不要让服务端崩溃，返回空数组或特定状态码
      return NextResponse.json([], { status: 500 });
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
    // 捕获超时或网络错误，优雅地返回
    return NextResponse.json([], { status: 504 }); // 504 代表网关/上游超时
  }
}