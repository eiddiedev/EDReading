import { NextResponse } from 'next/server';
import { batchTranslateTitles } from '@/lib/ai-processor';
import { checkContentSafety } from "@/lib/safety";

// Proxy to bypass firewalls and parse XML to JSON
const RSS2JSON = "https://api.rss2json.com/v1/api.json?rss_url=";

// The "All-Star" Source List
const SOURCES = [
  // --- 1. High Level (IELTS/TOEFL/Postgrad High) ---
  { 
    name: "The Economist", 
    url: "https://www.economist.com/science-and-technology/rss.xml", 
    tag: "Politics & Econ 🧠", 
    level: "IELTS/TOEFL/Postgrad" 
  },
  { 
    name: "The Atlantic", 
    url: "https://www.theatlantic.com/feed/all/", 
    tag: "Culture & Soc 🌍", 
    level: "IELTS/TOEFL/Postgrad" 
  },
  { 
    name: "Nature", 
    url: "https://www.nature.com/nature.rss", 
    tag: "Academic 🧬", 
    level: "IELTS/TOEFL/Postgrad" 
  },
  { 
    name: "Scientific American", 
    url: "http://rss.sciam.com/ScientificAmerican-Global", 
    tag: "Science 🧪", 
    level: "IELTS/TOEFL/Postgrad" 
  },

  // --- 2. Medium Level (CET-4/6/Postgrad Mid) ---
  { 
    name: "New Scientist", 
    url: "https://www.newscientist.com/feed/home/", 
    tag: "Pop Science 🚀", 
    level: "CET-4/6/Postgrad" 
  },
  { 
    name: "Time Magazine", 
    url: "https://time.com/feed/", 
    tag: "World News 📰", 
    level: "CET-4/6/Postgrad" 
  },
  { 
    name: "The Guardian", 
    url: "https://www.theguardian.com/world/rss", 
    tag: "General", 
    level: "CET-4/6/Postgrad" 
  },
  { 
    name: "CS Monitor", 
    url: "https://rss.csmonitor.com/feeds/world", 
    tag: "Neutral ⚖️", 
    level: "CET-4/6/Postgrad" 
  },

  // --- 3. Basic Friendly (CET-4/Entry) ---
  { 
    name: "BBC Learning English", 
    url: "https://feeds.bbci.co.uk/learningenglish/english/features/6-minute-english/rss", 
    tag: "Learning 🎧", 
    level: "Basic/CET-4" 
  },
  { 
    name: "Breaking News English", 
    url: "https://breakingnewsenglish.com/rss.xml", 
    tag: "Graded News 📚", 
    level: "Basic/CET-4" 
  },
  { 
    name: "China Daily", 
    url: "http://www.chinadaily.com.cn/rss/china_rss.xml", 
    tag: "Domestic", 
    level: "Basic/CET-4" 
  }
];

export async function GET() {
  try {
    // 1. Parallel Fetching
    const requests = SOURCES.map(src => 
      fetch(`${RSS2JSON}${encodeURIComponent(src.url)}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => ({ source: src, items: data?.items || [] }))
        .catch(err => {
            console.error(`Failed to fetch ${src.url}`, err);
            return { source: src, items: [] };
        }) 
    );

    const results = await Promise.all(requests);

    // 2. Mix & Filter
    let mixedFeed: any[] = [];
    
    results.forEach(({ source, items }) => {
      // Rule: Take Top 2-3 from EVERY source.
      const limit = 3; 
      
      const topItems = items.slice(0, limit).map((item: any) => {
          // Get clean description
          const rawDescription = item.description 
              ? item.description.replace(/<[^>]*>?/gm, '').slice(0, 100) + "..." 
              : `Recommended for ${source.tag} reading practice.`;
          
          // Use Original English Title initially
          const originalTitle = item.title;
          // Keep Description in English
          const finalReason = rawDescription; 

          return {
            title: originalTitle,
            url: item.link,
            date: item.pubDate,
            sourceName: source.name,
            difficulty: source.level,
            tags: [source.name], // Use Source Name instead of Topic Tag
            reason: finalReason // English Description
          };
      });
      mixedFeed = [...mixedFeed, ...topItems];
    });

    // 3. AI Translation (Batch)
    const titlesToTranslate = mixedFeed.map(item => item.title);
    if (titlesToTranslate.length > 0) {
        const translations = await batchTranslateTitles(titlesToTranslate);
        mixedFeed.forEach(item => {
            if (translations[item.title]) {
                item.title = translations[item.title];
            }
        });
    }

    mixedFeed = mixedFeed.filter(item => {
      const titleCheck = checkContentSafety(item.title);
      return titleCheck.isSafe;
    });

    // 4. Shuffle (Fisher-Yates) 
    for (let i = mixedFeed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mixedFeed[i], mixedFeed[j]] = [mixedFeed[j], mixedFeed[i]];
    }

    return NextResponse.json({ items: mixedFeed });

  } catch (error) {
    console.error("Feed Error:", error);
    return NextResponse.json({ items: [] });
  }
}
