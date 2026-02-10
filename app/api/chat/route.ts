import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;
    const baseUrl = process.env.DEEPSEEK_API_KEY 
      ? "https://api.deepseek.com" 
      : (process.env.AI_BASE_URL || "https://api.deepseek.com");

    if (!apiKey) {
      return NextResponse.json({ 
        role: "assistant", 
        content: "API Key not configured. Please check your environment variables." 
      });
    }

    const systemPrompt = "You are a helpful, friendly AI assistant for a university student. You are knowledgeable about IELTS, Football, Science Fiction, and Coding. Be concise and encouraging.";

    // Ensure system prompt is at the beginning
    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...messages.filter((m: any) => m.role !== "system") // Filter out any existing system messages from client to avoid duplication/override
    ];

    const payload = {
      model: "deepseek-chat",
      messages: fullMessages,
      temperature: 0.7, // Slightly higher for conversation
      stream: false 
    };

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Chat API Error:", errorText);
      throw new Error(`API Error: ${res.status}`);
    }

    const data = await res.json();
    const message = data.choices[0].message;

    return NextResponse.json(message);

  } catch (error) {
    console.error("Chat Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
