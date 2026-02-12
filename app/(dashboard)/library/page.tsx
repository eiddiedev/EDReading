"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { ArticleCard } from "@/components/ArticleCard";
import { PasteToReadModal } from "@/components/PasteToReadModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { TopicSelectionModal, IELTS_TOPICS } from "@/components/TopicSelectionModal";
import { Sparkles, Plus, Loader2, RefreshCw } from "lucide-react";
import { Article } from "@/types";
import { toast } from "sonner";

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<"mine" | "discover">("mine");
  const [isLoadingPublic, setIsLoadingPublic] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [generatingIds, setGeneratingIds] = useState<string[]>([]);

  const articles = useAppStore((state) => state.articles);
  const publicArticles = useAppStore((state) => state.publicArticles);
  const fetchPublicArticles = useAppStore((state) => state.fetchPublicArticles);
  const adminDeleteArticle = useAppStore((state) => state.adminDeleteArticle);
  const addArticle = useAppStore((state) => state.addArticle);
  const removeArticle = useAppStore((state) => state.removeArticle);
  const removeArticleLocal = useAppStore((state) => state.removeArticleLocal);
  const markAsRead = useAppStore((state) => state.markAsRead);
  const toggleReadStatus = useAppStore((state) => state.toggleReadStatus);
  const setArticles = useAppStore((state) => state.setArticles);
  const checkGenerateQuota = useAppStore((state) => state.checkGenerateQuota);
  const ensureDailyUsage = useAppStore((state) => state.ensureDailyUsage);
  const { isAdmin, ensureAdmin } = useAppStore((state) => ({
    isAdmin: state.isAdmin,
    ensureAdmin: state.ensureAdmin,
  }));

  const sortedMyArticles = useMemo(
    () => [...articles].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [articles]
  );

  const myArticlesWithStatus = useMemo(
    () =>
      sortedMyArticles.map((article) => ({
        ...article,
        isGenerating: generatingIds.includes(article.id),
      })),
    [sortedMyArticles, generatingIds]
  );

  const readCount = articles.filter((item) => item.isRead).length;
  const totalCount = articles.length;
  const progress = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;
  const showGeneratingBanner = isGenerating || generatingIds.length > 0;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const updateGeneratingIds = () => {
      const stored = JSON.parse(localStorage.getItem("generating_article_ids") || "[]");
      if (!isGenerating && stored.length > 0) {
        localStorage.setItem("generating_article_ids", "[]");
        setGeneratingIds([]);
        return;
      }
      const currentArticles = useAppStore.getState().articles;
      const cleaned = stored.filter((id: string) => !currentArticles.some((item) => item.id === id));
      if (cleaned.length !== stored.length) {
        localStorage.setItem("generating_article_ids", JSON.stringify(cleaned));
      }
      setGeneratingIds(cleaned);
    };
    updateGeneratingIds();
    const timer = setInterval(updateGeneratingIds, 1000);
    return () => clearInterval(timer);
  }, [isMounted, isGenerating]);

  useEffect(() => {
    if (!isMounted) return;
    let isActive = true;
    const loadUserArticles = async (userId: string) => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, title_zh, difficulty, word_count, tags, topic, created_at, is_public, user_id, is_read")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!isActive) return;
      if (error) {
        toast.error("同步文库失败");
        return;
      }
      const normalized = (data || []).map(
        (item: Article & { created_at?: string; word_count?: number; is_read?: boolean; is_public?: boolean }) => ({
          ...item,
          id: String(item.id),
          createdAt: item.createdAt || item.created_at || new Date().toISOString(),
          wordCount: item.wordCount ?? item.word_count ?? (item.content ? item.content.split(/\s+/).length : 0),
          isRead: item.isRead ?? item.is_read ?? false,
          is_public: item.is_public ?? false,
        })
      );
      const localOnly = useAppStore.getState().articles.filter((item) => item.is_local_only);
      const merged = [
        ...normalized,
        ...localOnly.filter((item) => !normalized.some((serverItem) => serverItem.id === item.id)),
      ];
      setArticles(merged);
    };
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isActive) return;
      const userId = session?.user?.id;
      const cachedUserId = localStorage.getItem("current_user_id");
      if (userId && userId !== cachedUserId) {
        setArticles([]);
        localStorage.setItem("current_user_id", userId);
      }
      if (userId) {
        await loadUserArticles(userId);
      }
    };
    void init();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id;
      const cachedUserId = localStorage.getItem("current_user_id");
      if (!userId) {
        localStorage.removeItem("current_user_id");
        setArticles([]);
        return;
      }
      if (userId !== cachedUserId) {
        setArticles([]);
        localStorage.setItem("current_user_id", userId);
      }
      void loadUserArticles(userId);
    });
    return () => {
      isActive = false;
      listener.subscription.unsubscribe();
    };
  }, [isMounted, setArticles]);

  useEffect(() => {
    if (!isMounted) return;
    void ensureAdmin();
  }, [isMounted, ensureAdmin]);

  const fetchPublicLibrary = useCallback(async () => {
    setIsLoadingPublic(true);
    try {
      await fetchPublicArticles();
    } catch (e) {
      // toast is handled in store
    } finally {
      setIsLoadingPublic(false);
    }
  }, [fetchPublicArticles]);

  useEffect(() => {
    if (activeTab !== "discover") return;
    void fetchPublicLibrary();
  }, [activeTab, fetchPublicLibrary]);

  const handleGenerate = async (prompt: string, topicId: string, difficulty: string, count = 1) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setIsTopicModalOpen(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        toast.error("请先登录再生成");
        return;
      }
      ensureDailyUsage();

      let resolvedPrompt = prompt;
      let resolvedTopicId = topicId;

      if (topicId === "rnd") {
        const candidates = IELTS_TOPICS.filter((topic) => topic.id !== "rnd");
        const randomTopic = candidates[Math.floor(Math.random() * candidates.length)];
        resolvedPrompt = randomTopic.prompt;
        resolvedTopicId = randomTopic.id;
      }

      for (let i = 0; i < count; i += 1) {
        try {
          if (!(await checkGenerateQuota())) break;
          const res = await fetch("/api/generate-ielts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topicPrompt: resolvedPrompt,
              topicId: resolvedTopicId,
              level: difficulty,
              userId,
            }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            toast.error(err.error || "生成失败，请重试");
            continue;
          }

          const data = await res.json();
          const articleId = String(data.id || `${Date.now()}-${i}`);
          const wordCount = data.wordCount ?? data.word_count ?? (data.content ? data.content.split(/\s+/).length : 0);
          const createdAt = data.created_at || data.createdAt || new Date().toISOString();

          const newArticle: Article = {
            id: articleId,
            title: data.title || "Untitled",
            title_zh: data.title_zh,
            content: data.content || "",
            difficulty: data.difficulty || difficulty,
            wordCount,
            createdAt,
            phrases: data.phrases || [],
            aiVocabulary: data.vocabulary || data.aiVocabulary || [],
            aiSentences: data.sentences || data.aiSentences || [],
            tags: data.tags || [],
            topic: data.topic,
            is_public: true,
          };

          const storedIds = JSON.parse(localStorage.getItem("generating_article_ids") || "[]");
          const nextIds = Array.from(new Set([...storedIds, articleId]));
          localStorage.setItem("generating_article_ids", JSON.stringify(nextIds));

          await addArticle(newArticle, true);
          const { data: { user } } = await supabase.auth.getUser();
          const { error } = await supabase.from("articles").insert([{
            id: newArticle.id,
            title: newArticle.title,
            title_zh: newArticle.title_zh,
            content: newArticle.content,
            difficulty: newArticle.difficulty,
            tags: newArticle.tags,
            is_public: true,
            user_id: user?.id,
          }]);
          if (error) {
            console.error("同步云端失败:", error);
          }

        } catch (error) {
          toast.error("生成失败，请重试");
        }
      }
    } finally {
      localStorage.setItem("generating_article_ids", "[]");
      setGeneratingIds([]);
      setIsGenerating(false);
      setActiveTab("mine");
      void fetchPublicLibrary();
    }
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    await removeArticle(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  const handlePublicAdd = async (article: Article, notify = true) => {
    const localId = `local-${article.id}`;
    const exists = articles.some((item) => item.id === localId);
    if (exists) {
      if (notify) toast.message("已在文库中");
      return;
    }
    const localArticle: Article = {
      ...article,
      id: localId,
      createdAt: new Date().toISOString(),
      is_public: false,
      is_local_only: true,
    };
    await addArticle(localArticle, false);
    if (notify) toast.success("已加入文库");
  };

  const handleAdminDeletePublic = async (id: string) => {
    await adminDeleteArticle(id);
    await fetchPublicLibrary();
  };

  if (!isMounted) return null;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            文库
            {showGeneratingBanner && (
              <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                AI 生成中…(๑˃̵ᴗ˂̵)
              </div>
            )}
          </h1>
          <div className="mt-2 flex items-center gap-4">
            <p className="text-slate-600 dark:text-slate-400">您的阅读收藏</p>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm border border-slate-200">
              <span className="text-sm font-medium">
                📚 阅读进度: <span className="text-primary-600">{readCount}</span> / {totalCount}
              </span>
              <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsTopicModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 min-h-[40px] rounded-full bg-indigo-600 text-white text-sm md:text-base font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            AI 生成
          </button>
          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 min-h-[40px] rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm md:text-base font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            导入文章
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-full w-fit mb-6">
        {[
          { id: "mine", label: "我的文章" },
          { id: "discover", label: "发现" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as "mine" | "discover")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "mine" && (
        <>
          {myArticlesWithStatus.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <p className="text-sm">暂无文章，去 AI 生成或导入一篇吧。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myArticlesWithStatus.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onDelete={handleDelete}
                  onRead={(id) => markAsRead(id)}
                  onToggleRead={(id) => toggleReadStatus(id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "discover" && (
        <>
          {isLoadingPublic ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-primary-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onRead={() => handlePublicAdd(article, false)}
                  onAdd={handlePublicAdd}
                  onAdminDelete={isAdmin ? handleAdminDeletePublic : undefined}
                />
              ))}
            </div>
          )}
        </>
      )}

      <TopicSelectionModal
        isOpen={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        onSelect={handleGenerate}
        isGenerating={isGenerating}
      />
      <PasteToReadModal isOpen={isPasteModalOpen} onClose={() => setIsPasteModalOpen(false)} />
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        title="删除文章"
        message="确定要删除这篇文章吗？该操作不可撤销。"
        confirmText="删除"
      />
    </main>
  );
}
