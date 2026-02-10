"use client";

import { useState, useEffect } from "react";
import { VocabularyWord } from "@/types";
import { useAppStore } from "@/lib/store";
import { X, Check, RefreshCw, Trophy, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ReviewSessionProps {
  onClose: () => void;
  vocabulary: VocabularyWord[];
}

export function ReviewSession({ onClose, vocabulary }: ReviewSessionProps) {
  const incrementReviewCount = useAppStore((state) => state.incrementReviewCount);
  
  const [quizWords, setQuizWords] = useState<VocabularyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Initialize Quiz
  useEffect(() => {
    if (vocabulary.length > 0) {
      // Use provided words directly, assuming they are already selected/shuffled by parent
      setQuizWords(vocabulary);
    }
  }, [vocabulary]);

  const currentWord = quizWords[currentIndex];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
  const getMaskedExample = (word: string, sentence?: string) => {
    if (!sentence) return "暂无例句";
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
              {/* Definition */}
              <div className="mb-8 text-center">
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                  {currentWord.definition}
                </h3>
                {currentWord.phonetic && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-sm text-slate-500 dark:text-slate-300">
                    <Volume2 className="w-3 h-3" />
                    {currentWord.phonetic}
                  </div>
                )}
              </div>

              {/* Example Sentence */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl mb-8 relative">
                <p className="text-lg leading-relaxed text-indigo-900 dark:text-indigo-200 font-medium text-center">
                  "{getMaskedExample(currentWord.word, currentWord.example)}"
                </p>
                {currentWord.exampleTranslation && (
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-3 text-center border-t border-indigo-100 dark:border-indigo-800/50 pt-3">
                    {currentWord.exampleTranslation}
                  </p>
                )}
              </div>

              {/* Input Area */}
              <form onSubmit={handleSubmit} className="relative">
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  disabled={status !== "idle"}
                  autoFocus
                  className={`w-full text-center text-2xl font-bold py-4 rounded-xl border-2 outline-none transition-all ${
                    status === "correct" 
                      ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : status === "wrong"
                      ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 animate-shake"
                      : "border-slate-200 dark:border-slate-600 focus:border-primary-500 dark:bg-slate-900 dark:text-white"
                  }`}
                  placeholder="输入拼写..."
                />
                
                {status === "correct" && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                    <Check className="w-6 h-6" />
                  </div>
                )}
              </form>

              {/* Feedback Area */}
              <div className="h-12 mt-4 flex items-center justify-center">
                {status === "wrong" && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center"
                  >
                    <p className="text-red-500 font-medium text-sm mb-1">回答错误，正确答案是：</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{currentWord.word}</p>
                  </motion.div>
                )}
                {status === "wrong" && (
                  <button 
                    onClick={nextWord}
                    className="absolute bottom-8 right-8 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    下一个 →
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
