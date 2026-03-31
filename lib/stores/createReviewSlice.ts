/**
 * 复习状态切片 (Review Slice)
 * 作用：管理 SRS（间隔重复系统）复习单词的逻辑。
 * 定义：Zustand Store 的一部分，处理 Vocabulary 数据。
 * 逻辑：
 * 1. `addVocabulary`: 添加生词，初始化 SRS 状态。
 * 2. `submitReviewResult`: 提交复习结果，调用 `srs.ts` 计算下次复习时间。
 * 3. `fetchReviewItems`: 获取当前需要复习的单词列表。
 * 4. `markAsMastered`: 标记单词为“已掌握”，不再复习。
 * 5. 实时同步所有变更到 Supabase。
 */
import { StateCreator } from "zustand";
import { ReviewSlice, AppState } from "./types";
import { supabase } from "@/lib/supabase";
import { calculateNextReview } from "@/lib/utils/srs";
import { buildPronunciationAudioUrl } from "@/lib/pronunciation";
import { toast } from "sonner";

import { VocabularyWord } from "@/types";

function getVocabularyWriteErrorMessage(error: { message?: string; code?: string } | null | undefined) {
  const rawMessage = error?.message || "";
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("column") && normalized.includes("does not exist")) {
    return "生词本写入失败：dev 数据库的 vocabulary 表字段不完整，请同步最新迁移。";
  }

  if (normalized.includes("row-level security") || error?.code === "42501") {
    return "生词本写入失败：当前 dev 数据库的 vocabulary 表 RLS 策略或登录态有问题。";
  }

  if (normalized.includes("invalid input syntax for type uuid")) {
    return "生词本写入失败：vocabulary 表主键类型与当前代码不一致。";
  }

  return "添加单词失败，请检查数据库结构、RLS 策略或网络连接。";
}

