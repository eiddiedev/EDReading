"use client";

/**
 * 词典模态框组件 (DictionaryModal)
 * 作用：在阅读过程中提供单词查询、发音播放、例句展示及添加到生词本的功能。
 * 定义：包含单词定义、音标、例句、翻译等多维度的词汇信息展示界面。
 * 逻辑：
 * 1. 接收查询词汇，调用词典 API 获取详情。
 * 2. 展示音标、释义、例句等信息。
 * 3. 提供添加到生词本的交互，支持状态反馈（加载中、已添加）。
 */
import { useEffect, useState } from "react";
import { Plus, X, Loader2, Check, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { DictionaryResult } from "@/types";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence, PanInfo, useDragControls } from "framer-motion";

interface DictionaryModalProps {
  result: DictionaryResult | null;
  isLoading?: boolean;
  onClose: () => void;
  onAddToNotebook: (word: DictionaryResult) => void;
  onOpenWordCard?: (word: DictionaryResult) => void;
  disableDrag?: boolean;
}

export function DictionaryModal({
  result,
  isLoading = false,
  onClose,
  onAddToNotebook,
  onOpenWordCard,
  disableDrag = false,
}: DictionaryModalProps) {
  const vocabulary = useAppStore((state) => state.vocabulary);
  const [isSaved, setIsSaved] = useState(false);
  const dragControls = useDragControls();

  // 监听结果变化，检查单词是否已经收藏过
  useEffect(() => {
    if (result) {
      const exists = vocabulary.some(v => v.word.toLowerCase() === result.word.toLowerCase());
      setIsSaved(exists);
    }
  }, [result, vocabulary]);

  // 自动播放发音
  useEffect(() => {
    if (result?.audio) {
      const audio = new Audio(result.audio);
      audio.play().catch(() => {
        // 忽略自动播放失败（通常是因为用户没有交互）
      });
    }
  }, [result]);

  const handlePlayAudio = () => {
    if (result?.audio) {
      const audio = new Audio(result.audio);
      audio.play().catch(e => console.error("Play failed", e));
    }
  };

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

    const hasMeanings = result.meanings && result.meanings.length > 0;

    return (
      <>
        {/* 单词头部 (可拖拽区域) */}
        <div 
          className="mb-6 touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => {
            if (!disableDrag) dragControls.start(e);
          }}
        >
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100">
              {result.word}
            </h2>
            
            {result.audio && (
              <button 
                onClick={(e) => { e.stopPropagation(); handlePlayAudio(); }}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300"
                aria-label="Play pronunciation"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            )}

            {result.phonetic && (
              <span className="text-slate-500 dark:text-slate-400 font-mono text-lg">
                {result.phonetic}
              </span>
            )}
          </div>
          
          {/* 中文简明翻译 */}
          {result.cnDefinition && (
            <p className="text-lg text-slate-700 dark:text-slate-300 font-medium mb-3">
              {result.cnDefinition}
            </p>
          )}
          
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
          {hasMeanings ? (
            <div className="space-y-6">
              {result.meanings!.map((meaning, idx) => (
                <div key={idx} className="border-b border-slate-100 dark:border-slate-700 last:border-0 pb-4 last:pb-0">
                  <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-bold mb-3 italic">
                    {meaning.partOfSpeech}
                  </span>
                  <ul className="space-y-4">
                    {meaning.definitions.map((def, dIdx) => (
                      <li key={dIdx} className="text-slate-700 dark:text-slate-300">
                        <p className="leading-relaxed font-medium">{def.definition}</p>
                        {def.example && (
                          <p className="mt-1 text-slate-500 dark:text-slate-400 text-sm italic pl-4 border-l-2 border-slate-200 dark:border-slate-600">
                            &ldquo;{def.example}&rdquo;
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                📖 释义
              </h3>
              <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                {result.definition}
              </p>
            </div>
          )}

          {/* 精选例句 (新) */}
          {result.examples && result.examples.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                ✍️ 精选例句
              </h3>
              <div className="space-y-3">
                {result.examples.map((ex, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                    <p className="text-slate-700 dark:text-slate-300 italic font-serif">
                      &ldquo;{ex.sentence}&rdquo;
                    </p>
                    {ex.translation && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {ex.translation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 兼容旧例句 */}
          {!result.examples && result.example && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                ✍️ 例句
              </h3>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-slate-700 dark:text-slate-300 italic mb-2 font-serif">
                  &ldquo;{result.example}&rdquo;
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
        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
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

           {isSaved && onOpenWordCard && (
             <button
               onClick={() => onOpenWordCard(result)}
               className="w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
             >
               <Sparkles className="w-5 h-5" />
               生成记忆卡片
             </button>
           )}
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

          {/* 2. 底部抽屉 (支持拖拽关闭) */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            drag={disableDrag ? false : "y"}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={disableDrag ? undefined : { top: 0 }}
            dragElastic={disableDrag ? undefined : 0.2}
            onDragEnd={disableDrag ? undefined : (e, info: PanInfo) => {
              // 如果向下拉动超过 100px，则关闭
              if (info.offset.y > 100) onClose();
            }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-white dark:bg-slate-800 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] max-h-[85vh] flex flex-col border-t border-slate-100 dark:border-slate-700"
          >
            {/* 顶部拖拽手柄 (扩大判定区) */}
            <div 
              className={`w-full flex justify-center pt-5 pb-4 touch-none ${disableDrag ? '' : 'cursor-grab active:cursor-grabbing'}`} 
              onPointerDown={(e) => {
                if (!disableDrag) dragControls.start(e);
              }}
              onClick={() => onClose()}
            >
              <div className="w-16 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
            </div>

            {/* 关闭按钮 (右上角) */}
            <div className="absolute top-4 right-4 z-[80] cursor-pointer">
               <button 
                 type="button"
                 onPointerDown={(e) => e.stopPropagation()}
                 onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); 
                    onClose(); 
                 }} 
                 className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
               >
                 <X className="w-5 h-5" />
               </button>
            </div>

            {/* 内容滚动区域 */}
            <div className="p-6 overflow-y-auto pb-10 md:pb-6 touch-pan-y scroll-container overscroll-contain">
              {renderContent()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
