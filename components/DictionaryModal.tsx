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
import { Plus, X, Check, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { DictionaryResult } from "@/types";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence, PanInfo, useDragControls } from "framer-motion";
import { getDictionaryPreview } from "@/lib/stream-preview";

interface DictionaryModalProps {
  result: DictionaryResult | null;
  localResult?: DictionaryResult | null;
  remoteResult?: DictionaryResult | null;
  isRemoteLoading?: boolean;
  isAiLoading?: boolean;
  streamText?: string;
  currentWord?: string;
  onClose: () => void;
  onAddToNotebook: (word: DictionaryResult) => void;
  onOpenWordCard?: (word: DictionaryResult) => void;
  disableDrag?: boolean;
}

export function DictionaryModal({
  result,
  localResult = null,
  remoteResult = null,
  isRemoteLoading = false,
  isAiLoading = false,
  streamText = "",
  currentWord,
  onClose,
  onAddToNotebook,
  onOpenWordCard,
  disableDrag = false,
}: DictionaryModalProps) {
  const vocabulary = useAppStore((state) => state.vocabulary);
  const [isSaved, setIsSaved] = useState(false);
  const dragControls = useDragControls();
  const baseResult = result || localResult || remoteResult;
  const streamResult = getDictionaryPreview(streamText, currentWord || baseResult?.word);

  useEffect(() => {
    if (baseResult) {
      const exists = vocabulary.some(v => v.word.toLowerCase() === baseResult.word.toLowerCase());
      setIsSaved(exists);
    } else {
      setIsSaved(false);
    }
  }, [baseResult, vocabulary]);

  const audioUrl = remoteResult?.audio || result?.audio;

  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {
      });
    }
  }, [audioUrl]);

  const handlePlayAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(e => console.error("Play failed", e));
    }
  };

  const isOpen = !!result || !!localResult || !!remoteResult || isRemoteLoading || isAiLoading;

  const handleAddToNotebookAction = () => {
    if (!baseResult) return;
    
    if (isSaved) {
      toast.info("该单词已在您的生词本中");
      return;
    }

    const exists = vocabulary.some(v => v.word.toLowerCase() === baseResult.word.toLowerCase());
    if (exists) {
      setIsSaved(true);
      toast.info("该单词已在您的生词本中");
      return;
    }

    onAddToNotebook(baseResult);
    setIsSaved(true);
    toast.success("已加入生词本");
  };

  const TAG_MAP: Record<string, string> = {
    "noun": "名词", "verb": "动词", "adjective": "形容词", "adverb": "副词",
    "preposition": "介词", "conjunction": "连词", "article": "冠词",
    "academic": "学术", "core": "核心", "ielts": "IEITS",
    "toefl": "TOEFL", "zk": "中考", "gk": "高考", "ky": "考研", "cet4": "CET4", "cet6": "CET6", "gre": "GRE"
  };

  const TAG_STYLE: Record<string, string> = {
    zk: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    gk: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    cet4: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    cet6: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    ky: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    ielts: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    toefl: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    gre: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  };

  const renderContent = () => {
    const headerResult = { ...(localResult || result || {}), ...(streamResult || {}) } as DictionaryResult;
    const detailResult = (remoteResult || streamResult) as DictionaryResult | null;
    const displayWord = headerResult?.word || currentWord;
    const hasHeaderContent = Boolean(
      displayWord ||
      headerResult?.phonetic ||
      headerResult?.cnDefinition ||
      headerResult?.definition ||
      headerResult?.tags?.length
    );
    if (!hasHeaderContent) return null;

    const hasMeanings = detailResult?.meanings && detailResult.meanings.length > 0;

    return (
      <>
        <div 
          className="mb-6 touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => {
            if (!disableDrag) dragControls.start(e);
          }}
        >
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100">
              {displayWord}
            </h2>
            
            {audioUrl && (
              <button 
                onClick={(e) => { e.stopPropagation(); handlePlayAudio(); }}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300"
                aria-label="Play pronunciation"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            )}

            {headerResult?.phonetic && (
              <span className="text-slate-500 dark:text-slate-400 font-mono text-lg">
                {headerResult.phonetic}
              </span>
            )}
          </div>
          
          {headerResult?.tags && headerResult.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
               {headerResult.tags?.map(tag => {
                 const normalized = tag.toLowerCase();
                 return (
                   <span key={tag} className={`px-2.5 py-1 text-xs font-medium rounded-full ${TAG_STYLE[normalized] || "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                     {TAG_MAP[normalized] || tag}
                   </span>
                 );
               })}
            </div>
          )}

          {/* 中文释义区域 - 预留空间并显示加载状态 */}
          <div className="mt-3 min-h-[60px]">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              中文释义
            </h3>
            {isRemoteLoading || isAiLoading ? (
              headerResult?.cnDefinition ? (
                <p className="text-xl text-slate-800 dark:text-slate-200 font-semibold">
                  {headerResult.cnDefinition}
                </p>
              ) : (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <div className="w-4 h-4 border-2 border-slate-300 dark:border-slate-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">查询中...</span>
                </div>
              )
            ) : headerResult?.cnDefinition ? (
              <p className="text-xl text-slate-800 dark:text-slate-200 font-semibold">
                {headerResult.cnDefinition}
              </p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                暂无中文释义
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {detailResult ? (
            <div className="space-y-6">
              {(isRemoteLoading || isAiLoading) && (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <div className="w-4 h-4 border-2 border-slate-300 dark:border-slate-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">内容生成中...</span>
                </div>
              )}
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                英文释义
              </h3>
              {hasMeanings ? detailResult.meanings!.map((meaning, idx) => (
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
              )) : (
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                    📖 释义
                  </h3>
                  <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                    {detailResult.definition}
                  </p>
                  {detailResult.usage && (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      {detailResult.usage}
                    </p>
                  )}
                </div>
              )}

              {detailResult.examples && detailResult.examples.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                    精选例句
                  </h3>
                  <div className="space-y-3">
                    {detailResult.examples.map((ex, idx) => (
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
              
              {!detailResult.examples && detailResult.example && (
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                    例句
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-slate-700 dark:text-slate-300 italic mb-2 font-serif">
                      &ldquo;{detailResult.example}&rdquo;
                    </p>
                    {detailResult.exampleTranslation && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {detailResult.exampleTranslation}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : isRemoteLoading || isAiLoading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <div className="w-4 h-4 border-2 border-slate-300 dark:border-slate-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">英文释义查询中...</span>
              </div>
              <div className="space-y-3 animate-pulse">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-24 w-full bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
          ) : (
            <div className="text-slate-500 dark:text-slate-400 text-sm">
              暂无例句
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

           {onOpenWordCard && baseResult && (
             <button
              onClick={() => onOpenWordCard(baseResult)}
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
