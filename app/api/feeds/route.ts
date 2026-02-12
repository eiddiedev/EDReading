import { NextResponse } from 'next/server';
import { batchTranslateTitles } from '@/lib/ai-processor';
import { checkContentSafety } from "@/lib/safety";

// Proxy to bypass firewalls and parse XML to JSON
const RSS2JSON = "https://api.rss2json.com/v1/api.json?rss_url=";

// The "All-Star" Source List
const SOURCES = [
  // --- 1. Guardian (User Favorites) ---
  { 
    name: "Guardian Football", 
    url: "https://www.theguardian.com/football/rss", 
    tag: "Sport ⚽", 
    level: "Relax" 
  },
  { 
    name: "Guardian Tech", 
    url: "https://www.theguardian.com/technology/rss", 
    tag: "AI & Tech 💻", 
    level: "Band 7" 
  },
  { 
    name: "Guardian Science", 
    url: "https://www.theguardian.com/science/rss", 
    tag: "Science 🧪", 
    level: "Band 8" 
  },

  // --- 2. Premium Academic (The "Big 5") ---
  { 
    name: "The Economist", 
    url: "https://www.economist.com/science-and-technology/rss.xml", 
    tag: "Logic 🧠", 
    level: "Band 9" 
  },
  { 
    name: "Nature", 
    url: "https://www.nature.com/nature.rss", 
    tag: "Academic 🧬", 
    level: "Band 9+" 
  },
  { 
    name: "New Scientist", 
    url: "https://www.newscientist.com/feed/home/", 
    tag: "Discovery 🚀", 
    level: "Band 7.5" 
  },
  { 
    name: "National Geographic", 
    url: "http://feeds.nationalgeographic.com/ng/News/News_Main", 
    tag: "Nature 🌿", 
    level: "Band 7" 
  },
  { 
    name: "Time Magazine", 
    url: "https://time.com/feed/", 
    tag: "World 🌍", 
    level: "Band 7" 
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
      // Rule: Take Top 2 from EVERY source.
      const limit = 2; 
      
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
            tags: [source.tag],
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
