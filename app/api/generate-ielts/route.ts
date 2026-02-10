import { NextResponse } from 'next/server';

// 1. Define the "IELTS Topic Deck" (The Big 6 Categories)
const TOPICS = [
  "Environmental Science (Climate Change, Recycling, Ecosystems)",
  "Ancient History & Archaeology (Civilizations, Artifacts)",
  "Psychology & Sociology (Behavior, Urban Life, Education)",
  "Biology & Medicine (Health, Genetics, Zoology)",
  "Architecture & Engineering (Bridges, Skyscrapers, Design)",
  "Astronomy & Space (Planets, Space Exploration)"
];

export async function POST(req: Request) {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;
  const baseUrl = process.env.DEEPSEEK_API_KEY 
    ? "https://api.deepseek.com" 
    : (process.env.AI_BASE_URL || "https://api.deepseek.com");

  if (!apiKey) {
    console.warn("⚠️ Missing API Key. Returning MOCK data for demonstration.");
    
    // Mock Response for Demo/Testing without Cost
    return NextResponse.json({
        title: "The Future of Urban Vertical Farming",
        title_zh: "城市垂直农业的未来 (演示模式)",
        content: `As urbanization accelerates and the global population swells, traditional agriculture faces unprecedented challenges. Vertical farming, the practice of growing crops in vertically stacked layers, has emerged as a promising solution to food security and environmental sustainability. Unlike conventional farming, which requires vast tracts of arable land, vertical farming utilizes controlled-environment agriculture (CEA) technology to optimize plant growth in skyscrapers, shipping containers, and repurposed warehouses.

One of the primary advantages of vertical farming is its independence from weather conditions. By regulating temperature, light, and humidity, farmers can produce crops year-round, significantly increasing yield. For instance, a single acre of vertical farm can produce as much food as 10 to 20 acres of traditional farmland. Furthermore, these systems often employ hydroponics or aeroponics, using up to 95% less water than soil-based farming. This efficiency is crucial in regions plagued by drought or water scarcity.

However, the industry is not without its critics. The high energy consumption required for artificial lighting and climate control remains a significant barrier to economic viability. While LED technology has become more efficient, the carbon footprint of vertical farms can still be higher than that of field-grown produce transported over long distances. Critics argue that until renewable energy sources become more accessible and affordable, the environmental benefits of vertical farming may be overstated.

Despite these challenges, investment in the sector continues to grow. Innovations in automation and robotics are reducing labor costs, while advancements in renewable energy integration promise to make vertical farming more sustainable. As cities become denser, the ability to grow fresh produce within the urban core—reducing "food miles" and ensuring freshness—may well define the future of food production.`,
        difficulty: "Band 7.0",
        tags: ["Environment", "Technology", "Demo"],
        analysis: "MOCK_ANALYSIS_SKIPPED"
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { topicPrompt, difficulty } = body;

    // 2. Determine Topic (User Selected vs Random)
    let selectedTopic = topicPrompt;
    
    // If no specific topic provided (or "Random" requested), pick one
    if (!selectedTopic || selectedTopic === 'Random') {
        selectedTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    }

    // Determine Difficulty (Default to Band 7.0 if not provided)
    const selectedBand = difficulty || "7.0";
    const selectedDifficulty = `Band ${selectedBand}`;

    console.log(`🎲 Generating: ${selectedTopic} @ ${selectedDifficulty}`);

    // Dynamic Prompt Construction
    const getLevelInstruction = (band: string) => { 
      if (band === '6.0') return "Use common academic vocabulary (AVL). Keep sentences moderate in length. Focus on clarity."; 
      if (band === '7.0') return "Use a flexible range of vocabulary. Use a variety of complex structures. Occasional sophisticated words but prioritize natural collocation."; 
      if (band === '8.0') return "Use sophisticated, abstract vocabulary. Use complex, nuanced grammatical structures fully naturally. Write like a native academic."; 
      return "Use a flexible range of vocabulary. Use a variety of complex structures."; 
    };

    // 3. Construct the Strict Prompt
    const systemPrompt = `You are an IELTS Reading Passage Generator & Expert Tutor. 
    **Target Band Level:** IELTS ${selectedBand} 
    **Style Guide:** ${getLevelInstruction(selectedBand)} 
    
    **Task:**
    1. Write a reading passage about "${selectedTopic}". Length: 400-500 words.
    2. Analyze the passage immediately to extract learning materials.

    **MANDATORY SETTINGS:**
    - **Topic:** ${selectedTopic}
    - **Difficulty:** ${selectedDifficulty}
    
    **OUTPUT FORMAT:**
    Return a STRICT JSON object with the following fields (No markdown):
    {
      "title": "English Title",
      "title_zh": "Simplified Chinese Title (Engaging)",
      "content": "Full article text...",
      "difficulty": "${selectedDifficulty}",
      "tags": ["${selectedTopic.split(' ')[0]}", "Academic", "IELTS"],
      
      "phrases": ["idiom 1", "collocation 2", "phrase 3"], 
      // Extract 5-8 key IELTS idioms/collocations

      "vocabulary": [
        {
          "word": "word",
          "phonetic": "/IPA/",
          "definition": "Simplified Chinese Definition",
          "example": "English example sentence",
          "exampleTranslation": "Chinese translation of example",
          "tags": ["雅思核心", "Topic Related"]
        }
      ],
      // Extract 5-8 key complex words. DEFINITIONS MUST BE IN SIMPLIFIED CHINESE.

      "sentences": [
         {
           "original": "Complex sentence from text...",
           "translation": "Chinese translation",
           "structure": "Grammar analysis in Simplified Chinese"
         }
      ]
      // Analyze 2-3 complex sentences. STRUCTURE ANALYSIS MUST BE IN SIMPLIFIED CHINESE.
    }`;

    const controller = new AbortController();
    // 90s timeout for long content generation
    const timeoutId = setTimeout(() => controller.abort(), 90000);

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
            { role: "system", content: systemPrompt },
            { role: "user", content: "Generate a new IELTS reading passage." },
          ],
          temperature: 1.2,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        // Handle 504 specifically
        if (response.status === 504) {
             throw new Error("AI Service Timed Out");
        }
        return NextResponse.json(
          { error: `AI API Error: ${response.status} - ${errorText}` },
          { status: 500 }
        );
      }

      const data = await response.json();
      let content = data.choices[0].message.content;
      
      // Clean up markdown code blocks if present
      content = content.replace(/```json/g, "").replace(/```/g, "").trim();
      
      try {
        const result = JSON.parse(content);
        
        // Enhance result with server-side determined fields
        const finalResult = {
          ...result,
          title: result.title, // Keep English as main title
          title_zh: result.title_zh, // Keep Chinese as subtitle
          topic: selectedTopic,
          // Ensure tags exist
          tags: result.tags || [selectedTopic.split(' ')[0], "Academic"]
        };

        return NextResponse.json(finalResult);
      } catch (e) {
        console.error("Failed to parse AI response:", content);
        return NextResponse.json(
          { error: "Failed to parse AI response" },
          { status: 500 }
        );
      }

    } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
            console.error("AI Request Timed Out (Client Side 90s limit)");
            return NextResponse.json({ error: "AI 生成超时 (90s)。请稍后再试或检查网络。" }, { status: 504 });
        }
        throw fetchError;
    }

  } catch (error) {
    console.error("generate-ielts failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
