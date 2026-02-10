"use client";

import { useState, useRef, useEffect } from "react";
import { DictionaryResult, AIVocabulary } from "@/types";
import { lookupWord, analyzeSentence } from "@/lib/dictionary";
import { lookupLocal } from "@/lib/local-dictionary";
import { DictionaryModal } from "./DictionaryModal";
import { WordCardModal } from "./WordCardModal";
import { useAppStore } from "@/lib/store";
import { Sparkles, Loader2, X, BookOpen, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImmersiveReaderProps {
  title: string;
  title_zh?: string;
  content: string;
  phrases?: string[];
  aiVocabulary?: AIVocabulary[];
  tags?: string[];
  wordCount?: number;
  createdAt?: string;
  difficulty?: string;
}

export function ImmersiveReader({ 
  title, 
  title_zh, 
  content, 
  phrases: articlePhrases = [], 
  aiVocabulary = [], 
  tags = [], 
  wordCount, 
  createdAt, 
  difficulty 
}: ImmersiveReaderProps) {
  // State
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [dictionaryResult, setDictionaryResult] = useState<DictionaryResult | null>(null);
  const [isDictionaryLoading, setIsDictionaryLoading] = useState(false);
  
  // Selection & Analysis State
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
  const [showWordCard, setShowWordCard] = useState(false);
  const [wordCardData, setWordCardData] = useState<DictionaryResult | null>(null);
  
  const fontSize = useAppStore((state) => state.fontSize);
  const addVocabulary = useAppStore((state) => state.addVocabulary);
  const contentRef = useRef<HTMLDivElement>(null);
  const selectedWordRef = useRef<string | null>(null);

  // Sync ref with state for async checks
  useEffect(() => {
    selectedWordRef.current = selectedWord;
  }, [selectedWord]);

  // Default phrases (keeping them as base)
  const defaultPhrases = [
    "account for", "lead to", "result in", "be responsible for", "contribute to",
    "cope with", "come up with", "as well as", "in terms of", "due to",
    "in addition to", "according to", "artificial intelligence", "climate change",
    "machine learning", "global warming", "sea level", "sea levels",
    "weather patterns", "play a role", "take into account", "focus on",
    "depend on", "rely on", "carry out", "make up", "turn out",
    "set up", "give up", "look for", "look forward to", "participate in",
    "succeed in", "make predictions", "melting ice caps",
  ];

  // Merge phrases
  const phrases = Array.from(new Set([...defaultPhrases, ...articlePhrases]));

  // --- Handlers ---

  // Handle single word click (Existing functionality - Instant lookup)
  const handleWordClick = async (word: string) => {
    // 保留空格和连字符，只移除标点符号
    const cleanWord = word.toLowerCase().trim().replace(/[^\w\s-]/g, "");
    if (cleanWord.length > 0) {
      setSelectedWord(cleanWord);
      setHighlightedWord(word);
      // Close selection sheet if open
      setIsSheetOpen(false); 
      setSelectedText(null);

      // 1. Check AI Vocabulary first (In-Memory)
      const aiWord = aiVocabulary.find(v => v.word.toLowerCase() === cleanWord);
      if (aiWord) {
        setDictionaryResult({
          word: aiWord.word,
          definition: aiWord.definition || aiWord.translation,
          phonetic: aiWord.phonetic,
          example: aiWord.example || aiWord.context_meaning,
          exampleTranslation: aiWord.exampleTranslation,
          tags: aiWord.tags || ["AI Context"],
          isAiGenerated: true
        });
        setIsDictionaryLoading(false);
        return;
      }

      // 2. Check Local Dictionary (Synchronous / Instant)
      const localResult = lookupLocal(cleanWord);
      if (localResult) {
        console.log("⚡ Instant lookup (Client-Side) for:", cleanWord);
        setDictionaryResult({
          word: localResult.text,
          definition: localResult.definition,
          phonetic: localResult.phonetic,
          tags: localResult.tags,
          example: localResult.example,
          exampleTranslation: localResult.translation,
          isAiGenerated: false
        });
        setIsDictionaryLoading(false);
        return;
      }

      // 3. Check Browser Memory (localStorage Cache)
      const cacheKey = `dictionary_cache_${cleanWord}`;
      const cachedResult = localStorage.getItem(cacheKey);
      if (cachedResult) {
        try {
          const parsed = JSON.parse(cachedResult);
          setDictionaryResult(parsed);
          setIsDictionaryLoading(false);
          return;
        } catch (e) {
          console.error("Cache parse error:", e);
        }
      }

      // 4. Fallback to Async Lookup (AI / API)
      setIsDictionaryLoading(true);
      setDictionaryResult(null); 
      
      try {
        const result = await lookupWord(cleanWord);
        if (result && selectedWordRef.current === cleanWord) {
          setDictionaryResult(result);
          localStorage.setItem(cacheKey, JSON.stringify(result));
        }
      } catch (error) {
        console.error("Dictionary lookup failed:", error);
      } finally {
        setIsDictionaryLoading(false);
      }
    }
  };

  // Handle text selection (New Feature)
  const handleSelection = () => {
    // 1. Get Selection
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (text.length > 0) {
       setSelectedText(text);
       setIsSheetOpen(true);
       setAnalysisResult(null); 
       setIsAnalyzing(false);
    }
  };

  // Add event listener for selectionchange to handle mobile selection handles better
  useEffect(() => {
    const onSelectionChange = () => {
      // Debounce or wait for selection to settle?
      // On mobile, selection changes as user drags handles.
      // We might want to wait until they stop? 
      // Actually, 'selectionchange' fires continuously.
      // 'touchend' on the container is already handled below.
    };
    
    // document.addEventListener('selectionchange', onSelectionChange);
    // return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  const handleAnalyzeSelection = async () => {
    if (!selectedText) return;
    
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // 1. Determine Type
      const isWord = !selectedText.includes(" ");
      const type = isWord ? "word" : "sentence";

      // 2. Local Check for Word
      if (isWord) {
        const cleanWord = selectedText.toLowerCase().replace(/[^\w\s-]/g, "");
        const localResult = lookupLocal(cleanWord);
        if (localResult) {
           setAnalysisResult({
             type: "word",
             data: {
               word: localResult.text,
               definition: localResult.definition,
               phonetic: localResult.phonetic,
               tags: localResult.tags,
               example: localResult.example,
               exampleTranslation: localResult.translation,
             }
           });
           setIsAnalyzing(false);
           return;
        }
      }

      // 3. API Request
      const response = await fetch("/api/analyze-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection: selectedText,
          // context: "...", // Could grab surrounding text if needed
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
      // Show error state in sheet?
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
    
    // Trigger Word Card
    setWordCardData(word);
    setSelectedWord(null); // Close Dictionary Modal (it uses selectedWord !== null)
    setIsSheetOpen(false); // Close action sheet
    setShowWordCard(true);
  };

  const closeModal = () => {
    setDictionaryResult(null);
    setSelectedWord(null);
    setHighlightedWord(null);
  };

  // --- Render Helpers ---

  const renderContent = () => {
    if (!content) return <p className="text-slate-500 italic">No content available.</p>;
    
    const lower = content.toLowerCase();
    let i = 0;
    const nodes: React.ReactNode[] = [];
    const isWordChar = (ch: string) => /\w/.test(ch);
    const boundaryAt = (pos: number) => pos <= 0 || pos >= content.length || !isWordChar(content[pos]);

    while (i < content.length) {
      // Phrase matching
      let matchedPhrase: string | null = null;
      const lowerSlice = lower.substr(i); // Slice rest of string for efficient checking
      
      for (const p of phrases) {
        if (lowerSlice.startsWith(p) && boundaryAt(i - 1) && boundaryAt(i + p.length)) {
          // Double check exact case match if needed, but usually case-insensitive is better
          // Prefer longest match? 
          // Currently just takes first one.
          // Let's sort phrases by length desc in useEffect to ensure longest match wins
          matchedPhrase = content.substr(i, p.length);
          break;
        }
      }

      if (matchedPhrase) {
        nodes.push(
          <span
            key={`phrase-${i}`}
            onClick={(e) => { e.stopPropagation(); handleWordClick(matchedPhrase!); }}
            className="bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-100 rounded px-1.5 py-0.5 mx-0.5 font-medium border-b-2 border-yellow-400 dark:border-yellow-600 cursor-pointer transition-colors hover:bg-yellow-300 dark:hover:bg-yellow-900/70"
            title="点击查看短语详情"
          >
            {matchedPhrase}
          </span>
        );
        i += matchedPhrase.length;
        continue;
      }

      const ch = content[i];
      if (/[\s.,!?;:"'(){}\[\]]/.test(ch)) {
        // Punctuation and spaces
        nodes.push(<span key={`sym-${i}`}>{ch}</span>);
        i += 1;
        continue;
      }

      if (isWordChar(ch)) {
        const start = i;
        while (i < content.length && isWordChar(content[i])) i += 1;
        const word = content.slice(start, i);
        const isHighlighted = highlightedWord === word;
        const isAiVocab = aiVocabulary.some(v => v.word.toLowerCase() === word.toLowerCase());

        nodes.push(
          <span
            key={`word-${start}`}
            onClick={(e) => { e.stopPropagation(); handleWordClick(word); }}
            className={`cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded px-0.5 transition-colors ${
              isHighlighted ? "bg-primary-200 dark:bg-primary-800" : ""
            } ${isAiVocab ? "font-bold text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-200 dark:border-emerald-800" : ""}`}
            title={isAiVocab ? "重点词汇 (点击查看)" : undefined}
          >
            {word}
          </span>
        );
        continue;
      }

      // Any other chars (should be rare)
      nodes.push(<span key={`char-${i}`}>{ch}</span>);
      i += 1;
    }
    return nodes;
  };

  return (
    <div className="w-full relative">
      {/* Article Header */}
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
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          阅读
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
           💡 选中文字以使用AI分析
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
        onMouseUp={handleSelection}
        onTouchEnd={(e) => {
           // On mobile, touchend fires before selection is fully finalized by the OS in some cases.
           // We add a small delay to let the OS selection update.
           setTimeout(handleSelection, 100);
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
            <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing" onClick={() => setIsSheetOpen(false)}>
               <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>

            <div className="p-4 pb-8 md:max-w-4xl md:mx-auto overflow-y-auto">
              
              <div className="flex items-start justify-between mb-4">
                 <div className="flex-1 pr-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 italic border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                       "{selectedText}"
                    </p>
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
                  onClick={handleAnalyzeSelection}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
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
        result={dictionaryResult}
        isLoading={isDictionaryLoading}
        onClose={closeModal}
        onAddToNotebook={handleAddToNotebook}
      />

      <WordCardModal
        isOpen={showWordCard}
        onClose={() => setShowWordCard(false)}
        wordData={wordCardData}
      />
    </div>
  );
}
