import { DictionaryResult, SentenceAnalysis } from "@/types";

export async function analyzeTextForPhrases(text: string): Promise<string[]> {
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "extract_phrases",
        text,
      }),
    });
    
    if (!response.ok) throw new Error("API Error");
    
    const data = await response.json();
    return data.phrases || [];
  } catch (error) {
    console.error("AI Phrase Extraction Failed:", error);
    // Fallback: Return empty or simple heuristic
    return [];
  }
}

export async function analyzeSentenceAI(sentence: string): Promise<SentenceAnalysis | null> {
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "analyze_sentence",
        text: sentence,
      }),
    });

    if (!response.ok) throw new Error("API Error");
    return await response.json();
  } catch (error) {
    console.error("AI Sentence Analysis Failed:", error);
    return null;
  }
}

export async function lookupWordAI(word: string, context?: string): Promise<DictionaryResult | null> {
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "lookup_word",
        text: word,
        context,
      }),
    });

    if (!response.ok) throw new Error("API Error");
    return await response.json();
  } catch (error) {
    console.error("AI Dictionary Lookup Failed:", error);
    return null;
  }
}
