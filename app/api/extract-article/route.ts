/**
 * 文章提取 API (Extract Article)
 * 作用：抓取并解析指定 URL 的网页内容，用于导入文章。
 * 定义：POST 接口，接收 URL。
 * 逻辑：
 * 1. 模拟浏览器 User-Agent 请求目标网页 HTML。
 * 2. 使用 `jsdom` 和 `@mozilla/readability` 解析 HTML，提取正文、标题和纯文本。
 * 3. 返回清洗后的文章数据。
 */
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { NextResponse } from 'next/server';

/**
 * 从给定的 URL 抓取并解析网页文章。
 * 使用 Mozilla Readability 提取主要内容。
 * 
 * @route POST /api/extract-article
 * @param {object} req.body
 * @param {string} req.body.url - 要抓取的 URL
 * @returns {object} 提取的文章数据 (标题, 内容, 纯文本)
 */
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
