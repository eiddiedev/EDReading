"use client";

import { useEffect, useMemo, useState, useCallback, useLayoutEffect } from "react";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { ArticleCard } from "@/components/ArticleCard";
import { PasteToReadModal } from "@/components/PasteToReadModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { TopicSelectionModal, IELTS_TOPICS } from "@/components/TopicSelectionModal";
import { Sparkles, Plus, Loader2, RefreshCw } from "lucide-react";
import { Article } from "@/types";
import { toast } from "sonner";
import { triggerHaptic } from "@/lib/utils";
import { useArticles } from "@/hooks/useArticles";
import { InView } from "react-intersection-observer";

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<"mine" | "discover">("mine");
  const [isLoadingPublic, setIsLoadingPublic] = useState(false);
  const [isLoadingMine, setIsLoadingMine] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [generatingIds, setGeneratingIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(100);
  const libraryLoadedCount = useAppStore((state) => state.libraryLoadedCount);
  const setLibraryLoadedCount = useAppStore((state) => state.setLibraryLoadedCount);

  // Task 3: Responsive Page Size
  useEffect(() => {
    // Initial check
    const isMobile = window.innerWidth < 768;
    setPageSize(isMobile ? 5 : 100);

    const updatePageSize = () => {
      setPageSize(window.innerWidth < 768 ? 5 : 100);
    };
    
    window.addEventListener("resize", updatePageSize);
    return () => window.removeEventListener("resize", updatePageSize);
  }, []);

  // Task 2: Server-Side Pagination
  const { 
    articles: pagedArticles, 
    isLoading: isLoadingPaged, 
    hasMore, 
    loadMore, 
    refresh: refreshArticles 
  } = useArticles({ pageSize, initialCount: libraryLoadedCount });

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
  const libraryScrollPosition = useAppStore((state) => state.libraryScrollPosition);
  const setLibraryScrollPosition = useAppStore((state) => state.setLibraryScrollPosition);
  const checkGenerateQuota = useAppStore((state) => state.checkGenerateQuota);
  const ensureDailyUsage = useAppStore((state) => state.ensureDailyUsage);
  const { isAdmin, ensureAdmin } = useAppStore((state) => ({
    isAdmin: state.isAdmin,
    ensureAdmin: state.ensureAdmin,
  }));

  // Use pagedArticles for display instead of store.articles when in 'mine' tab
  // But we must also include local-only articles that haven't been synced or are offline
  const displayArticles = useMemo(() => {
    if (activeTab !== "mine") return articles;

    const localOnly = articles.filter(a => a.is_local_only);
    const merged = [...localOnly, ...pagedArticles];
    
    // Dedup by ID
    const uniqueMap = new Map();
    merged.forEach(item => uniqueMap.set(item.id, item));
    
    // Sort by isRead (unread first) then created time desc
    return Array.from(uniqueMap.values()).sort((a, b) => {
      // 1. Sort by Read status (Unread first = false < true)
      const isReadA = !!a.isRead;
      const isReadB = !!b.isRead;
      if (isReadA !== isReadB) {
        return isReadA ? 1 : -1;
      }
      // 2. Sort by Date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [activeTab, articles, pagedArticles]);

  // Sync loaded count to store for scroll restoration support
  useEffect(() => {
    if (activeTab === "mine" && displayArticles.length > 0) {
      setLibraryLoadedCount(displayArticles.length);
    }
  }, [displayArticles.length, activeTab, setLibraryLoadedCount]);

  useEffect(() => {
    if (activeTab === "mine") {
      setIsLoadingMine(isLoadingPaged);
    }
  }, [isLoadingPaged, activeTab]);

  const myArticlesWithStatus = useMemo(
    () =>
      displayArticles.map((article) => ({
        ...article,
        isGenerating: generatingIds.includes(article.id),
      })),
    [displayArticles, generatingIds]
  );

  const readCount = displayArticles.filter((item) => item.isRead).length;
  const totalCount = displayArticles.length;
  const progress = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;
  const showGeneratingBanner = isGenerating || generatingIds.length > 0;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Scroll Restoration Logic
  // 1. Save scroll position on unmount (navigation or tab switch)
  useEffect(() => {
    return () => {
      // Only save if we are in 'mine' tab and not generating
      if (activeTab === "mine") {
        setLibraryScrollPosition(window.scrollY);
      }
    };
  }, [activeTab, setLibraryScrollPosition]);

  // 2. Restore scroll position when data is ready
  useLayoutEffect(() => {
    // Only restore if we have articles loaded and a saved position
    if (isMounted && activeTab === "mine" && libraryScrollPosition > 0 && displayArticles.length > 0) {
      // Restore immediately if data is present
      window.scrollTo(0, libraryScrollPosition);
    }
  }, [isMounted, activeTab, libraryScrollPosition, displayArticles.length]);

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
    
    // Disable old full-sync logic if using pagination
    /*
    let isActive = true;
    const loadUserArticles = async (userId: string) => {
      // ... logic disabled
    };
    */
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
          
          // Task 1: Explicit insert handled here, but addArticle also syncs. 
          // We keep this as is, but ensure we handle errors if any.
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
          // Task 1: Show specific error if storage limit exceeded
          if (error instanceof Error) {
            toast.error(error.message);
          } else {
            toast.error("生成失败，请重试");
          }
        }
      }
    } finally {
      localStorage.setItem("generating_article_ids", "[]");
      setGeneratingIds([]);
      setIsGenerating(false);
      setActiveTab("mine");
      void fetchPublicLibrary();
      // Task 2: Refresh list after generation
      refreshArticles();
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

    // Ensure content is available before adding
    let content = article.content;
    let wordCount = article.wordCount;

    if (!content) {
        try {
            const { data, error } = await supabase
                .from("articles")
                .select("content, word_count")
                .eq("id", article.id)
                .single();
            
            if (!error && data) {
                content = data.content;
                wordCount = data.word_count || wordCount;
            }
        } catch (e) {
            console.error("Failed to fetch content for public article:", e);
        }
    }

    const localArticle: Article = {
      ...article,
      id: localId,
      content: content || "", // Fallback to empty string if still missing
      wordCount: wordCount || 0,
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
            onClick={() => {
              triggerHaptic();
              setIsTopicModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 min-h-[40px] rounded-full bg-indigo-600 text-white text-sm md:text-base font-medium hover:bg-indigo-700 transition-transform active:scale-95 duration-100 touch-manipulation whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            AI 生成
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setIsPasteModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 min-h-[40px] rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm md:text-base font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-transform active:scale-95 duration-100 touch-manipulation whitespace-nowrap"
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
                ? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "mine" && (
        <>
          {isLoadingMine && myArticlesWithStatus.length === 0 ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-primary-600" />
            </div>
          ) : myArticlesWithStatus.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <p className="text-sm">暂无文章，去 AI 生成或导入一篇吧。</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myArticlesWithStatus.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onDelete={handleDelete}
                    onToggleRead={(id) => toggleReadStatus(id)}
                    onClick={() => setLibraryScrollPosition(window.scrollY)}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center py-6">
                  <InView
                    as="div"
                    onChange={(inView) => {
                      if (inView && !isLoadingPaged) loadMore();
                    }}
                  >
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </InView>
                </div>
              )}
            </>
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
      <PasteToReadModal 
        isOpen={isPasteModalOpen} 
        onClose={() => setIsPasteModalOpen(false)} 
        onSuccess={refreshArticles}
      />
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
