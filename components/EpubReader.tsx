/**
 * EPUB 阅读器组件 (EpubReader)
 * 作用：用于渲染和交互 EPUB 格式的电子书。
 * 定义：基于 `react-reader` 库封装的阅读器组件。
 * 逻辑：
 * 1. 加载 EPUB 文件内容，支持章节跳转、字体大小调整、主题切换。
 * 2. 监听文本选中事件，触发划词翻译或笔记功能。
 * 3. 记录阅读进度（location），确保持久化阅读状态。
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { ReactReader } from "react-reader";
import { useAppStore } from "@/lib/store";
import { Loader2, Sparkles, X, GraduationCap } from "lucide-react";
import { SimpleDictionaryModal } from "./SimpleDictionaryModal";
import { DictionaryResult } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

import { triggerHaptic } from "@/lib/utils";
import { readStreamedJson } from "@/lib/stream-client";
import { getSentenceAnalysisPreview } from "@/lib/stream-preview";

interface EpubReaderProps {
  url: string | ArrayBuffer;
  title?: string;
  initialLocation?: string | number;
  onLocationChange?: (loc: string | number) => void;
  onProgressChange?: (loc: string | number, progress: number) => void;
}

interface PageDisplayState {
  page: number;
  total: number;
}

function getCurrentRenditionLocation(rendition: any) {
  if (!rendition) return null;

  try {
    const currentLocation = rendition.currentLocation?.();
    if (currentLocation && typeof currentLocation.then === "function") {
      return rendition.location ?? null;
    }
    return currentLocation ?? rendition.location ?? null;
  } catch {
    return rendition.location ?? null;
  }
}

function getDisplayedPageState(rendition: any, currentLocation?: any): PageDisplayState | null {
  const activeLocation = currentLocation ?? getCurrentRenditionLocation(rendition);
  const start = activeLocation?.start;
  const cfi = start?.cfi;
  const pageList = rendition?.book?.pageList;

  if (cfi && pageList?.pages?.length) {
    const page = pageList.pageFromCfi?.(cfi);
    const total = typeof pageList.lastPage === "number" ? pageList.lastPage : null;
    if (typeof page === "number" && page > 0 && typeof total === "number" && total > 0) {
      return { page, total };
    }
  }

  const locations = rendition?.book?.locations;
  const rawTotal = typeof locations?.total === "number" ? locations.total : -1;
  const virtualTotal = rawTotal >= 0 ? rawTotal + 1 : 0;

  let rawLocation = typeof start?.location === "number" ? start.location : null;
  if ((rawLocation === null || rawLocation < 0) && cfi && locations?.locationFromCfi) {
    const nextLocation = locations.locationFromCfi(cfi);
    if (typeof nextLocation === "number" && nextLocation >= 0) {
      rawLocation = nextLocation;
    }
  }

  if (rawLocation !== null && rawLocation >= 0 && virtualTotal > 0) {
    return {
      page: Math.min(virtualTotal, rawLocation + 1),
      total: virtualTotal,
    };
  }

  return null;
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
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isSentenceAnalyzing, setIsSentenceAnalyzing] = useState(false);
  const [isSentenceSheetOpen, setIsSentenceSheetOpen] = useState(false);
  const [dictionaryStreamText, setDictionaryStreamText] = useState("");
  const [sentenceStreamText, setSentenceStreamText] = useState("");
  const lookupTokenRef = useRef(0);

  // 移动端防误触：记录触摸起始位置
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);

  const addVocabulary = useAppStore((state) => state.addVocabulary);
  const { 
    dailyUsage, 
    ensureDailyUsage, 
    checkSentenceAnalysisQuota, 
    isAdmin, 
    fetchTargetLevel,
    targetLevel,
    setTargetLevel
  } = useAppStore((state) => ({
    dailyUsage: state.dailyUsage,
    ensureDailyUsage: state.ensureDailyUsage,
    checkSentenceAnalysisQuota: state.checkSentenceAnalysisQuota,
    isAdmin: state.isAdmin,
    fetchTargetLevel: state.fetchTargetLevel,
    targetLevel: state.targetLevel,
    setTargetLevel: state.setTargetLevel
  }));

  useEffect(() => {
    fetchTargetLevel();
  }, [fetchTargetLevel]);

  useEffect(() => {
    if (initialLocation !== undefined) {
      setLocation(initialLocation);
    }
  }, [initialLocation]);

  useEffect(() => {
    ensureDailyUsage();
  }, [ensureDailyUsage]);

  const remainingSentence = Math.max(0, 15 - dailyUsage.sentenceAnalysisCount);
  const sentencePreview = getSentenceAnalysisPreview(sentenceStreamText);

  function jumpToPage() {
    const raw = parseInt(jumpInput, 10);
    if (!raw || !rendition) return;

    const pageList = rendition?.book?.pageList;
    if (pageList?.pages?.length) {
      const directCfi = pageList.cfiFromPage?.(raw);
      if (directCfi && directCfi !== -1) {
        rendition.display(directCfi);
        return;
      }

      const pagePercent = pageList.percentageFromPage?.(raw);
      if (typeof pagePercent === "number" && Number.isFinite(pagePercent)) {
        const p = Math.min(1, Math.max(0, pagePercent));
        const cfi = rendition?.book?.locations?.cfiFromPercentage?.(p);
        if (cfi) {
          rendition.display(cfi);
          return;
        }
        rendition.display(p);
        return;
      }
    }

    const locations = rendition?.book?.locations;
    const rawTotal = typeof locations?.total === "number" ? locations.total : -1;
    const virtualTotal = rawTotal >= 0 ? rawTotal + 1 : 0;

    let percent: number | null = null;
    if (virtualTotal > 1) {
      percent = (raw - 1) / (virtualTotal - 1);
    } else if (raw <= 100) {
      percent = raw / 100;
    }
    if (percent === null) return;

    const p = Math.min(1, Math.max(0, percent));
    const cfi = locations?.cfiFromPercentage ? locations.cfiFromPercentage(p) : null;
    if (cfi) {
      rendition.display(cfi);
      return;
    }
    rendition.display(p);
  }

  useEffect(() => {
    let cancelled = false;
    const locations = rendition?.book?.locations;
    if (!locations) return;

    const updateDisplayedPage = () => {
      const nextState = getDisplayedPageState(rendition);
      if (nextState) {
        setDisplayedPage(nextState.page);
        setDisplayedTotal(nextState.total);
        return;
      }
      setDisplayedPage(null);
      setDisplayedTotal(null);
    };

    if (locations.total > 0) {
      updateDisplayedPage();
      return;
    }

    Promise.resolve(locations.generate(1000))
      .then(() => {
        if (!cancelled) {
          updateDisplayedPage();
        }
      })
      .catch((error: unknown) => {
        console.warn("Failed to generate EPUB locations", error);
      });

    return () => {
      cancelled = true;
    };
  }, [rendition]);

  const onLocationChanged = (loc: string | number) => {
    setLocation(loc);
    if (onLocationChange) onLocationChange(loc);

    const currentLocation = getCurrentRenditionLocation(rendition);
    const percentage = currentLocation?.start?.percentage;
    const progress = typeof percentage === "number" ? Math.round(percentage * 100) : 0;
    setProgressPercent(progress);

    if (onProgressChange) {
      onProgressChange(loc, progress);
    }

    const nextState = getDisplayedPageState(rendition, currentLocation);
    if (nextState) {
      setDisplayedPage(nextState.page);
      setDisplayedTotal(nextState.total);
      return;
    }
    setDisplayedPage(null);
    setDisplayedTotal(null);
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
    setIsRemoteLoading(false);
    setIsAiLoading(false);
    setDictionaryResult(null);
    setSelectedText(null);
    setDictionaryStreamText("");
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
    setSentenceStreamText("");
  };

  const handleSentenceAnalyze = async () => {
    if (!selectedText) return;
    if (!(await checkSentenceAnalysisQuota())) return;

    setIsSentenceAnalyzing(true);
    setAnalysisResult(null);
    setSentenceStreamText("");
    setIsSentenceSheetOpen(true);
    
    // 重置单词查询状态
    setDictionaryResult(null);
    setIsRemoteLoading(false);
    setIsAiLoading(false);

    try {
      const response = await fetch("/api/analyze-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection: selectedText,
          type: "sentence",
        }),
      });
      const data = await readStreamedJson<any>({
        response,
        onDelta: (chunk) => {
          setSentenceStreamText((prev) => prev + chunk);
        },
      });
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

    // 重置状态
    setDictionaryResult(null);
    setIsRemoteLoading(false);
    setIsAiLoading(false);
    setDictionaryStreamText("");

    // A. 优先查 Supabase Dictionary (性能优化：无需 AI)
    // 直接调用 API
    try {
      setIsRemoteLoading(true); // 开始数据库查询
      setIsSheetOpen(true); // 提前打开模态框显示加载状态
      
      const dictRes = await fetch(`/api/dictionary/lookup?word=${encodeURIComponent(cleanWord)}`);
      if (dictRes.ok) {
        const data = await dictRes.json();
        if (data && data.word) {
          setDictionaryResult({
            word: data.word,
            phonetic: data.phonetic,
            audio: data.audio,
            definition: data.translation,
            cnDefinition: data.translation, // 添加中文释义
            tags: data.tag ? data.tag.split(' ') : [],
            example: "", // 数据库暂无例句
            exampleTranslation: ""
          });
          setIsRemoteLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error("Dictionary lookup failed", err);
    } finally {
      setIsRemoteLoading(false); // 数据库查询结束
    }

    // B. 本地没有，才联网 (兜底)
    const token = ++lookupTokenRef.current;
    setIsAiLoading(true); // 开始AI查询

    try {
      const res = await fetch("/api/analyze-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection: cleanWord, type: "word" })
      });
      const data = await readStreamedJson<any>({
        response: res,
        onDelta: (chunk) => {
          setDictionaryStreamText((prev) => prev + chunk);
        },
      });
      if (lookupTokenRef.current !== token) return;
      if (!data.error) {
        setDictionaryResult({
          ...data,
          cnDefinition: data.cnDefinition || data.definition || "",
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (lookupTokenRef.current === token) {
        setIsAiLoading(false); // AI查询结束
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
            if (e.key === "Enter") {
              jumpToPage();
            }
          }}
          className="w-16 bg-transparent text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
          placeholder={displayedTotal ? "页码" : "%"}
        />
        <button
          type="button"
          onClick={jumpToPage}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400"
        >
          跳转
        </button>
      </div>

      {/* 底部查词抽屉 */}
      <SimpleDictionaryModal
        result={isSheetOpen ? dictionaryResult : null}
        isLoading={isSheetOpen ? (isRemoteLoading || isAiLoading) : false}
        isRemoteLoading={isSheetOpen ? isRemoteLoading : false}
        isAiLoading={isSheetOpen ? isAiLoading : false}
        streamText={isSheetOpen ? dictionaryStreamText : ""}
        onClose={closeSheet}
        onAddToNotebook={(word) => {
          addVocabulary({
             id: Date.now().toString(),
             word: word.word,
             definition: word.definition,
             exampleTranslation: word.exampleTranslation,
             phonetic: word.phonetic,
             audio: word.audio,
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
              onClick={() => {
                triggerHaptic();
                handleConfirmLookup();
              }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-transform active:scale-95 duration-100 touch-manipulation shadow-sm"
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
                    {isAdmin ? "管理员无限配额模式 🚀" : `今日剩余配额：${remainingSentence}/15`}
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
                  onClick={() => {
                    triggerHaptic();
                    handleSentenceAnalyze();
                  }}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-transform active:scale-95 duration-100 touch-manipulation shadow-sm"
                >
                  <Sparkles size={18} />
                  AI 深度分析
                </button>
              )}

              {isSentenceAnalyzing && (
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium animate-pulse">
                    <Loader2 className="animate-spin" />
                    分析中...
                  </div>
                  {sentencePreview ? (
                    <div className="space-y-5">
                      {sentencePreview.translation && (
                        <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl border border-primary-100 dark:border-primary-900/30">
                          <h4 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-2">中文翻译</h4>
                          <p className="text-lg text-slate-800 dark:text-slate-200">
                            {sentencePreview.translation}
                          </p>
                        </div>
                      )}

                      {(sentencePreview.structure || sentencePreview.grammarExplanation) && (
                        <div>
                          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                            <GraduationCap size={16} />
                            语法解析
                          </h4>
                          {sentencePreview.structure && (
                            <div className="flex flex-wrap gap-2 mb-4 text-sm">
                              {sentencePreview.structure.subject && (
                                <span className="px-2 py-1 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                                  <b>S:</b> {sentencePreview.structure.subject}
                                </span>
                              )}
                              {sentencePreview.structure.verb && (
                                <span className="px-2 py-1 rounded bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
                                  <b>V:</b> {sentencePreview.structure.verb}
                                </span>
                              )}
                              {sentencePreview.structure.object && (
                                <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                  <b>O:</b> {sentencePreview.structure.object}
                                </span>
                              )}
                            </div>
                          )}
                          {sentencePreview.grammarExplanation && (
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                              {sentencePreview.grammarExplanation}
                            </p>
                          )}
                        </div>
                      )}

                      {sentencePreview.vocabulary && sentencePreview.vocabulary.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">重点词汇</h4>
                          <div className="flex flex-wrap gap-2">
                            {sentencePreview.vocabulary.map((w: string) => (
                              <span key={w} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm rounded-md border border-slate-200 dark:border-slate-700">
                                {w}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {sentencePreview.importantPhrases && sentencePreview.importantPhrases.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">重要短语与地道表达</h4>
                          <div className="space-y-3">
                            {sentencePreview.importantPhrases.map((item, index) => (
                              <div key={`${item.phrase || "phrase"}-${index}`} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3">
                                {item.phrase && (
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {item.phrase}
                                  </p>
                                )}
                                {item.localExpression && (
                                  <p className="mt-1 text-sm text-primary-600 dark:text-primary-400">
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
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4 animate-pulse" />
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2 animate-pulse" />
                    </div>
                  )}
                </div>
              )}

              {analysisResult && (
                <div className="space-y-5">
                  <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl border border-primary-100 dark:border-primary-900/30">
                    <h4 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-2">中文翻译</h4>
                    <p className="text-lg text-slate-800 dark:text-slate-200">
                      {analysisResult.translation}
                    </p>
                  </div>

                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                      <GraduationCap size={16} />
                      语法解析
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
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">重点词汇</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.vocabulary.map((w: string) => (
                          <span key={w} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm rounded-md border border-slate-200 dark:border-slate-700">
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysisResult.importantPhrases && analysisResult.importantPhrases.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">重要短语与地道表达</h4>
                      <div className="space-y-3">
                        {analysisResult.importantPhrases.map((item: any, index: number) => (
                          <div key={`${item.phrase || "phrase"}-${index}`} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3">
                            {item.phrase && (
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {item.phrase}
                              </p>
                            )}
                            {item.localExpression && (
                              <p className="mt-1 text-sm text-primary-600 dark:text-primary-400">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