export const createReviewSlice: StateCreator<AppState, [], [], ReviewSlice> = (set, get) => ({
  vocabulary: [],
  setVocabulary: (words) => set({ vocabulary: words }),
  
  addVocabulary: async (word) => {
    // Set next review to "Logical Today 4 AM" to ensure it's immediately due and aligned
    const now = new Date();
    const currentHour = now.getHours();
    let nextReview = new Date(now);
    // If before 4 AM, today's logical start was yesterday 4 AM
    if (currentHour < 4) {
      nextReview.setDate(nextReview.getDate() - 1);
    }
    nextReview.setHours(4, 0, 0, 0);
    
    const resolvedAudio = word.audio || buildPronunciationAudioUrl(word.word) || undefined;

    // Optimistic update
    set((state) => ({
      vocabulary: [
        ...state.vocabulary,
        {
          ...word,
          audio: resolvedAudio,
          reviewCount: word.reviewCount || 0,
          correctCount: word.correctCount || 0,
          reviewStage: 0,
          masteryLevel: 0,
          nextReviewAt: nextReview.toISOString(),
        },
      ],
    }));

    // Supabase Sync
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      set((state) => ({
        vocabulary: state.vocabulary.filter((v) => v.id !== word.id),
      }));
      toast.error("当前未登录或登录态失效，无法保存到生词本。");
      return false;
    }

    // Use crypto.randomUUID() if id is not a valid UUID, otherwise use provided id
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(word.id);
    const finalId = isUUID ? word.id : crypto.randomUUID();

    const { error } = await supabase.from("vocabulary").upsert({
      id: finalId,
      user_id: session.user.id,
      word: word.word,
      phonetic: word.phonetic,
      audio: resolvedAudio,
      definition: word.definition,
      translation: word.exampleTranslation,
      example: word.example,
      review_count: word.reviewCount || 0,
      correct_count: word.correctCount || 0,
      review_stage: 0,
      mastery_level: 0,
      next_review_at: nextReview.toISOString(),
      tags: [],
      created_at: word.createdAt,
    });

    if (error) {
      console.error("Failed to sync vocabulary to Supabase:", error);
      toast.error(getVocabularyWriteErrorMessage(error));
      set((state) => ({
        vocabulary: state.vocabulary.filter((v) => v.id !== word.id && v.id !== finalId),
      }));
      return false;
    }

    if (!isUUID) {
      set((state) => ({
        vocabulary: state.vocabulary.map(v => v.id === word.id ? { ...v, id: finalId } : v)
      }));
    }

    return true;
  },

  incrementReviewCount: async (id, isCorrect) => {
    // Legacy support wrapper
    get().submitReviewResult(id, isCorrect ?? true);
  },

  removeVocabulary: async (id) => {
    // Optimistic update
    set((state) => ({
      vocabulary: state.vocabulary.filter((v) => v.id !== id),
    }));

    // Supabase Sync
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase.from("vocabulary").delete().eq("id", id).eq("user_id", session.user.id);

      if (error) {
        console.error("Failed to delete vocabulary:", error);
        toast.error("删除单词失败");
        // Revert? Complex without keeping deleted item. 
        // For now, just notify. Ideally we should restore it.
      } else {
        toast.success("单词已删除");
      }
    }
  },

  submitReviewResult: async (id, isCorrect) => {
    const word = get().vocabulary.find((v) => v.id === id);
    if (!word) return;

    const currentStage = word.reviewStage || 0;
    const srsResult = calculateNextReview(currentStage, isCorrect);
    
    const newReviewCount = (word.reviewCount || 0) + 1;
    const newCorrectCount = isCorrect ? (word.correctCount || 0) + 1 : word.correctCount || 0;

    set((state) => ({
      vocabulary: state.vocabulary.map((v) =>
        v.id === id
          ? {
              ...v,
              reviewCount: newReviewCount,
              correctCount: newCorrectCount,
              lastReviewed: new Date().toISOString(),
              nextReviewAt: srsResult.nextReviewAt.toISOString(),
              reviewStage: srsResult.reviewStage,
              masteryLevel: srsResult.masteryLevel,
            }
          : v
      ),
    }));

    // Supabase Sync
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase.from("vocabulary").update({
        review_count: newReviewCount,
        correct_count: newCorrectCount,
        last_reviewed_at: new Date().toISOString(),
        next_review_at: srsResult.nextReviewAt.toISOString(),
        review_stage: srsResult.reviewStage,
        mastery_level: srsResult.masteryLevel,
      }).eq("id", id).eq("user_id", session.user.id);

      if (error) {
        console.error("Failed to sync review result:", error);
        toast.error("保存复习进度失败");
      }
    }
  },

  markAsMastered: async (id) => {
    // Optimistic update
    set((state) => ({
      vocabulary: state.vocabulary.map((v) =>
        v.id === id
          ? {
              ...v,
              reviewStage: 100, // Mastered
              masteryLevel: 100,
              nextReviewAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 100 years later
            }
          : v
      ),
    }));

    // Supabase Sync
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase.from("vocabulary").update({
        review_stage: 100,
        mastery_level: 100,
        next_review_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq("id", id).eq("user_id", session.user.id);

      if (error) {
        console.error("Failed to mark as mastered:", error);
        toast.error("标记熟练失败");
      }
    }
  },

  fetchReviewItems: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const now = new Date().toISOString();
    
    // Fetch items due for review AND items that are not mastered (stage != 100)
    // Note: We'll rely on next_review_at being in the future for mastered items,
    // but explicit filtering is safer if we want to list all vocab later.
    // For "review session", we only want due items.
    
    const { data, error } = await supabase
      .from('vocabulary')
      .select('*')
      .lte('next_review_at', now)
      // removed .lt('review_stage', 100) to prevent filtering out nulls
      .order('next_review_at', { ascending: true });

    if (error) {
      console.error("Error fetching review items:", error);
      return;
    }

    if (data) {
      const words: VocabularyWord[] = data.map((item: any) => ({
        id: item.id,
        word: item.word,
        definition: item.definition,
        exampleTranslation: item.translation,
        example: item.example,
        phonetic: item.phonetic,
        audio: item.audio,
        createdAt: item.created_at,
        reviewCount: item.review_count,
        correctCount: item.correct_count,
        lastReviewed: item.last_reviewed_at,
        nextReviewAt: item.next_review_at,
        reviewStage: item.review_stage,
        masteryLevel: item.mastery_level,
        tags: item.tags || []
      }));

      set((state) => {
        // Merge strategy:
        // We want to keep existing vocabulary (which might contain non-due items loaded elsewhere)
        // But update the ones we just fetched.
        const newVocab = [...state.vocabulary];
        words.forEach((w) => {
          const index = newVocab.findIndex(v => v.id === w.id);
          if (index !== -1) {
            newVocab[index] = { ...newVocab[index], ...w };
          } else {
            newVocab.push(w);
          }
        });
        return { vocabulary: newVocab };
      });
    }
  }
});
