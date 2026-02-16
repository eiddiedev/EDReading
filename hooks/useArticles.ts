/**
 * 文章管理 Hook (useArticles)
 * 作用：封装文章列表的获取、分页加载、刷新及缓存逻辑。
 * 定义：自定义 React Hook，结合 Zustand store 使用。
 * 逻辑：
 * 1. 从 Supabase 获取文章列表，支持分页和筛选。
 * 2. 维护加载状态 (isLoading) 和总数 (totalCount)。
 * 3. 将获取的数据同步到全局 Store (`pagedArticles`) 以实现持久化和缓存。
 * 4. 提供 loadMore 和 refresh 方法供 UI 调用。
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Article } from "@/types";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";

interface UseArticlesProps {
  pageSize?: number;
  initialPage?: number;
  initialCount?: number;
}

export function useArticles({ pageSize = 20, initialPage = 1, initialCount }: UseArticlesProps = {}) {
  // Use global store for persistence
  const articles = useAppStore((state) => state.pagedArticles);
  const hasMore = useAppStore((state) => state.pagedHasMore);
  const page = useAppStore((state) => state.pagedPage);
  const setPagedState = useAppStore((state) => state.setPagedState);

  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Get current user ID from store or auth
  // We can use useAppStore to get updated user if available, or check session
  const fetchArticles = useCallback(async (targetPage: number, isRefresh = false, overrideLimit?: number) => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      // Calculate range
      let from: number, to: number;
      
      if (overrideLimit) {
          // Special case for restoration: fetch 0 to overrideLimit - 1
          from = 0;
          to = overrideLimit - 1;
      } else {
          from = (targetPage - 1) * pageSize;
          to = from + pageSize - 1;
      }

      const { data, error, count } = await supabase
        .from("articles")
        .select("id, title, title_zh, difficulty, word_count, tags, topic, created_at, is_public, user_id, is_read, content", { count: "exact" })
        .eq("user_id", session.user.id)
        .order("is_read", { ascending: true })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (count !== null) {
        setTotalCount(count);
      }

      const normalizedArticles = (data || []).map((item: any) => ({
        ...item,
        id: String(item.id),
        createdAt: item.created_at || new Date().toISOString(),
        wordCount: item.word_count || 0,
        isRead: item.is_read || false,
      }));

      // Update Store
      let newArticles = articles;
      let newHasMore = hasMore;
      let newPage = page;

      if (overrideLimit) {
        // If overriding, we replace all articles
        newArticles = normalizedArticles;
        // Update page based on limit
        newPage = Math.ceil(overrideLimit / pageSize);
      } else if (isRefresh || targetPage === 1) {
        newArticles = normalizedArticles;
        newPage = 1;
      } else {
        // Dedup based on ID
        const newIds = new Set(normalizedArticles.map((a: Article) => a.id));
        const filteredPrev = articles.filter(a => !newIds.has(a.id));
        newArticles = [...filteredPrev, ...normalizedArticles];
        newPage = targetPage;
      }

      // Check if we have more
      const currentFetchCount = data?.length || 0;
      // If overrideLimit, we check if total matches request
      if (overrideLimit) {
          if (currentFetchCount < overrideLimit) {
              newHasMore = false;
          } else {
              newHasMore = true;
          }
      } else {
          if (currentFetchCount < pageSize) {
            newHasMore = false;
          } else {
            newHasMore = true;
          }
      }
      
      setPagedState(newArticles, newHasMore, newPage);

    } catch (error) {
      console.error("Error fetching articles:", error);
      toast.error("获取文章列表失败");
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, articles, hasMore, page, setPagedState]);

  // Initial load
  useEffect(() => {
    // If we already have articles in store, and we are not forcing refresh, do nothing?
    // But what if user added new articles elsewhere?
    // For now, if store is empty, we fetch.
    // If store has data, we trust it for "Back" navigation.
    // But we might want to refresh if it's been a while? 
    // Let's rely on explicit refresh or empty state.
    
    if (articles.length === 0) {
        fetchArticles(1, true);
    }
  }, [fetchArticles, articles.length]); 

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      // setPage(nextPage); // Handled in fetchArticles -> setPagedState
      fetchArticles(nextPage);
    }
  }, [isLoading, hasMore, page, fetchArticles]);

  const refresh = useCallback(() => {
    // setPage(1);
    // setHasMore(true);
    fetchArticles(1, true);
  }, [fetchArticles]);


  return {
    articles,
    isLoading,
    hasMore,
    loadMore,
    refresh,
    totalCount
  };
}
