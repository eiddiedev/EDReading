/**
 * 句子语法分析模态框，展示 AI 对选中句子的中文翻译、语法结构解析和重点词汇。
 */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { readStreamedJson } from "@/lib/stream-client";
import { getSentenceAnalysisPreview } from "@/lib/stream-preview";

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
  const [streamPreview, setStreamPreview] = useState("");
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const partialResult = getSentenceAnalysisPreview(streamPreview);

  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setResult(null);
    setStreamPreview("");
    try {
      const response = await fetch("/api/analyze-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection: text,
          type: "sentence"
        })
      });

      const data = await readStreamedJson<any>({
        response,
        onDelta: (chunk) => {
          setStreamPreview((prev) => prev + chunk);
        },
      });
      setResult(data);
    } catch (error) {
      console.error("Analysis Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [text]);

  useEffect(() => {
    if (isOpen && text) {
      handleAnalyze();
    } else {
        setResult(null);
        setStreamPreview("");
    }
  }, [isOpen, text, handleAnalyze]);

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
              智能句子分析
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
              &quot;{text}&quot;
            </p>
          </div>

          {isLoading ? (
             <div className="flex flex-col items-center justify-center py-12">
               <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
               <p className="text-slate-500 text-sm animate-pulse">正在分析句子结构...</p>
               {partialResult && (
                <div className="mt-4 w-full space-y-5 text-left">
                  {partialResult.translation && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">中文翻译</h4>
                      <p className="text-lg text-slate-900 dark:text-slate-100 font-medium">
                        {partialResult.translation}
                      </p>
                    </div>
                  )}

                  {(partialResult.structure || partialResult.grammarExplanation) && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">语法解析</h4>
                      <div className="space-y-3">
                        {partialResult.structure?.subject && (
                          <div className="flex gap-3">
                            <span className="shrink-0 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded uppercase h-fit mt-0.5">
                              S
                            </span>
                            <p className="text-slate-800 dark:text-slate-200 font-medium">{partialResult.structure.subject}</p>
                          </div>
                        )}
                        {partialResult.structure?.verb && (
                          <div className="flex gap-3">
                            <span className="shrink-0 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded uppercase h-fit mt-0.5">
                              V
                            </span>
                            <p className="text-slate-800 dark:text-slate-200 font-medium">{partialResult.structure.verb}</p>
                          </div>
                        )}
                        {partialResult.structure?.object && (
                          <div className="flex gap-3">
                            <span className="shrink-0 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded uppercase h-fit mt-0.5">
                              O
                            </span>
                            <p className="text-slate-800 dark:text-slate-200 font-medium">{partialResult.structure.object}</p>
                          </div>
                        )}
                      </div>
                      {partialResult.grammarExplanation && (
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-3">
                          {partialResult.grammarExplanation}
                        </p>
                      )}
                    </div>
                  )}

                  {partialResult.vocabulary && partialResult.vocabulary.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">重点词汇</h4>
                      <div className="flex flex-wrap gap-2">
                        {partialResult.vocabulary.map((word) => (
                          <span key={word} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm rounded-md border border-slate-200 dark:border-slate-700">
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {partialResult.importantPhrases && partialResult.importantPhrases.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">重要短语与地道表达</h4>
                      <div className="space-y-3">
                        {partialResult.importantPhrases.map((item, index) => (
                          <div key={`${item.phrase || "phrase"}-${index}`} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3">
                            {item.phrase && (
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {item.phrase}
                              </p>
                            )}
                            {item.localExpression && (
                              <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                                地道表达：{item.localExpression}
                              </p>
                            )}
                            {item.explanation && (
                              <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                                {item.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
               )}
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
              {(result.grammar || result.structure || result.grammarExplanation) && (
                <div>
                   <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">语法解析</h4>
                   {result.grammar ? (
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
                   ) : (
                     <div className="space-y-3">
                       {result.structure && (
                         <div className="flex flex-wrap gap-2 text-sm">
                           {result.structure.subject && (
                             <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold">
                               S: {result.structure.subject}
                             </span>
                           )}
                           {result.structure.verb && (
                             <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold">
                               V: {result.structure.verb}
                             </span>
                           )}
                           {result.structure.object && (
                             <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold">
                               O: {result.structure.object}
                             </span>
                           )}
                         </div>
                       )}
                       {result.grammarExplanation && (
                         <p className="text-slate-500 dark:text-slate-400 text-sm">
                           {result.grammarExplanation}
                         </p>
                       )}
                     </div>
                   )}
                </div>
              )}

               {/* Key Vocabulary */}
               {result.vocabulary && result.vocabulary.length > 0 && (
                 <div>
                   <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">重点词汇</h4>
                   {typeof result.vocabulary[0] === "string" ? (
                     <div className="flex flex-wrap gap-2">
                       {result.vocabulary.map((word: string) => (
                         <span key={word} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm rounded-md border border-slate-200 dark:border-slate-700">
                           {word}
                         </span>
                       ))}
                     </div>
                   ) : (
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
                   )}
                 </div>
               )}

               {result.importantPhrases && result.importantPhrases.length > 0 && (
                 <div>
                   <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">重要短语与地道表达</h4>
                   <div className="space-y-3">
                     {result.importantPhrases.map((item: any, idx: number) => (
                       <div key={`${item.phrase || "phrase"}-${idx}`} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3">
                         {item.phrase && (
                           <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                             {item.phrase}
                           </p>
                         )}
                         {item.localExpression && (
                           <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                             地道表达：{item.localExpression}
                           </p>
                         )}
                         {item.explanation && (
                           <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                             {item.explanation}
                           </p>
                         )}
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
