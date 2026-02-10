"use client";

import { useEffect, useRef, useState } from "react";
import { X, Plus, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { DictionaryResult } from "@/types";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

interface DictionaryModalProps {
  result: DictionaryResult | null;
  isLoading?: boolean;
  onClose: () => void;
  onAddToNotebook: (word: DictionaryResult) => void;
}

export function DictionaryModal({
  result,
  isLoading = false,
  onClose,
  onAddToNotebook,
}: DictionaryModalProps) {
  const vocabulary = useAppStore((state) => state.vocabulary);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (result) {
      const exists = vocabulary.some(v => v.word.toLowerCase() === result.word.toLowerCase());
      setIsSaved(exists);
    }
  }, [result, vocabulary]);

  const isOpen = !!result || isLoading;

  const handleAddToNotebook = () => {
    if (!result) return;
    if (isSaved) {
      toast.info("该单词已在您的生词本中");
      return;
    }

    const exists = vocabulary.some(v => v.word.toLowerCase() === result.word.toLowerCase());
    
    if (exists) {
      setIsSaved(true);
      toast.info("该单词已在您的生词本中");
      return;
    }

    onAddToNotebook(result);
    setIsSaved(true);
    toast.success("已加入生词本");
  };

  const TAG_MAP: Record<string, string> = {
    "noun": "名词", "verb": "动词", "adjective": "形容词", "adverb": "副词",
    "preposition": "介词", "conjunction": "连词", "article": "冠词",
    "academic": "学术", "core": "核心", "ielts": "雅思"
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm animate-pulse">
            正在查询...
          </p>
        </div>
      );
    }

    if (!result) return null;

    return (
      <>
        <div className="mb-4">
          <div className="flex items-baseline gap-3 mb-2">
            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100">
              {result.word}
            </h2>
            {result.phonetic && (
              <span className="text-slate-500 dark:text-slate-400 font-mono">
                {result.phonetic}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
             {result.tags?.map(tag => (
               <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                 {TAG_MAP[tag.toLowerCase()] || tag}
               </span>
             ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
              释义
            </h3>
            <p className="text-slate-700 dark:text-slate-300">
              {result.definition}
            </p>
          </div>

          {result.example && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                例句
              </h3>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                <p className="text-slate-700 dark:text-slate-300 italic mb-1">
                  "{result.example}"
                </p>
                {result.exampleTranslation && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {result.exampleTranslation}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
           <button
             onClick={handleAddToNotebook}
             disabled={isSaved}
             className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
               isSaved
                 ? "bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                 : "bg-primary-600 text-white hover:bg-primary-700 shadow-sm"
             }`}
           >
             {isSaved ? (
               <>
                 <Check className="w-4 h-4" />
                 已添加
               </>
             ) : (
               <>
                 <Plus className="w-4 h-4" />
                 加入生词本
               </>
             )}
           </button>
        </div>
      </>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 1. Backdrop (Darken background) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* 2. The Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info: PanInfo) => {
              if (info.offset.y > 100) onClose(); // Drag down > 100px to close
            }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] max-h-[85vh] flex flex-col border-t border-slate-100 dark:border-slate-700"
          >
            {/* Drag Handle (Visual Cue) */}
            <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing" onClick={onClose}>
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>

            {/* Content Container (Scrollable) */}
            <div className="p-6 overflow-y-auto pb-32 md:pb-10">
              {/* Close Button Row (Top Right) */}
              <div className="flex justify-end mb-2">
                 <button 
                   onClick={(e) => { e.stopPropagation(); onClose(); }} 
                   className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                 >
                   <X className="w-5 h-5" />
                 </button>
              </div>

              {renderContent()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
