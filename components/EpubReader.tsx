"use client";

import { useEffect, useRef, useState } from "react";
import { ReactReader } from "react-reader";
import { useAppStore } from "@/lib/store";
import { Loader2, Sparkles, X, GraduationCap } from "lucide-react";
import { SimpleDictionaryModal } from "./SimpleDictionaryModal";
import { DictionaryResult } from "@/types";
import { lookupLocal } from "@/lib/local-dictionary";
import { motion, AnimatePresence } from "framer-motion";

interface EpubReaderProps {
  url: string | ArrayBuffer;
  title?: string;
  initialLocation?: string | number;
  onLocationChange?: (loc: string | number) => void;
  onProgressChange?: (loc: string | number, progress: number) => void;
}

export function EpubReader({ url, title, initialLocation, onLocationChange, onProgressChange }: EpubReaderProps) {
  const [location, setLocation] = useState<string | number>(initialLocation || 0);
  const [rendition, setRendition] = useState<any>(null);
  const [displayedPage, setDisplayedPage] = useState<number | null>(null);
  const [displayedTotal, setDisplayedTotal] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [jumpInput, setJumpInput] = useState("");
  
  // 查词相关状态
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [isConfirmSheetOpen, setIsConfirmSheetOpen] = useState(false);
  const [dictionaryResult, setDictionaryResult] = useState<DictionaryResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isSentenceAnalyzing, setIsSentenceAnalyzing] = useState(false);
  const [isSentenceSheetOpen, setIsSentenceSheetOpen] = useState(false);
  const lookupTokenRef = useRef(0);

  // 移动端防误触：记录触摸起始位置
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);

  const addVocabulary = useAppStore((state) => state.addVocabulary);
  const { dailyUsage, ensureDailyUsage, checkSentenceAnalysisQuota } = useAppStore((state) => ({
    dailyUsage: state.dailyUsage,
    ensureDailyUsage: state.ensureDailyUsage,
    checkSentenceAnalysisQuota: state.checkSentenceAnalysisQuota,
  }));

  useEffect(() => {
    if (initialLocation !== undefined) {
      setLocation(initialLocation);
    }
  }, [initialLocation]);

  useEffect(() => {
    ensureDailyUsage();
  }, [ensureDailyUsage]);

  const remainingSentence = Math.max(0, 50 - dailyUsage.sentenceAnalysisCount);

  useEffect(() => {
    const locations = rendition?.book?.locations;
    if (locations && locations.total === 0) {
      locations.generate(1000);
    }
  }, [rendition]);

  const onLocationChanged = (loc: string | number) => {
    setLocation(loc);
    if (onLocationChange) onLocationChange(loc);
    if (onProgressChange) {
      const percentage = rendition?.location?.start?.percentage;
      const progress = typeof percentage === "number" ? Math.round(percentage * 100) : 0;
      onProgressChange(loc, progress);
      setProgressPercent(progress);
    }
    const displayed = rendition?.location?.start?.displayed;
    if (displayed?.page && displayed?.total) {
      setDisplayedPage(displayed.page);
      setDisplayedTotal(displayed.total);
    } else {
      setDisplayedPage(null);
      setDisplayedTotal(null);
    }
  };

  // --- 核心修复：移动端高性能点击监听 ---
  const handleRendition = (rendition: any) => {
    setRendition(rendition);

    // 1. PC端/鼠标选词逻辑 (保持不变)
    rendition.on('selected', (cfiRange: string, contents: any) => {
      const rangeOrPromise = rendition.getRange(cfiRange);
      Promise.resolve(rangeOrPromise).then((range: Range) => {
        if (!range) return;
        const text = range.toString().trim();
        if (text) {
          setSelectedText(text);
          setIsConfirmSheetOpen(true);
        }
      });
    });

    // 2. 移动端手指点击逻辑 (深度优化版)
    rendition.hooks.content.register((contents: any) => {
      const doc = contents.document;
      const body = doc.body;

      // 记录触摸开始坐标
      body.addEventListener('touchstart', (e: any) => {
        if (e.touches.length === 1) {
          touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
          };
        }
      });

      body.addEventListener('touchend', (e: any) => {
        // 如果没有起始坐标，或者多指操作，直接忽略
        if (!touchStartRef.current || e.changedTouches.length !== 1) return;

        const touch = e.changedTouches[0];
        const endX = touch.clientX;
        const endY = touch.clientY;
        
        // 计算位移距离
        const dist = Math.sqrt(
          Math.pow(endX - touchStartRef.current.x, 2) + 
          Math.pow(endY - touchStartRef.current.y, 2)
        );

        // 重置
        touchStartRef.current = null;

        // 阈值设为 10px：如果移动超过 10px，说明是翻页或滚动，不是点击查词
        if (dist > 10) return;

        // --- 核心兼容性修复：获取点击位置的单词 ---
        let range = null;
        
        // 方案 A: 标准 API (新版安卓/Chrome)
        if (doc.caretPositionFromPoint) {
          const pos = doc.caretPositionFromPoint(endX, endY);
          if (pos && pos.offsetNode && pos.offsetNode.nodeType === Node.TEXT_NODE) {
            range = doc.createRange();
            range.setStart(pos.offsetNode, pos.offset);
            range.setEnd(pos.offsetNode, pos.offset);
          }
        } 
        // 方案 B: Webkit 私有 API (iOS/旧版安卓)
        else if (doc.caretRangeFromPoint) {
          range = doc.caretRangeFromPoint(endX, endY);
        }

        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
           // 稍微延迟以避免冲突
           setTimeout(() => {
              try {
                // 自动扩展选中整个单词
                // @ts-ignore
                if (range.expand) {
                    // @ts-ignore
                    range.expand('word');
                } else {
                    // 降级处理：如果没有 expand 方法（极旧机型），尝试手动正则匹配（这里简化处理）
                    // 考虑到 epubjs 依赖环境，通常 range 对象会有 expand
                }

                const word = range.toString().trim();
                // 确保点到的是字母，且排除标点
                if (word && /^[a-zA-Z\u00C0-\u00FF]+$/.test(word)) {
                   handleLookup(word);
                   // 清除原生选区干扰
                   const sel = contents.window.getSelection();
                   sel.removeAllRanges();
                   sel.addRange(range);
                }
              } catch (err) {
                console.warn("Word selection failed", err);
              }
           }, 50);
        }
      });
    });
  };

  // 确认查词 (用于框选长句)
  const closeSheet = () => {
    setIsSheetOpen(false);
    setIsAnalyzing(false);
    setDictionaryResult(null);
    setSelectedText(null);
    lookupTokenRef.current += 1;
  };

  const handleConfirmLookup = () => {
    if (!selectedText) return;
    const isWord = !selectedText.includes(" ");
    setIsConfirmSheetOpen(false);
    if (isWord) {
      handleLookup(selectedText);
      setSelectedText(null);
      return;
    }
    handleSentenceAnalyze();
  };

  const closeSentenceSheet = () => {
    setIsSentenceSheetOpen(false);
    setIsSentenceAnalyzing(false);
    setAnalysisResult(null);
    setSelectedText(null);
  };

  const handleSentenceAnalyze = async () => {
    if (!selectedText) return;
    if (!checkSentenceAnalysisQuota()) return;

    setIsSentenceAnalyzing(true);
    setAnalysisResult(null);
    setIsSentenceSheetOpen(true);

    try {
      const response = await fetch("/api/analyze-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection: selectedText,
          type: "sentence",
        }),
      });
      if (!response.ok) throw new Error("Analysis failed");
      const data = await response.json();
      setAnalysisResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSentenceAnalyzing(false);
    }
  };

  // 查词功能函数
  const handleLookup = async (text: string) => {
    // 移除所有标点符号，只留字母，提高本地词库命中率
    const cleanWord = text.trim().replace(/[.,!?;:"'(){}\[\]]/g, "");
    if (!cleanWord) return;

    // A. 优先查本地 (性能优化：无网络、无延迟)
    // 直接调用，不进 loading 状态，给用户“秒开”的感觉
    const localRes = lookupLocal(cleanWord);
    if (localRes) {
      setDictionaryResult({
        word: localRes.text,
        phonetic: localRes.phonetic,
        definition: localRes.definition,
        tags: localRes.tags,
        example: localRes.example,
        exampleTranslation: localRes.translation
      });
      setIsSheetOpen(true);
      setIsAnalyzing(false);
      return;
    }

    // B. 本地没有，才联网 (兜底)
    const token = ++lookupTokenRef.current;
    setIsSheetOpen(true); 
    setDictionaryResult(null);
    setIsAnalyzing(true);

    try {
      const res = await fetch("/api/analyze-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection: cleanWord, type: "word" })
      });
      const data = await res.json();
      if (lookupTokenRef.current !== token) return;
      if (!data.error) {
        setDictionaryResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (lookupTokenRef.current === token) {
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-white dark:bg-slate-900 overflow-hidden">
      <ReactReader
        url={url}
        title={title}
        location={location}
        locationChanged={onLocationChanged}
        getRendition={handleRendition}
        epubOptions={{
           allowPopups: true, 
           allowScriptedContent: true,
        }}
        loadingView={
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        }
      />

      <div className="absolute bottom-4 right-4 z-50 flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-2 shadow-sm backdrop-blur">
        <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          {displayedPage && displayedTotal ? `第 ${displayedPage}/${displayedTotal} 页` : `${progressPercent}%`}
        </div>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={jumpInput}
          onChange={(e) => setJumpInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const raw = parseInt(jumpInput, 10);
            if (!raw || !rendition) return;
            let percent: number | null = null;
            if (displayedTotal && displayedTotal > 0) {
              percent = (raw - 1) / displayedTotal;
            } else if (raw <= 100) {
              percent = raw / 100;
            }
            if (percent === null) return;
            const p = Math.min(1, Math.max(0, percent));
            const locations = rendition?.book?.locations;
            const cfi = locations?.cfiFromPercentage ? locations.cfiFromPercentage(p) : null;
            if (cfi) {
              rendition.display(cfi);
              return;
            }
            rendition.display(p);
          }}
          className="w-16 bg-transparent text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
          placeholder={displayedTotal ? "页码" : "%"}
        />
        <button
          type="button"
          onClick={() => {
            const raw = parseInt(jumpInput, 10);
            if (!raw || !rendition) return;
            let percent: number | null = null;
            if (displayedTotal && displayedTotal > 0) {
              percent = (raw - 1) / displayedTotal;
            } else if (raw <= 100) {
              percent = raw / 100;
            }
            if (percent === null) return;
            const p = Math.min(1, Math.max(0, percent));
            const locations = rendition?.book?.locations;
            const cfi = locations?.cfiFromPercentage ? locations.cfiFromPercentage(p) : null;
            if (cfi) {
              rendition.display(cfi);
              return;
            }
            rendition.display(p);
          }}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400"
        >
          跳转
        </button>
      </div>

      {/* 底部查词抽屉 */}
      <SimpleDictionaryModal
        result={isSheetOpen ? dictionaryResult : null}
        isLoading={isSheetOpen ? isAnalyzing : false}
        onClose={closeSheet}
        onAddToNotebook={(word) => {
          addVocabulary({
             id: Date.now().toString(),
             word: word.word,
             definition: word.definition,
             exampleTranslation: word.exampleTranslation,
             phonetic: word.phonetic,
             createdAt: new Date().toISOString(),
             reviewCount: 0,
             correctCount: 0
          });
          closeSheet();
        }}
      />

      {/* 确认分析工具栏 (仅用于手动框选长句) */}
      <AnimatePresence>
        {isConfirmSheetOpen && selectedText && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-[60px] md:bottom-0 left-0 right-0 bg-white dark:bg-slate-900 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] rounded-t-2xl z-40 border-t border-slate-100 dark:border-slate-800 p-4"
          >
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 italic border-l-2 border-slate-200 dark:border-slate-700 pl-3 flex-1">
                    &ldquo;{selectedText}&rdquo;
                </p>
                <button 
                  onClick={() => { setIsConfirmSheetOpen(false); setSelectedText(null); }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"
                >
                  <X size={20} />
                </button>
            </div>

            <button
              onClick={handleConfirmLookup}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Sparkles size={18} />
              AI 深度分析
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSentenceSheetOpen && selectedText && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-[60px] md:bottom-0 left-0 right-0 bg-white dark:bg-slate-900 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] rounded-t-2xl z-40 border-t border-slate-100 dark:border-slate-800 max-h-[80vh] flex flex-col"
          >
            <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing" onClick={closeSentenceSheet}>
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>

            <div className="p-4 pb-8 md:max-w-4xl md:mx-auto overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 pr-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 italic border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                    &ldquo;{selectedText}&rdquo;
                  </p>
                  <div className="mt-2 text-xs text-slate-400">
                    今日剩余配额：{remainingSentence}/50
                  </div>
                </div>
                <button
                  onClick={closeSentenceSheet}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              {!analysisResult && !isSentenceAnalyzing && (
                <button
                  onClick={handleSentenceAnalyze}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Sparkles size={18} />
                  AI 深度分析
                </button>
              )}

              {isSentenceAnalyzing && (
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
                <div className="space-y-5">
                  <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl border border-primary-100 dark:border-primary-900/30">
                    <h4 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-2">Translation</h4>
                    <p className="text-lg text-slate-800 dark:text-slate-200">
                      {analysisResult.translation}
                    </p>
                  </div>

                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                      <GraduationCap size={16} />
                      Grammar Analysis
                    </h4>
                    {analysisResult.structure && (
                      <div className="flex flex-wrap gap-2 mb-4 text-sm">
                        <span className="px-2 py-1 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                          <b>S:</b> {analysisResult.structure.subject}
                        </span>
                        <span className="px-2 py-1 rounded bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
                          <b>V:</b> {analysisResult.structure.verb}
                        </span>
                        <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          <b>O:</b> {analysisResult.structure.object}
                        </span>
                      </div>
                    )}
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                      {analysisResult.grammarExplanation}
                    </p>
                  </div>

                  {analysisResult.vocabulary && analysisResult.vocabulary.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Key Vocabulary</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.vocabulary.map((w: string) => (
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
