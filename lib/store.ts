"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Article, VocabularyWord } from "@/types";

interface AppState {
  articles: Article[];
  vocabulary: VocabularyWord[];
  addArticle: (article: Article) => Promise<void>;
  removeArticle: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  toggleReadStatus: (id: string) => Promise<void>;
  addVocabulary: (word: VocabularyWord) => Promise<void>;
  removeVocabulary: (id: string) => Promise<void>;
  incrementReviewCount: (id: string, isCorrect?: boolean) => Promise<void>;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  setVocabulary: (words: VocabularyWord[]) => void;
  setArticles: (articles: Article[]) => void;
}

import { supabase } from "@/lib/supabase";

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      articles: [],
      vocabulary: [],
      isDarkMode: false,
      fontSize: 16,
      setVocabulary: (words) => set({ vocabulary: words }),
      setArticles: (articles) => set({ articles }),
      addArticle: async (article) => {
        // Supabase Sync (First)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // 1. Try Full Save (Best Case)
          const { error: fullError } = await supabase.from('articles').upsert({
            id: article.id,
            user_id: session.user.id,
            title: article.title,
            title_zh: article.title_zh,
            original_title: article.original_title,
            content: article.content,
            topic: article.topic,
            created_at: article.createdAt,
            difficulty: article.difficulty,
            word_count: article.wordCount,
            is_read: article.isRead,
            tags: article.tags
          });

          // 2. Fallback Save (If Schema Mismatch)
          if (fullError) {
             console.warn("Full save failed (likely schema mismatch), attempting fallback save...", fullError);
             
             // Try saving only core fields that are guaranteed to exist
             const { error: fallbackError } = await supabase.from('articles').upsert({
               id: article.id,
               user_id: session.user.id,
               title: article.title,
               content: article.content,
               created_at: article.createdAt,
               difficulty: article.difficulty,
               word_count: article.wordCount,
               is_read: article.isRead
             });

             if (fallbackError) {
                console.error("Fallback Insert Failed:", fallbackError);
                throw new Error(`Failed to save article to cloud: ${fallbackError.message}`);
             }
          }
        }
        
        // Local Update (After Supabase confirms)
        set((state) => ({
          articles: [article, ...state.articles],
        }));
      },
      removeArticle: async (id) => {
        set((state) => ({
          articles: state.articles.filter((a) => a.id !== id),
        }));

        // Supabase Sync
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('articles').delete().match({ id, user_id: session.user.id });
        }
      },
      markAsRead: async (id) => {
        set((state) => ({
          articles: state.articles.map((a) =>
            a.id === id ? { ...a, isRead: true } : a
          ),
        }));

        // Supabase Sync
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('articles').update({ is_read: true }).match({ id, user_id: session.user.id });
        }
      },
      toggleReadStatus: async (id) => {
        const article = get().articles.find(a => a.id === id);
        const newStatus = !article?.isRead;
        
        set((state) => ({
          articles: state.articles.map((a) =>
            a.id === id ? { ...a, isRead: newStatus } : a
          ),
        }));

        // Supabase Sync
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('articles').update({ is_read: newStatus }).match({ id, user_id: session.user.id });
        }
      },
      addVocabulary: async (word) => {
        set((state) => ({
          vocabulary: [...state.vocabulary, { 
            ...word, 
            reviewCount: word.reviewCount || 0,
            correctCount: word.correctCount || 0 
          }],
        }));

        // Supabase Sync
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('vocabulary').upsert({
            id: word.id,
            user_id: session.user.id,
            word: word.word,
            phonetic: word.phonetic,
            definition: word.definition,
            translation: word.exampleTranslation, // Note: mapping exampleTranslation to translation column based on schema
            example: word.example,
            review_count: word.reviewCount || 0,
            correct_count: word.correctCount || 0,
            tags: [], // Default empty for now
            created_at: word.createdAt
          });
        }
      },
      removeVocabulary: async (id) => {
        set((state) => ({
          vocabulary: state.vocabulary.filter((v) => v.id !== id),
        }));

        // Supabase Sync
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('vocabulary').delete().match({ id, user_id: session.user.id });
        }
      },
      incrementReviewCount: async (id, isCorrect) => {
        const word = get().vocabulary.find(v => v.id === id);
        if (!word) return;
        
        const newReviewCount = (word.reviewCount || 0) + 1;
        const newCorrectCount = isCorrect ? (word.correctCount || 0) + 1 : (word.correctCount || 0);

        set((state) => ({
          vocabulary: state.vocabulary.map((v) =>
            v.id === id
              ? {
                  ...v,
                  reviewCount: newReviewCount,
                  correctCount: newCorrectCount,
                  lastReviewed: new Date().toISOString(),
                }
              : v
          ),
        }));

        // Supabase Sync
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('vocabulary').update({
            review_count: newReviewCount,
            correct_count: newCorrectCount
          }).match({ id, user_id: session.user.id });
        }
      },
      toggleDarkMode: () =>
        set((state) => ({ isDarkMode: !state.isDarkMode })),
      setFontSize: (size) => set({ fontSize: size }),
    }),
    {
      name: "edreading-storage",
    }
  )
);
