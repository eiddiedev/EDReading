import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "Missing URL" }, { status: 400 });
    }

    // 1. Fetch the HTML pretending to be a browser
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
        // Fallback or specific error handling could go here, but for now throwing is fine as per template
        throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const html = await response.text();

    // 2. Parse Content
    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    // 3. Return Clean Data
    return NextResponse.json({
      title: article?.title || "No Title",
      content: article?.content || "", // This is HTML content (good for formatting)
      textContent: article?.textContent || "" // This is raw text (good for AI analysis)
    });

  } catch (error: any) {
    console.error("Extraction failed:", error);
    return NextResponse.json({ error: error.message || "Failed to extract article" }, { status: 500 });
  }
}
