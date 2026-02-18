/**
 * 单词本页面，用于管理生词、进行 SRS 间隔复习和 AI 批量处理单词。
 */
"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { ImportModal } from "@/components/notebook/ImportModal";
import { ReviewSession } from "@/components/notebook/ReviewSession";
import { ReviewSetupModal } from "@/components/notebook/ReviewSetupModal";
import { ReviewReminder } from "@/components/notebook/ReviewReminder";
import { Trash2, Eye, EyeOff, Plus, PlayCircle, BookMarked, Shuffle, Search } from "lucide-react";
import { toast } from "sonner";
import { VocabularyWord } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

export default function NotebookPage() {
  const vocabulary = useAppStore((state) => state.vocabulary);
  const setVocabulary = useAppStore((state) => state.setVocabulary);
  const addVocabulary = useAppStore((state) => state.addVocabulary);
  const removeVocabulary = useAppStore((state) => state.removeVocabulary);
  const fetchReviewItems = useAppStore((state) => state.fetchReviewItems);
  const [showMeanings, setShowMeanings] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isReviewSessionOpen, setIsReviewSessionOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [reviewWords, setReviewWords] = useState<VocabularyWord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVocabulary = vocabulary.filter(v => 
    v.word.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const fetchVocabulary = async (userId: string) => {
      const { data, error } = await supabase
        .from('vocabulary')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: VocabularyWord[] = data.map((v: any) => ({
          id: v.id,
          word: v.word,
          phonetic: v.phonetic,
          definition: v.definition,
          example: v.example,
          exampleTranslation: v.translation,
          reviewCount: v.review_count,
          correctCount: v.correct_count || 0,
          createdAt: v.created_at,
          nextReviewAt: v.next_review_at,
          lastReviewed: v.last_reviewed_at,
          reviewStage: v.review_stage,
          masteryLevel: v.mastery_level,
          tags: v.tags || []
        }));
        setVocabulary(mapped);
      }
    };

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        fetchVocabulary(session.user.id);
      } else {
        setVocabulary([]); // Strict clear if no user
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchVocabulary(session.user.id);
      } else {
        setVocabulary([]); // Strict clear on logout/change
      }
    });

    return () => subscription.unsubscribe();
  }, [setVocabulary]);

  const handleStartReview = (count: number | 'all') => {
    let selectedWords = [...vocabulary];
    
    // 1. Shuffle
    selectedWords.sort(() => Math.random() - 0.5);

    // 2. Slice if not 'all'
    if (count !== 'all') {
      selectedWords = selectedWords.slice(0, count);
    }

    if (selectedWords.length === 0) {
      toast.error("没有单词可供复习！");
      return;
    }

    setReviewWords(selectedWords);
    setIsSetupModalOpen(false);
    setIsReviewSessionOpen(true);
  };

  const handleStartDailyReview = async () => {
    const loadingToast = toast.loading("正在同步复习进度...");
    await fetchReviewItems();
    
    // Filter due items from the current vocabulary list
    // Use getState() to access the most up-to-date state after the fetch
    const currentVocabulary = useAppStore.getState().vocabulary;
    const dueItems = currentVocabulary.filter(w => {
      // Must be due AND not mastered
      const isDue = w.nextReviewAt && new Date(w.nextReviewAt) <= new Date();
      const isNotMastered = (w.reviewStage || 0) < 100;
      return isDue && isNotMastered;
    });

    toast.dismiss(loadingToast);

    if (dueItems.length === 0) {
      toast.success("太棒了！今日没有需要复习的单词。");
      return;
    }

    setReviewWords(dueItems);
    setIsReviewSessionOpen(true);
  };

  const handleImport = async (words: string[]) => {
    setIsProcessing(true);
    const toastId = toast.loading(`🤖 AI is analyzing ${words.length} words...`);

    try {
      const res = await fetch("/api/batch-process-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
      });

      if (!res.ok) throw new Error("Processing failed");

      const data = await res.json();
      
      // Map API result to VocabularyWord type
      // Schema from API: { text, phonetic, definition, translation, example, tags }
      // Schema for Store: { id, word, phonetic, definition, example, exampleTranslation, createdAt, reviewCount }
      
      let addedCount = 0;
      if (data.results && Array.isArray(data.results)) {
        data.results.forEach((item: any) => {
           const newWord: VocabularyWord = {
             id: crypto.randomUUID(), // Use standard UUID
             word: item.text || item.word, // Fallback
             phonetic: item.phonetic,
             definition: item.definition,
             example: item.example,
             exampleTranslation: item.translation || item.exampleTranslation,
             createdAt: new Date().toISOString(),
             reviewCount: 0,
             correctCount: 0,
             // We can store tags if we add it to the schema later, currently ignored or we can put in definition?
             // Let's keep it simple for now.
           };
           addVocabulary(newWord);
           addedCount++;
        });
      }

      toast.success(`Successfully imported ${addedCount} words!`, { id: toastId });
      setIsImportModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Import failed. Please try again.", { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ReviewReminder />
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                词汇笔记本
              </h1>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                已保存 {vocabulary.length} 个单词
              </p>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSetupModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors shadow-sm"
              >
                <Shuffle className="w-5 h-5" />
                <span className="hidden sm:inline">抽查</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">导入单词</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMeanings(!showMeanings)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {showMeanings ? (
                  <>
                    <EyeOff className="w-5 h-5" />
                    <span className="hidden sm:inline">隐藏释义</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5" />
                    <span className="hidden sm:inline">显示释义</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="搜索单词..."
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg leading-5 bg-white dark:bg-slate-800 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <ReviewSetupModal 
            isOpen={isSetupModalOpen}
            onClose={() => setIsSetupModalOpen(false)}
            onStart={handleStartReview}
            totalWords={vocabulary.length}
          />

          <ImportModal 
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onImport={handleImport}
            isLoading={isProcessing}
            existingWords={vocabulary.map(v => v.word.toLowerCase())}
          />

          {isReviewSessionOpen && (
            <ReviewSession
              vocabulary={reviewWords}
              onClose={() => setIsReviewSessionOpen(false)}
            />
          )}

          {vocabulary.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400">
                还没有保存单词。开始阅读并点击单词将它们添加到笔记本！
              </p>
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredVocabulary.map((word) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    key={word.id}
                    className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow relative group"
                  >
                    <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            {word.word}
                            {word.phonetic && (
                                <span className="text-slate-500 dark:text-slate-400 text-sm font-normal font-mono">
                                {word.phonetic}
                                </span>
                            )}
                          </h3>
                        </div>
                        <button
                          onClick={() => removeVocabulary(word.id)}
                          className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-1">
                        {showMeanings ? (
                          <p className="text-slate-700 dark:text-slate-300 text-sm line-clamp-2">
                            {word.definition}
                          </p>
                        ) : (
                          <div className="h-6 flex items-center justify-start bg-slate-50 dark:bg-slate-900/50 rounded px-2">
                            <p className="text-slate-400 dark:text-slate-500 text-xs">
                              释义已隐藏
                            </p>
                          </div>
                        )}
                    </div>
                    
                    {/* Minimal stats indicator */}
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                       <span>复习: {word.reviewCount || 0}</span>
                       <span>{(word.reviewCount || 0) > 0 ? `${Math.round(((word.correctCount || 0) / (word.reviewCount || 1)) * 100)}%` : '-'}</span>
                    </div>

                  </motion.div>
                ))
              }
              </AnimatePresence>
            </motion.div>
          )}
        </main>
    );
}
