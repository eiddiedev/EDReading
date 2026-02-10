"use server";

import { processTextWithAI, AIProcessResult } from "@/lib/ai-processor";

export async function analyzeArticleWithAI(text: string): Promise<AIProcessResult> {
  try {
    return await processTextWithAI(text);
  } catch (error) {
    console.error("Error in analyzeArticleWithAI action:", error);
    // Return empty result on error to allow UI to proceed gracefully
    return { 
      title: "",
      content: text,
      phrases: [], 
      vocabulary: [],
      sentences: [],
      tags: []
    };
  }
}

