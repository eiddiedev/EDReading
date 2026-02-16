"use client";

/**
 * 简易词典模态框组件 (SimpleDictionaryModal)
 * 作用：提供一个轻量级的单词查询界面，用于快速查看释义。
 * 定义：DictionaryModal 的简化版本，去除了一些复杂交互。
 * 逻辑：
 * 1. 接收单词作为输入。
 * 2. 调用字典 API 获取基础释义。
 * 3. 弹窗展示结果，关闭即销毁。
 */
import { useEffect, useState } from "react";
import { X, Plus, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { DictionaryResult } from "@/types";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";

interface SimpleDictionaryModalProps {
  result: DictionaryResult | null;
  isLoading?: boolean;
  onClose: () => void;
  onAddToNotebook: (word: DictionaryResult) => void;
}

export function SimpleDictionaryModal({
  result,
  isLoading = false,
  onClose,
  onAddToNotebook,
}: SimpleDictionaryModalProps) {
  const vocabulary = useAppStore((state) => state.vocabulary);
  const [isSaved, setIsSaved] = useState(false);

  // 监听结果变化，检查单词是否已经收藏过
  useEffect(() => {
    if (result) {
      const exists = vocabulary.some(v => v.word.toLowerCase() === result.word.toLowerCase());
      setIsSaved(exists);
    }
  }, [result, vocabulary]);

  // 只要有结果或者正在加载，就视为打开状态
  const isOpen = !!result || isLoading;

  const handleAddToNotebookAction = () => {
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

  // 渲染内容区域
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm animate-pulse">
            AI 正在查询...
          </p>
        </div>
      );
    }

    if (!result) return null;

    return (
      <>
        {/* 单词头部 */}
        <div className="mb-6">
          <div className="flex items-baseline gap-3 mb-2">
            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100">
              {result.word}
            </h2>
            {result.phonetic && (
              <span className="text-slate-500 dark:text-slate-400 font-mono text-lg">
                {result.phonetic}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
             {result.tags?.map(tag => (
               <span key={tag} className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                 {TAG_MAP[tag.toLowerCase()] || tag}
               </span>
             ))}
          </div>
        </div>

        {/* 释义与例句 */}
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              📖 释义
            </h3>
            <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
              {result.definition}
            </p>
          </div>

          {result.example && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                ✍️ 例句
              </h3>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-slate-700 dark:text-slate-300 italic mb-2 font-serif">
                  &quot;{result.example}&quot;
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

        {/* 底部操作按钮 */}
        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-700">
           <button
             onClick={handleAddToNotebookAction}
             disabled={isSaved}
             className={`w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 ${
               isSaved
                 ? "bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 cursor-default"
                 : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none"
             }`}
           >
             {isSaved ? (
               <>
                 <Check className="w-5 h-5" />
                 已在生词本
               </>
             ) : (
               <>
                 <Plus className="w-5 h-5" />
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
          {/* 1. 背景遮罩 (点击可关闭) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />

          {/* 2. 底部抽屉 - 无拖拽，纯点击关闭 */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-white dark:bg-slate-800 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] max-h-[85vh] flex flex-col border-t border-slate-100 dark:border-slate-700"
          >
            {/* 顶部视觉手柄 */}
            <div className="w-full flex justify-center pt-4 pb-2" onClick={onClose}>
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
            </div>

            {/* 关闭按钮 (右上角) - 确保可点击 */}
            <div className="absolute top-4 right-4 z-[80]">
               <button 
                 type="button"
                 onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); 
                    onClose(); 
                 }} 
                 className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition cursor-pointer"
               >
                 <X className="w-5 h-5" />
               </button>
            </div>

            {/* 内容滚动区域 */}
            <div className="p-6 overflow-y-auto pb-10 md:pb-6">
              {renderContent()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}