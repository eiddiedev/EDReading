/**
 * AI 助手的聊天对话 API 路由，预设了英语教学专家的系统提示词，处理用户的英语学习咨询，包含安全检查和速率限制。
 */
import { NextResponse } from 'next/server';
import { checkContentSafety } from "@/lib/safety";
import { streamOpenAIResponse } from "@/lib/ai-stream";

/**
 * 英语学习助手的聊天接口。
 * 强制使用特定的系统提示词，以保持对话专注于英语学习。
 * 
 * @route POST /api/chat
 * @param {object} req.body
 * @param {object[]} req.body.messages - 聊天历史记录
 * @param {string} [req.body.userId] - 用户 ID，用于速率限制
 * @returns {object} 助手的响应消息
 */
export async function POST(req: Request) {
  // 1. 获取 API Key
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || "https://api.deepseek.com";

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { messages } = body;
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }
    
    // 获取用户最新的一条消息
    const lastMessage = messages[messages.length - 1];

    // 1.5 Rate Limiting & Admin Bypass (Need userId from header or body)
    // Assuming userId is passed in body for now, or we skip if not present
    const { userId } = body;
    if (userId) {
      const { checkRateLimit } = await import("@/lib/rate-limit");
      const rateLimit = await checkRateLimit(userId, "ai_chat", 50);
      if (!rateLimit.allowed) {
         return NextResponse.json({ 
          role: "assistant", 
          content: rateLimit.reason || "今日对话额度已用完 (每日限 50 次)，请明天再来。" 
        });
      }
    }
    
    // 2. 🛡️ 安全拦截 (合规性检查)
    const safety = checkContentSafety(lastMessage?.content || "");
    if (!safety.isSafe) {
      return NextResponse.json({ 
        role: "assistant", 
        content: "很抱歉，您的输入包含敏感或违规内容，无法继续对话。请讨论与英语学习相关的话题。" 
      });
    }

    // 3. 🧠 注入“英语老师”人设 (System Prompt)
    // 这是控制 AI 行为的核心
    const systemPrompt = {
      role: "system",
      content: `You are EDReading AI, a professional and encouraging English Learning Assistant.
       
      YOUR ROLE:
      - Help users with translation, grammar correction, vocabulary explanation, and IELTS/TOEFL preparation.
      - Explain distinct nuances between words.
      - Correct user's mistakes gently and provide better alternatives.

      STRICT RULES:
      1. DO NOT engage in general chit-chat about politics, entertainment, sports, or personal life unless it's for analyzing the English language itself.
      2. IF the user asks about an off-topic subject (e.g., "Who won the football match?", "What do you think about AI?"), YOU MUST STEER IT BACK TO ENGLISH LEARNING.
         - Example: "I focus on English learning. But we can learn how to say that in natural English: [...]"
      3. Keep responses concise. Mobile users verify short answers.
      4. If the user speaks Chinese, explain in Chinese but provide English examples.
       
      REFUSAL STRATEGY:
      - If asked to write code (Java/Python), say: "I am an English assistant, not a coding tool."
      - If asked for personal advice, say: "I can't give life advice, but I can help you write about it in English."`
    };

    // 构建新的消息列表：System Prompt + 用户历史消息
    // 注意：如果是多轮对话，要把 System Prompt 放在最前面
    const apiMessages = [systemPrompt, ...messages];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat", // 或者你配置的其他模型
        messages: apiMessages,
        temperature: 0.7, // 稍微降低温度，让它更严谨
        stream: true
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API Error:", errText);
      throw new Error(`AI Service Error: ${response.status}`);
    }

    return streamOpenAIResponse({
      upstream: response,
      parse: (raw) => ({
        role: "assistant",
        content: raw.trim(),
      }),
    });

  } catch (error: any) {
    console.error("Chat Error:", error);
    return NextResponse.json({ 
      role: "assistant", 
      content: "网络连接不太稳定，请稍后再试。（请检查 API Key 或网络环境）" 
    });
  }
}
