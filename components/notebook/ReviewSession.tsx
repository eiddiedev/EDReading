/**
 * 单词复习会话组件，提供单词拼写测试、释义展示和例句填空，根据用户表现更新掌握程度。
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { DictionaryResult, VocabularyWord } from "@/types";
import { useAppStore } from "@/lib/store";
import { triggerHaptic } from "@/lib/utils";
import { resolvePronunciationAudioUrl } from "@/lib/pronunciation";
import { getCachedDictionaryResult, lookupWord } from "@/lib/dictionary";
import { X, Check, Volume2, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface ReviewSessionProps {
  onClose: () => void;
  vocabulary: VocabularyWord[];
}

interface ReviewFallbackInfo {
  englishDefinition?: string;
  isLoading?: boolean;
}

function extractEnglishDefinition(result?: DictionaryResult | null) {
  return (
    result?.meanings?.find((meaning) => meaning.definitions?.[0]?.definition)?.definitions?.[0]?.definition ||
    (result?.definition && /[a-zA-Z]/.test(result.definition) ? result.definition : undefined)
  );
}

function getWordKey(word?: string) {
  return word?.trim().toLowerCase() || "";
}

export function ReviewSession({ onClose, vocabulary }: ReviewSessionProps) {
  const incrementReviewCount = useAppStore((state) => state.incrementReviewCount);
  const markAsMastered = useAppStore((state) => state.markAsMastered);
  const [quizWords, setQuizWords] = useState<VocabularyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [fallbackMap, setFallbackMap] = useState<Record<string, ReviewFallbackInfo>>({});
  const fallbackMapRef = useRef<Record<string, ReviewFallbackInfo>>({});
  const inflightFallbacksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fallbackMapRef.current = fallbackMap;
  }, [fallbackMap]);

  // Initialize Quiz - Only once to prevent list shifting during review
  useEffect(() => {
    if (vocabulary.length > 0 && quizWords.length === 0) {
      // Use provided words directly, assuming they are already selected/shuffled by parent
      setQuizWords(vocabulary);
    }
  }, [vocabulary, quizWords.length]);

  const currentWord = quizWords[currentIndex];
  const fallbackInfo = currentWord
    ? fallbackMap[currentWord.word.trim().toLowerCase()]
    : undefined;
  const pronunciationUrl = currentWord
    ? resolvePronunciationAudioUrl(currentWord.word, currentWord.audio)
    : null;

  const handlePlayPronunciation = () => {
    if (!currentWord) return;
    if (!pronunciationUrl) {
      toast.info("这个单词暂时没有可用发音");
      return;
    }

    const audio = new Audio(pronunciationUrl);
    audio.play().catch((error) => {
      console.error("Pronunciation playback failed:", error);
      toast.error("发音播放失败，请稍后再试");
    });
  };

  useEffect(() => {
    if (!currentWord) return;
    const nextWord = quizWords[currentIndex + 1];
    const pendingTimers: number[] = [];
    const cancels: Array<() => void> = [];

    const ensureFallback = (word: VocabularyWord | undefined, showLoading: boolean) => {
      if (!word || word.example?.trim()) return;

      const wordKey = getWordKey(word.word);
      if (!wordKey) return;

      const cachedFallback = fallbackMapRef.current[wordKey];
      if (cachedFallback?.englishDefinition) return;

      const cachedDictionary = getCachedDictionaryResult(word.word);
      const cachedEnglishDefinition = extractEnglishDefinition(cachedDictionary);
      if (cachedEnglishDefinition) {
        setFallbackMap((prev) => ({
          ...prev,
          [wordKey]: {
            englishDefinition: cachedEnglishDefinition,
            isLoading: false,
          },
        }));
        return;
      }

      if (inflightFallbacksRef.current.has(wordKey)) {
        if (showLoading && !cachedFallback?.isLoading) {
          const timer = window.setTimeout(() => {
            const latestFallback = fallbackMapRef.current[wordKey];
            if (latestFallback?.englishDefinition) return;

            setFallbackMap((prev) => ({
              ...prev,
              [wordKey]: {
                ...prev[wordKey],
                isLoading: true,
              },
            }));
          }, 180);
          pendingTimers.push(timer);
        }
        return;
      }

      let cancelled = false;
      inflightFallbacksRef.current.add(wordKey);

      if (showLoading) {
        const timer = window.setTimeout(() => {
          if (cancelled) return;
          setFallbackMap((prev) => ({
            ...prev,
            [wordKey]: {
              ...prev[wordKey],
              isLoading: true,
            },
          }));
        }, 180);
        pendingTimers.push(timer);
      }

      lookupWord(word.word)
        .then((result) => {
          if (cancelled) return;

          const englishDefinition = extractEnglishDefinition(result);
          setFallbackMap((prev) => ({
            ...prev,
            [wordKey]: {
              englishDefinition,
              isLoading: false,
            },
          }));
        })
        .catch(() => {
          if (cancelled) return;
          setFallbackMap((prev) => ({
            ...prev,
            [wordKey]: {
              ...prev[wordKey],
              isLoading: false,
            },
          }));
        })
        .finally(() => {
          inflightFallbacksRef.current.delete(wordKey);
        });

      cancels.push(() => {
        cancelled = true;
      });
    };

    ensureFallback(currentWord, true);
    ensureFallback(nextWord, false);

    return () => {
      pendingTimers.forEach((timer) => window.clearTimeout(timer));
      cancels.forEach((cancel) => cancel());
    };
  }, [currentWord, currentIndex, quizWords]);

  // Safety check to prevent crash if index goes out of bounds
  if (!currentWord && !isFinished && quizWords.length > 0) {
    return null; 
  }

  const handleMaster = (e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent card flip if needed
    markAsMastered(currentWord.id);
    toast.success("已标记为熟练，不再复习");
    
    // Auto advance
    nextWord();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // If status is 'wrong', user must type correctly to proceed
    if (status === "wrong") {
      const cleanInput = userAnswer.trim().toLowerCase();
      const target = currentWord.word.toLowerCase();
      if (cleanInput === target) {
        // Correct correction
        setStatus("idle"); // Reset to idle to allow next
        setUserAnswer("");
        nextWord();
      } else {
        // Still wrong
        // Shake animation is handled by CSS class, maybe trigger a re-render or toast
      }
      return;
    }

    if (status !== "idle") return; // Prevent double submit

    const cleanInput = userAnswer.trim().toLowerCase();
    const target = currentWord.word.toLowerCase();

    if (cleanInput === target) {
      setStatus("correct");
      setScore(s => s + 1);
      incrementReviewCount(currentWord.id, true);
      
      // Auto advance after short delay
      setTimeout(() => {
        nextWord();
      }, 1500);
    } else {
      setStatus("wrong");
      incrementReviewCount(currentWord.id, false);
      setUserAnswer(""); // Clear input for correction
    }
  };

  const nextWord = () => {
    if (currentIndex < quizWords.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer("");
      setStatus("idle");
    } else {
      setIsFinished(true);
    }
  };

  // Helper to blank out the word in the example sentence
  const getMaskedExample = (word: string, sentence: string) => {
    // Regex to match the word case-insensitively
    const regex = new RegExp(word, "gi");
    return sentence.replace(regex, "______");
  };

  if (quizWords.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl text-center">
          <p>没有足够的单词可供复习！</p>
          <button onClick={onClose} className="mt-4 text-primary-600">关闭</button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center"
        >
          <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            复习完成！
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
             本次复习: <span className="font-bold text-primary-600">{quizWords.length}</span> 个单词
          </p>
          
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-500 text-sm">正确率</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{Math.round((score / quizWords.length) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full transition-all duration-1000" 
                style={{ width: `${(score / quizWords.length) * 100}%` }}
              />
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-primary-200 dark:shadow-none"
          >
            返回生词本
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
          <span className="bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">
            {currentIndex + 1} / {quizWords.length}
          </span>
        </div>
        <button 
          onClick={onClose}
          className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentWord.id}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700"
          >
            {/* Card Content */}
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-1">
                    进度 {currentIndex + 1} / {quizWords.length}
                  </h3>
                  <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentIndex + 1) / quizWords.length) * 100}%` }}
                    />
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    triggerHaptic();
                    handleMaster(e);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-xs font-bold transition-transform active:scale-95 duration-100 touch-manipulation"
                  title="标记为熟练（不再复习）"
                >
                  <Trophy size={14} />
                  标熟
                </button>
              </div>

              {/* Definition */}
              <div className="mb-8 text-center">
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                  {currentWord.definition}
                </h3>
                {currentWord.phonetic && (
                  <button
                    type="button"
                    onClick={handlePlayPronunciation}
                    disabled={!pronunciationUrl}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-sm text-slate-500 dark:text-slate-300 transition-colors hover:bg-slate-200 dark:hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`播放 ${currentWord.word} 的发音`}
                  >
                    <Volume2 className="w-3 h-3" />
                    {currentWord.phonetic}
                  </button>
                )}
              </div>

              {/* Example Sentence */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl mb-8 relative">
                {currentWord.example?.trim() ? (
                  <>
                    <p className="text-lg leading-relaxed text-indigo-900 dark:text-indigo-200 font-medium text-center">
                      &quot;{getMaskedExample(currentWord.word, currentWord.example)}&quot;
                    </p>
                    {currentWord.exampleTranslation && (
                      <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-3 text-center border-t border-indigo-100 dark:border-indigo-800/50 pt-3">
                        {currentWord.exampleTranslation}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-300 text-center mb-3">
                      英文释义
                    </p>
                    <p className="text-lg leading-relaxed text-indigo-900 dark:text-indigo-200 font-medium text-center">
                      {fallbackInfo?.englishDefinition || (fallbackInfo?.isLoading ? "正在补充英文释义..." : "请根据中文释义回忆单词拼写")}
                    </p>
                  </>
                )}
              </div>

              {/* Input Area */}
              <form onSubmit={handleSubmit} className="relative">
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  // Disabled only if correct (waiting for next), but enabled if wrong (need correction)
                  disabled={status === "correct"}
                  autoFocus
                  className={`w-full text-center text-2xl font-bold py-4 rounded-xl border-2 outline-none transition-all ${
                    status === "correct" 
                      ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : status === "wrong"
                      ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 animate-shake"
                      : "border-slate-200 dark:border-slate-600 focus:border-primary-500 dark:bg-slate-900 dark:text-white"
                  }`}
                  placeholder={status === "wrong" ? "请重新输入正确拼写" : "输入拼写..."}
                />
                
                {status === "wrong" && (
                  <div className="mt-4 text-center animate-in fade-in slide-in-from-top-2">
                    <p className="text-red-500 font-medium mb-1">拼写错误，正确拼写是：</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 tracking-wider">
                      {currentWord.word}
                    </p>
                    <p className="text-sm text-slate-500 mt-2">请在上方输入框重新输入以继续</p>
                  </div>
                )}
                
                {status === "correct" && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                    <Check className="w-6 h-6" />
                  </div>
                )}
              </form>

              {/* Action Button */}
              <button
                onClick={() => {
                  triggerHaptic();
                  handleSubmit();
                }}
                disabled={status === "correct" || (status === "wrong" && userAnswer.trim().toLowerCase() !== currentWord.word.toLowerCase())}
                className={`w-full mt-8 py-4 rounded-xl font-bold text-lg transition-all active:scale-95 duration-100 touch-manipulation ${
                  status === "correct"
                    ? "bg-green-500 text-white shadow-lg shadow-green-200 dark:shadow-none scale-105"
                    : status === "wrong"
                    ? userAnswer.trim().toLowerCase() === currentWord.word.toLowerCase()
                      ? "bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-200 dark:shadow-none" // Ready to retry
                      : "bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500" // Locked
                    : "bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-200 dark:shadow-none hover:scale-[1.02]"
                }`}
              >
                {status === "correct" ? (
                  <span className="flex items-center justify-center gap-2">
                    <Check className="w-6 h-6" /> 正确!
                  </span>
                ) : status === "wrong" ? (
                  userAnswer.trim().toLowerCase() === currentWord.word.toLowerCase() ? "继续" : "请更正拼写"
                ) : (
                  "提交"
                )}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
