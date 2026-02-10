"use client";

import { useState, useEffect, useRef } from "react";
import { ReactReader, IReactReaderStyle } from "react-reader";
import { useAppStore } from "@/lib/store";
import { Sparkles, X, Loader2, BookOpen, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DictionaryModal } from "./DictionaryModal";
import { DictionaryResult } from "@/types";
import { lookupLocal } from "@/lib/local-dictionary";
import { lookupWord } from "@/lib/dictionary";

interface EpubReaderProps {
  url: string;
  title?: string;
  initialLocation?: string | number;
  onLocationChange?: (loc: string | number) => void;
}

export function EpubReader({ url, title, initialLocation, onLocationChange }: EpubReaderProps) {
  const [location, setLocation] = useState<string | number>(initialLocation || 0);
  const [selection, setSelection] = useState<string | null>(null);
  const [rendition, setRendition] = useState<any>(null);
  
  // Analysis State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  
  // Dictionary State
  const [dictionaryResult, setDictionaryResult] = useState<DictionaryResult | null>(null);
  const [isDictionaryLoading, setIsDictionaryLoading] = useState(false);

  const addVocabulary = useAppStore((state) => state.addVocabulary);

  const onLocationChanged = (loc: string | number) => {
    setLocation(loc);
    if (onLocationChange) onLocationChange(loc);
  };

  const handleRendition = (rendition: any) => {
    setRendition(rendition);
    
    rendition.on('selected', (cfiRange: string, contents: any) => {
      rendition.getRange(cfiRange).then((range: Range) => {
        const text = range.toString().trim();
        if (text) {
          setSelection(text);
          // Don't auto-open sheet, wait for user to click button?
          // User requirement: "Fixed Bottom Bar ... slides up ONLY when text is selected."
          // "Content: A large button ... When clicked ... Open DictionaryModal"
          // So we set selection, which triggers the Bar to slide up.
        }
      });
    });

    // Clear selection when clicking elsewhere
    rendition.on('click', () => {
      setSelection(null);
      setIsSheetOpen(false);
    });
  };

  const handleAnalyze = async () => {
    if (!selection) return;
    
    setIsSheetOpen(true);
    setAnalysisResult(null);
    setIsAnalyzing(true);
    
    // Clear the selection in the book so the bar disappears? 
    // User said: "Capture selection -> Open Modal -> Clear selection"
    setSelection(null); 
    if (rendition) {
      rendition.getSelection().removeAllRanges();
    }

    try {
      const isWord = !selection.includes(" ");
      const type = isWord ? "word" : "sentence";

      // 1. Local Lookup (Instant)
      if (isWord) {
         const cleanWord = selection.toLowerCase().replace(/[^\w\s-]/g, "");
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

      // 2. API Analysis
      const response = await fetch("/api/analyze-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection: selection,
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
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-white dark:bg-slate-900 overflow-hidden">
      <ReactReader
        url={url}
        title={title}
        location={location}
        locationChanged={onLocationChanged}
        getRendition={handleRendition}
        loadingView={
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        }
      />

      {/* Sticky Action Bar */}
      <div 
        className={`fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-transform duration-300 z-40 ${selection ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="max-w-md mx-auto">
          <button 
            onClick={handleAnalyze} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-lg active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
          >
            <Sparkles className="w-5 h-5" />
            🤖 Analyze Selection (AI 分析)
          </button>
        </div>
      </div>

      {/* Analysis Result Sheet (Reused Design) */}
      <AnimatePresence>
        {isSheetOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] rounded-t-2xl z-50 border-t border-slate-100 dark:border-slate-800 max-h-[85vh] overflow-y-auto"
          >
             <div className="p-4 pb-8 md:max-w-4xl md:mx-auto relative">
                <button 
                   onClick={() => setIsSheetOpen(false)}
                   className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"
                 >
                   <X size={20} />
                 </button>
                
                {/* Handle Bar */}
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6" />

                {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                     <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                     <p className="text-slate-500 font-medium">Analyzing Selection...</p>
                  </div>
                )}

                {analysisResult && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {analysisResult.type === "word" ? (
                      <div className="space-y-4">
                         <div className="flex items-baseline gap-3">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                               {analysisResult.data.word}
                            </h3>
                            {analysisResult.data.phonetic && (
                              <span className="text-slate-500 font-mono">{analysisResult.data.phonetic}</span>
                            )}
                         </div>
                         <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-1">
                               {analysisResult.data.definition}
                            </p>
                         </div>
                         <button 
                           onClick={() => {
                             handleAddToNotebook(analysisResult.data);
                             setIsSheetOpen(false);
                           }}
                           className="w-full py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                         >
                           <BookOpen size={18} />
                           Save to Notebook
                         </button>
                      </div>
                    ) : (
                      <div className="space-y-5">
                         <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl border border-primary-100 dark:border-primary-900/30">
                            <h4 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-2">Translation</h4>
                            <p className="text-lg text-slate-800 dark:text-slate-200">
                               {analysisResult.data.translation}
                            </p>
                         </div>
                         <div>
                            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                               <GraduationCap size={16} />
                               Grammar
                            </h4>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                               {analysisResult.data.grammarExplanation}
                            </p>
                         </div>
                      </div>
                    )}
                  </div>
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
