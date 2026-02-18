"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { DictionaryResult, AIVocabulary } from "@/types";
import { lookupLocalDictionary, lookupExternalDictionary, lookupAiDictionary } from "../lib/dictionary";
import { calculateWordLevel, extractWords, WordMetadata, HighlightLevel } from "../lib/vocab-engine";
import phrasesData from "../lib/phrases-data.json";
import { DictionaryModal } from "./DictionaryModal";
import { WordCardModal } from "./WordCardModal";
import { useAppStore } from "@/lib/store";
import { Sparkles, Loader2, X, BookOpen, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic } from "@/lib/utils";

// ... (接口定义保持不变)
interface ImmersiveReaderProps {
  title: string;
  title_zh?: string;
  content: string;
  phrases?: string[];
  aiVocabulary?: AIVocabulary[];
  tags?: string[];
  topic?: string;
  wordCount?: number;
  createdAt?: string;
  difficulty?: string;
  onReadComplete?: () => void;
  id?: string;
}

export function ImmersiveReader({ 
  title, 
  title_zh, 
  content, 
  phrases: articlePhrases = [], 
  aiVocabulary = [], 
  tags = [],
  topic,
  wordCount, 
  createdAt, 
  difficulty,
  onReadComplete,
  id
}: ImmersiveReaderProps) {
  // ... (State 保持不变)
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [localResult, setLocalResult] = useState<DictionaryResult | null>(null);
  const [remoteResult, setRemoteResult] = useState<DictionaryResult | null>(null);
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Selection & Analysis State
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
  const [showWordCard, setShowWordCard] = useState(false);
  const [wordCardData, setWordCardData] = useState<DictionaryResult | null>(null);
  
  const [wordLevels, setWordLevels] = useState<Map<string, HighlightLevel>>(new Map());
  
  // ... (useMemo mergedResult 保持不变)
  const mergedResult = useMemo<DictionaryResult | null>(() => {
    if (!localResult && !remoteResult) return null;
    const baseWord = localResult?.word || remoteResult?.word || "";
    return {
      word: baseWord,
      phonetic: localResult?.phonetic || remoteResult?.phonetic,
      audio: remoteResult?.audio || localResult?.audio, // 优先用远程音频
      cnDefinition: localResult?.cnDefinition || remoteResult?.cnDefinition,
      meanings: remoteResult?.meanings || localResult?.meanings,
      examples: remoteResult?.examples || localResult?.examples,
      definition: localResult?.definition || remoteResult?.definition || "查询中...", // 优先显示本地
      example: remoteResult?.example || localResult?.example,
      exampleTranslation: remoteResult?.exampleTranslation || localResult?.exampleTranslation,
      tags: localResult?.tags || remoteResult?.tags,
      isAiGenerated: localResult?.isAiGenerated || remoteResult?.isAiGenerated,
      usage: remoteResult?.usage || localResult?.usage
    };
  }, [localResult, remoteResult]);

  // ... (useAppStore 和 useEffect 保持不变，直到 handleWordClick)
  const fontSize = useAppStore((state) => state.fontSize);
  const addVocabulary = useAppStore((state) => state.addVocabulary);
  const {
    dailyUsage,
    ensureDailyUsage,
    checkSentenceAnalysisQuota,
    isAdmin,
    articleReadProgress,
    updateArticleReadProgress,
    targetLevel,
    setTargetLevel,
    fetchTargetLevel
  } = useAppStore((state) => ({
    dailyUsage: state.dailyUsage,
    ensureDailyUsage: state.ensureDailyUsage,
    checkSentenceAnalysisQuota: state.checkSentenceAnalysisQuota,
    isAdmin: state.isAdmin,
    articleReadProgress: state.articleReadProgress,
    updateArticleReadProgress: state.updateArticleReadProgress,
    targetLevel: state.targetLevel,
    setTargetLevel: state.setTargetLevel,
    fetchTargetLevel: state.fetchTargetLevel
  }));

  useEffect(() => {
    fetchTargetLevel();
  }, [fetchTargetLevel]);
  const contentRef = useRef<HTMLDivElement>(null);
  const selectedWordRef = useRef<string | null>(null);
  const phraseCacheRef = useRef<Record<string, DictionaryResult>>({});
  const hasReadRef = useRef(false);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasRestoredScrollRef = useRef(false);

  // ... (Scroll logic 保持不变)
  // Scroll restoration
  useEffect(() => {
    // Reset restored flag when id changes
    hasRestoredScrollRef.current = false;
  }, [id]);

  useEffect(() => {
    // Restore scroll position when data is ready and id matches
    if (id && articleReadProgress[id] && !hasRestoredScrollRef.current) {
      // Use a small timeout to ensure content is rendered
      const timer = setTimeout(() => {
        window.scrollTo({
          top: articleReadProgress[id],
          behavior: "instant"
        });
        hasRestoredScrollRef.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [id, articleReadProgress]);

  // Save scroll position on unmount or id change
  useEffect(() => {
    return () => {
      if (id) {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        if (scrollTop > 0) {
          updateArticleReadProgress(id, scrollTop);
        }
      }
    };
  }, [id, updateArticleReadProgress]);

  // Scroll detection for read status
  useEffect(() => {
    const handleScroll = () => {
      if (hasReadRef.current || !onReadComplete) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Trigger when scrolled to 90%
      if (scrollTop + windowHeight >= documentHeight * 0.9) {
        hasReadRef.current = true;
        onReadComplete();
      }
    };

    window.addEventListener("scroll", handleScroll);
    // Check initial position in case content is short
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [onReadComplete]);

  useEffect(() => {
    selectedWordRef.current = selectedWord;
  }, [selectedWord]);

  useEffect(() => {
    ensureDailyUsage();
  }, [ensureDailyUsage]);

  const remainingSentence = Math.max(0, 15 - dailyUsage.sentenceAnalysisCount);
  const isSentenceSelection = Boolean(selectedText && selectedText.includes(" "));

  const normalizePhrase = useCallback(
    (phrase: string) =>
      phrase
        .replace(/\s+/g, " ")
        .replace(/sb\.s/gi, "sb.'s")
        .replace(/sb\.(?=\S)/gi, "sb. ")
        .replace(/sth\.(?=\S)/gi, "sth. ")
        .replace(/…/g, " ... ")
        .trim(),
    []
  );

  const buildPhraseRegex = useCallback((phrase: string) => {
    const normalized = normalizePhrase(phrase.toLowerCase());
    if (!normalized) return null;
    const tokens = normalized.split(" ");
    const tokenPattern = tokens
      .map((token) => {
        if (token === "sb." || token === "sb") return "[a-zA-Z'-]+";
        if (token === "sth." || token === "sth") return "[a-zA-Z'-]+";
        if (token === "sb.'s") return "[a-zA-Z'-]+(?:'s)?";
        if (token === "one's") return "[a-zA-Z'-]+(?:'s)?";
        if (token === "...") return "[a-zA-Z'-]+(?:\\s+[a-zA-Z'-]+){0,2}";
        return token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("\\s+");
    return new RegExp(`\\b${tokenPattern}\\b`, "gi");
  }, [normalizePhrase]);

  const phrases = useMemo(() => {
    const merged = [...phrasesData, ...articlePhrases]
      .map((p) => normalizePhrase(p))
      .filter(Boolean);
    return Array.from(new Set(merged));
  }, [articlePhrases, normalizePhrase]);

  useEffect(() => {
    const fetchLevels = async () => {
      if (!content) return;
      try {
        const uniqueWords = extractWords(content);
        if (uniqueWords.length === 0) {
          setWordLevels(new Map());
          return;
        }
        const cacheKey = `vocab-levels-v3-${id || "temp"}-${targetLevel || "ielts"}`;
        if (typeof window !== "undefined") {
          const cachedData = localStorage.getItem(cacheKey);
          if (cachedData) {
            try {
              const parsed = JSON.parse(cachedData) as [string, HighlightLevel][];
              setWordLevels(new Map(parsed));
            } catch (error) {
              console.error("Cache parse error", error);
            }
          }
        }
        const response = await fetch('/api/dictionary/levels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ words: uniqueWords })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch word levels:', errorText);
          return;
        }

        const data: WordMetadata[] = await response.json();
        const levelMap = new Map<string, HighlightLevel>();

        data.forEach(meta => {
          const level = calculateWordLevel(meta, targetLevel || "ielts");
          if (level > 0) {
            levelMap.set(meta.word.toLowerCase(), level);
          }
        });

        setWordLevels(levelMap);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(Array.from(levelMap.entries())));
          } catch (error) {
            console.error("Cache write error", error);
          }
        }
      } catch (error) {
        console.error('Error fetching word levels:', error);
      }
    };

    fetchLevels();
  }, [content, targetLevel]);

  // ... (phrases regex logic 保持不变)
  const phrasePatterns = useMemo(
    () =>
      phrases
        .map((phrase) => ({
          phrase,
          regex: buildPhraseRegex(phrase),
          length: phrase.length,
        }))
        .filter((item) => item.regex !== null)
        .sort((a, b) => b.length - a.length),
    [phrases, buildPhraseRegex]
  );

  const phraseMatches = useMemo(() => {
    if (!content || phrasePatterns.length === 0) return [];
    const occupied = new Array(content.length).fill(false);
    const matches: { start: number; end: number; text: string; phrase: string }[] = [];
    phrasePatterns.forEach((pattern) => {
      if (!pattern.regex) return;
      pattern.regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(content)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        let blocked = false;
        for (let idx = start; idx < end; idx += 1) {
          if (occupied[idx]) {
            blocked = true;
            break;
            }
        }
        if (blocked) continue;
        matches.push({ start, end, text: match[0], phrase: pattern.phrase });
        for (let idx = start; idx < end; idx += 1) occupied[idx] = true;
      }
    });
    matches.sort((a, b) => a.start - b.start);
    return matches;
  }, [content, phrasePatterns]);

  const phraseMatchMap = useMemo(() => {
    const map = new Map<number, (typeof phraseMatches)[number]>();
    phraseMatches.forEach((match) => map.set(match.start, match));
    return map;
  }, [phraseMatches]);

  useEffect(() => {
    const cached = localStorage.getItem("phrase_translation_cache_v1");
    if (cached) {
      try {
        phraseCacheRef.current = JSON.parse(cached);
      } catch {
        phraseCacheRef.current = {};
      }
    }
  }, []);

  // --- Handlers (重点修改部分) ---

  const handleWordClick = async (word: string) => {
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
    
    const cleanWord = word.toLowerCase().trim().replace(/[^\w\s-]/g, "");
    if (cleanWord.length > 0) {
      selectedWordRef.current = cleanWord;
      setSelectedWord(cleanWord);
      setHighlightedWord(word);
      setIsSheetOpen(false);
      setSelectedText(null);
      setLocalResult(null);
      setRemoteResult(null);
      setIsAiLoading(false);
      setIsRemoteLoading(true);

      void (async () => {
        try {
          const remote = await lookupExternalDictionary(cleanWord);
          if (selectedWordRef.current === cleanWord) {
            setRemoteResult(remote);
          }
        } catch (error) {
          console.error("External dictionary lookup failed:", error);
        } finally {
          if (selectedWordRef.current === cleanWord) {
            setIsRemoteLoading(false);
          }
        }
      })();

      try {
        const local = await lookupLocalDictionary(cleanWord);
        if (selectedWordRef.current === cleanWord) {
          if (local) {
            setLocalResult(local);
            setIsAiLoading(false);
          } else {
            // 立即设置一个临时的 AI 加载状态，触发骨架屏
            setLocalResult({
              word: cleanWord,
              definition: "", // 空定义
              isAiGenerated: true, // 标记为 AI，让 Modal 知道如何显示
            });
            setIsAiLoading(true);
            
            const aiResult = await lookupAiDictionary(cleanWord, targetLevel || "ielts");
            if (selectedWordRef.current === cleanWord) {
              if (aiResult) {
                setLocalResult(aiResult);
              } else {
                // AI 查询失败或无结果，可以保留骨架屏或显示错误
                setLocalResult({
                  word: cleanWord,
                  definition: "AI 查询失败或无结果",
                  isAiGenerated: true, // 保持 AI 标记
                });
              }
              setIsAiLoading(false);
            }
          }
        }
      } catch (error) {
        console.error("Dictionary lookup failed:", error);
        setIsAiLoading(false);
      }
    }
  };

  // ... (其他 handlers 保持不变)
  const buildPhraseContext = (start: number, end: number) => {
    const padding = 80;
    const left = Math.max(0, start - padding);
    const right = Math.min(content.length, end + padding);
    return content.slice(left, right);
  };

  const handlePhraseClick = async (phraseText: string, start: number, end: number) => {
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
    const cleanPhrase = phraseText.trim();
    if (!cleanPhrase) return;
    if (!/^[\x00-\x7F]+$/.test(cleanPhrase)) return;
    setSelectedWord(cleanPhrase);
    setHighlightedWord(cleanPhrase);
    setIsSheetOpen(false);
    setSelectedText(null);
    setLocalResult(null);
    setRemoteResult(null);
    setIsRemoteLoading(false);
    setIsAiLoading(false);

    const cacheKey = cleanPhrase.toLowerCase();
    const cached = phraseCacheRef.current[cacheKey];
    if (cached) {
      setLocalResult(cached);
      setRemoteResult(cached);
      return;
    }

    try {
      const response = await fetch("/api/analyze-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection: cleanPhrase,
          context: buildPhraseContext(start, end),
          type: "phrase",
        }),
      });

      if (!response.ok) throw new Error("Failed to analyze phrase");
      const data = await response.json();
      const result: DictionaryResult = {
        word: cleanPhrase,
        definition: data.definition,
        phonetic: data.phonetic,
        example: data.example,
        exampleTranslation: data.exampleTranslation,
        tags: data.tags || ["Phrase"],
        isAiGenerated: true,
        usage: data.usage,
      };
      phraseCacheRef.current[cacheKey] = result;
      localStorage.setItem("phrase_translation_cache_v1", JSON.stringify(phraseCacheRef.current));
      setLocalResult(result);
      setRemoteResult(result);
    } catch (error) {
      console.error("Phrase Analysis Error:", error);
    }
  };

  const handleSelection = useCallback(() => {
    if (isSheetOpen && analysisResult?.type === "word") return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    if (contentRef.current && selection.anchorNode && !contentRef.current.contains(selection.anchorNode)) {
      return;
    }
    const text = selection.toString().trim();
    if (text.length > 0) {
       setSelectedText(text);
       setIsSheetOpen(true);
       setAnalysisResult(null); 
       setIsAnalyzing(false);
    }
  }, [isSheetOpen, analysisResult]);

  useEffect(() => {
    const onSelectionChange = () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
      selectionTimeoutRef.current = setTimeout(() => {
         handleSelection();
      }, 600);
    };
    
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      if (selectionTimeoutRef.current) clearTimeout(selectionTimeoutRef.current);
    };
  }, [handleSelection]);

  const handleAnalyzeSelection = async () => {
    if (!selectedText) return;
    try {
      const isWord = !selectedText.includes(" ");
      const type = isWord ? "word" : "sentence";

      if (!isWord && !(await checkSentenceAnalysisQuota())) {
        return;
      }

      setIsAnalyzing(true);
      setAnalysisResult(null);

      if (isWord) {
        const cleanWord = selectedText.toLowerCase().replace(/[^\w\s-]/g, "");
        const result = await lookupLocalDictionary(cleanWord);
        if (result) {
           setAnalysisResult({
             type: "word",
             data: result
           });
           setIsAnalyzing(false);
           return;
        }
      }

      const response = await fetch("/api/analyze-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection: selectedText,
          type: type
        })
      });

      if (!response.ok) throw new Error("Analysis failed");
      
      const data = await response.json();
      setAnalysisResult({
        type: type,
        data: data
      });

    } catch (error) {
      console.error("Analysis Error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddToNotebook = (word: DictionaryResult) => {
    addVocabulary({
      id: Date.now().toString(),
      word: word.word,
      phonetic: word.phonetic,
      definition: word.definition,
      example: word.example,
      exampleTranslation: word.exampleTranslation,
      createdAt: new Date().toISOString(),
      reviewCount: 0,
      correctCount: 0,
    });
    setWordCardData(word);
    setSelectedWord(null);
    setLocalResult(null);
    setRemoteResult(null);
    setIsRemoteLoading(false);
    setIsAiLoading(false);
    setIsSheetOpen(false);
  };

  const closeModal = () => {
    setLocalResult(null);
    setRemoteResult(null);
    setIsRemoteLoading(false);
    setIsAiLoading(false);
    setSelectedWord(null);
    setHighlightedWord(null);
  };

  // ... (renderContent 保持不变)
  const renderContent = () => {
    if (!content) return <p className="text-slate-500 italic">No content available.</p>;
    
    let i = 0;
    const nodes: React.ReactNode[] = [];
    const isWordChar = (ch: string) => /\w/.test(ch);
    const boundaryAt = (pos: number) => pos <= 0 || pos >= content.length || !isWordChar(content[pos]);

    while (i < content.length) {
      const phraseMatch = phraseMatchMap.get(i);
      if (phraseMatch && boundaryAt(i - 1) && boundaryAt(i + phraseMatch.text.length)) {
        nodes.push(
          <span
            key={`phrase-${i}`}
            onClick={(e) => {
              e.stopPropagation();
              handlePhraseClick(phraseMatch.text, phraseMatch.start, phraseMatch.end);
            }}
            className="text-yellow-600 dark:text-yellow-300 border-b border-dashed border-yellow-400 dark:border-yellow-300 cursor-pointer transition-colors hover:text-yellow-700 dark:hover:text-yellow-200"
            title="点击查看短语释义"
          >
            {phraseMatch.text}
          </span>
        );
        i += phraseMatch.text.length;
        continue;
      }

      const ch = content[i];
      if (/[\s.,!?;:"'(){}\[\]]/.test(ch)) {
        nodes.push(<span key={`sym-${i}`}>{ch}</span>);
        i += 1;
        continue;
      }

      if (isWordChar(ch)) {
        const start = i;
        while (i < content.length && isWordChar(content[i])) i += 1;
        const word = content.slice(start, i);
        const lowerWord = word.toLowerCase();
        
        const isHighlighted = highlightedWord === word;
        const level = wordLevels.get(lowerWord) || 0;
        
        let className = "cursor-pointer rounded px-[1px] transition-colors ";
        className += "hover:bg-slate-200 dark:hover:bg-slate-700 ";

        if (isHighlighted) {
          className += "bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 ";
        } else if (level > 0) {
          // 这里虽然是动态类名，但因为我们在 globals.css 里移除了 @layer utilities，所以现在会生效了
          className += `word-level-${level} `;
        }

        nodes.push(
          <span
            key={`word-${start}`}
            onClick={(e) => {
              e.stopPropagation();
              handleWordClick(word);
            }}
            className={className}
          >
            {word}
          </span>
        );
        continue;
      }

      nodes.push(<span key={`char-${i}`}>{ch}</span>);
      i += 1;
    }
    
    return nodes;
  };

  return (
    // ... (JSX 返回部分保持不变，因为只改了逻辑和 CSS)
    <div className="relative min-h-screen bg-white dark:bg-slate-950 pb-20">
      {/* Level Selector */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <select
          value={targetLevel || 'ielts'}
          onChange={(e) => setTargetLevel(e.target.value)}
          className="bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm font-medium shadow-sm backdrop-blur text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <option value="zk">中考</option>
          <option value="gk">高考</option>
          <option value="cet4">四级</option>
          <option value="cet6">六级</option>
          <option value="ky">考研</option>
          <option value="ielts">雅思</option>
          <option value="toefl">托福</option>
        </select>
      </div>
      
      {/* ... (Header and Content UI keep same) */}
      <div className="mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map(tag => (
              <span key={tag} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {tag}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-slate-100 mb-2 leading-tight">
          {title}
        </h1>
        {title_zh && title_zh !== title && (
          <h2 className="text-xl md:text-2xl font-sans font-medium text-slate-500 dark:text-slate-400 mt-1">
            {title_zh}
          </h2>
        )}
        <div className="flex items-center gap-4 mt-4 text-sm text-slate-400">
          {difficulty && <span>{difficulty}</span>}
          <span>•</span>
          <span>{wordCount || 0} words</span>
          {createdAt && (
            <>
              <span>•</span>
              <span>{new Date(createdAt).toLocaleDateString()}</span>
            </>
          )}
        </div>
        
        <div className="mt-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          💡 阅读贴士： 文章已自动标记核心考点。<span className="text-purple-600 dark:text-purple-400 font-medium">颜色标注词汇</span>为等级核心词汇（本地词库，释义可能不全），<span className="text-amber-500 dark:text-amber-400 font-medium">金色下划线</span>为雅思/托福学术常用短语。
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          阅读
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
            💡 点击单词/框选句子以使用AI分析
        </span>
      </div>

      <div
        ref={contentRef}
        className="prose prose-slate prose-lg dark:prose-invert max-w-none md:leading-relaxed lg:leading-loose pb-32"
        style={{ 
          fontSize: `${fontSize}px`,
          fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
          lineHeight: '1.8'
        }}
      >
        <div 
          className="text-slate-800 dark:text-slate-200 text-lg md:text-xl tracking-wide whitespace-pre-wrap"
          style={{ fontFamily: 'inherit' }}
        >
          {renderContent()}
        </div>
      </div>

      {/* Bottom Sheet Action Bar */}
      <AnimatePresence>
        {isSheetOpen && selectedText && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100) setIsSheetOpen(false);
            }}
            className="fixed bottom-[60px] md:bottom-0 left-0 right-0 bg-white dark:bg-slate-900 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] rounded-t-2xl z-40 border-t border-slate-100 dark:border-slate-800 max-h-[80vh] flex flex-col"
          >
            {/* ... sheet content kept same ... */}
            <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing" onClick={() => setIsSheetOpen(false)}>
               <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>

            <div className="p-4 pb-8 md:max-w-4xl md:mx-auto overflow-y-auto">
              
              <div className="flex items-start justify-between mb-4">
                 <div className="flex-1 pr-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 italic border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                       &ldquo;{selectedText}&rdquo;
                    </p>
                    {isSentenceSelection && (
                      <div className="mt-2 text-xs text-slate-400">
                        {isAdmin ? "管理员无限配额模式 🚀" : `今日剩余配额：${remainingSentence}/15`}
                      </div>
                    )}
                 </div>
                 <button 
                   onClick={() => setIsSheetOpen(false)}
                   className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"
                 >
                   <X size={20} />
                 </button>
              </div>

              {!analysisResult && !isAnalyzing && (
                <button
                  onClick={() => {
                    triggerHaptic();
                    handleAnalyzeSelection();
                  }}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-transform active:scale-95 duration-100 touch-manipulation shadow-sm"
                >
                  <Sparkles size={18} />
                  Analyze This
                </button>
              )}

              {isAnalyzing && (
                <div className="space-y-4 py-4">
                   <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium animate-pulse">
                      <Loader2 className="animate-spin" />
                      Analyzing...
                   </div>
                   <div className="space-y-2">
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4 animate-pulse" />
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2 animate-pulse" />
                   </div>
                </div>
              )}

              {analysisResult && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {analysisResult.type === "word" ? (
                    // Word Result
                    <div className="space-y-4">
                       <div className="flex items-baseline gap-3">
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                             {analysisResult.data.word}
                          </h3>
                          {analysisResult.data.phonetic && (
                            <span className="text-slate-500 font-mono">{analysisResult.data.phonetic}</span>
                          )}
                       </div>
                       
                       <div className="flex flex-wrap gap-2">
                          {analysisResult.data.tags?.map((tag: string) => (
                             <span key={tag} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-full">
                                {tag}
                             </span>
                          ))}
                       </div>

                       <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                          <p className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-1">
                             {analysisResult.data.definition}
                          </p>
                       </div>

                       {analysisResult.data.example && (
                          <div className="space-y-2">
                             <p className="text-slate-700 dark:text-slate-300">
                                {analysisResult.data.example}
                             </p>
                             <p className="text-slate-500 dark:text-slate-400 text-sm">
                                {analysisResult.data.exampleTranslation}
                             </p>
                          </div>
                       )}

                       <button 
                         onClick={() => handleAddToNotebook(analysisResult.data)}
                         className="w-full py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                       >
                         <BookOpen size={16} />
                         Add to Notebook
                       </button>
                    </div>
                  ) : (
                    // Sentence Result
                    <div className="space-y-5">
                       {/* Translation */}
                       <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl border border-primary-100 dark:border-primary-900/30">
                          <h4 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-2">Translation</h4>
                          <p className="text-lg text-slate-800 dark:text-slate-200">
                             {analysisResult.data.translation}
                          </p>
                       </div>

                       {/* Grammar Analysis */}
                       <div>
                          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                             <GraduationCap size={16} />
                             Grammar Analysis
                          </h4>
                          
                          {/* SVO Structure if available */}
                          {analysisResult.data.structure && (
                             <div className="flex flex-wrap gap-2 mb-4 text-sm">
                                <span className="px-2 py-1 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                                   <b>S:</b> {analysisResult.data.structure.subject}
                                </span>
                                <span className="px-2 py-1 rounded bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
                                   <b>V:</b> {analysisResult.data.structure.verb}
                                </span>
                                <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                   <b>O:</b> {analysisResult.data.structure.object}
                                </span>
                             </div>
                          )}

                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                             {analysisResult.data.grammarExplanation}
                          </p>
                       </div>

                       {/* Vocabulary */}
                       {analysisResult.data.vocabulary && analysisResult.data.vocabulary.length > 0 && (
                          <div>
                             <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Key Vocabulary</h4>
                             <div className="flex flex-wrap gap-2">
                                {analysisResult.data.vocabulary.map((w: string) => (
                                   <span key={w} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm rounded-md border border-slate-200 dark:border-slate-700">
                                      {w}
                                   </span>
                                ))}
                             </div>
                          </div>
                       )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DictionaryModal
        result={mergedResult}
        localResult={localResult}
        remoteResult={remoteResult}
        isRemoteLoading={isRemoteLoading}
        isAiLoading={isAiLoading}
        currentWord={selectedWord || undefined}
        onClose={closeModal}
        onAddToNotebook={handleAddToNotebook}
        onOpenWordCard={(word) => {
          setWordCardData(word);
          setShowWordCard(true);
          setSelectedWord(null);
          setLocalResult(null);
          setRemoteResult(null);
          setIsRemoteLoading(false);
          setIsAiLoading(false);
        }}
      />

      <WordCardModal
        isOpen={showWordCard}
        onClose={() => setShowWordCard(false)}
        wordData={wordCardData}
      />
    </div>
  );
}
