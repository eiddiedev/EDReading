/**
 * 复习提醒组件，基于艾宾浩斯遗忘曲线显示今日待复习和已复习的单词数量。
 */
import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { ReviewSession } from "@/components/notebook/ReviewSession";
import { BookMarked, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export function ReviewReminder() {
  const [serverCounts, setServerCounts] = useState({ due: 0, mastered: 0, todayReviewed: 0 });
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const vocabulary = useAppStore((state) => state.vocabulary);
  const fetchReviewItems = useAppStore((state) => state.fetchReviewItems);

  // Calculate counts based on local vocabulary
  // We prioritize local data if available to reflect immediate changes (like adding words)
  const localCounts = useMemo(() => {
    if (vocabulary.length === 0) return null;

    const now = new Date();
    const todayDateString = now.toDateString();

    const due = vocabulary.filter(w => {
      if ((w.reviewStage || 0) >= 100) return false;
      if (!w.nextReviewAt) return true; // Safety: if no date, assume due
      return new Date(w.nextReviewAt) <= now;
    }).length;

    const mastered = vocabulary.filter(w => (w.reviewStage || 0) >= 100).length;

    const todayReviewed = vocabulary.filter(w => 
      w.lastReviewed && new Date(w.lastReviewed).toDateString() === todayDateString
    ).length;

    return { due, mastered, todayReviewed };
  }, [vocabulary]);

  // Initial fetch from Supabase (only if local store is empty)
  useEffect(() => {
    if (vocabulary.length === 0) {
      const fetchCounts = async () => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const nowISO = now.toISOString();
        
        // Due Count (next_review_at <= now AND not mastered)
        const { count: due } = await supabase
          .from('vocabulary')
          .select('*', { count: 'exact', head: true })
          .lte('next_review_at', nowISO);
          // Removed .lt('review_stage', 100) to ensure we don't miss items with null stage
        
        // Mastered Count
        const { count: mastered } = await supabase
          .from('vocabulary')
          .select('*', { count: 'exact', head: true })
          .gte('review_stage', 100);

        // Today Reviewed Count (last_reviewed_at >= today 00:00)
        const { count: todayReviewed } = await supabase
          .from('vocabulary')
          .select('*', { count: 'exact', head: true })
          .gte('last_reviewed_at', todayStart);

        setServerCounts({
          due: due || 0,
          mastered: mastered || 0,
          todayReviewed: todayReviewed || 0
        });
      };
      
      fetchCounts();
    }
  }, [vocabulary.length]);

  // Use local counts if available, otherwise fallback to server counts
  const { due: dueCount, mastered: masteredCount, todayReviewed: todayReviewedCount } = localCounts || serverCounts;

  const handleStartReview = async () => {
    await fetchReviewItems();
    setIsReviewOpen(true);
  };

  // Logic: Always show component if user has vocabulary. 
  // If user has 0 words total, maybe hide it? Or show "Start adding words!" state?
  // For now, let's keep showing it if there's any vocabulary, or just return null if total vocab is 0.
  if (vocabulary.length === 0 && dueCount === 0 && todayReviewedCount === 0 && masteredCount === 0) return null;

  const isTaskCompleted = dueCount === 0;

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mb-8 p-6 rounded-2xl shadow-lg relative overflow-hidden transition-colors duration-500 ${
          isTaskCompleted 
            ? "bg-gradient-to-r from-emerald-500 to-teal-600" 
            : "bg-gradient-to-r from-indigo-500 to-purple-600"
        }`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl -ml-12 -mb-12"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              {isTaskCompleted ? (
                <CheckCircle2 className="w-6 h-6 text-white" />
              ) : (
                <BookMarked className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {isTaskCompleted ? "今日任务已完成" : "每日复习挑战"}
              </h3>
              
              <div className="flex gap-4 text-sm mt-2 bg-black/10 p-2 rounded-lg backdrop-blur-sm"> 
                <span className="text-emerald-100 font-medium">今日已复习: {todayReviewedCount}</span> 
                <span className="text-amber-100 font-bold">今日待完成: {dueCount}</span> 
              </div>
              
              <div className="text-[10px] text-white/70 mt-1.5 font-medium tracking-wide">
                🧠 基于艾宾浩斯遗忘曲线 (Forgetting curve)
              </div>
            </div>
          </div>
          
          {isTaskCompleted ? (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-6 py-3 bg-white/20 text-white font-bold rounded-xl flex items-center gap-2 cursor-default"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Great Job!</span>
            </motion.div>
          ) : (
            <button 
              onClick={handleStartReview}
              className="group flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm"
            >
              开始复习
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </motion.div>

      {isReviewOpen && (
        <ReviewSession 
          vocabulary={vocabulary.filter(w => w.nextReviewAt && new Date(w.nextReviewAt) <= new Date())} 
          onClose={() => {
            setIsReviewOpen(false);
          }} 
        />
      )}
    </>
  );
}
