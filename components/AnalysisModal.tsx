"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
}

export function AnalysisModal({
  isOpen,
  onClose,
  text,
}: AnalysisModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    if (isOpen && text) {
      handleAnalyze();
    } else {
        setResult(null);
    }
  }, [isOpen, text]);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/analyze-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection: text,
          type: "sentence"
        })
      });

      if (!response.ok) throw new Error("Analysis failed");
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Analysis Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">
              智能语法分析 (AI Analysis)
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-slate-700 dark:text-slate-300 italic font-serif leading-relaxed">
              "{text}"
            </p>
          </div>

          {isLoading ? (
             <div className="flex flex-col items-center justify-center py-12">
               <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
               <p className="text-slate-500 text-sm animate-pulse">正在分析句子结构...</p>
             </div>
          ) : result ? (
            <div className="space-y-6">
              {/* Translation */}
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">中文翻译</h4>
                <p className="text-lg text-slate-900 dark:text-slate-100 font-medium">
                  {result.translation}
                </p>
              </div>

              {/* Grammar Analysis */}
              {result.grammar && (
                <div>
                   <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">语法结构</h4>
                   <div className="space-y-3">
                     {result.grammar.map((item: any, idx: number) => (
                       <div key={idx} className="flex gap-3">
                         <span className="shrink-0 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded uppercase h-fit mt-0.5">
                           {item.part}
                         </span>
                         <div>
                           <p className="text-slate-800 dark:text-slate-200 font-medium">{item.content}</p>
                           <p className="text-slate-500 dark:text-slate-400 text-sm">{item.explanation}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              )}

               {/* Key Vocabulary */}
               {result.vocabulary && result.vocabulary.length > 0 && (
                 <div>
                   <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">重点词汇</h4>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     {result.vocabulary.map((vocab: any, idx: number) => (
                       <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                         <div className="flex items-baseline gap-2 mb-1">
                           <span className="font-bold text-slate-900 dark:text-slate-100">{vocab.word}</span>
                           <span className="text-xs text-slate-500">{vocab.partOfSpeech}</span>
                         </div>
                         <p className="text-sm text-slate-600 dark:text-slate-400">{vocab.definition}</p>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              暂无分析结果
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
