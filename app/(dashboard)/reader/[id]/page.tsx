"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { ImmersiveReader } from "@/components/ImmersiveReader";
import { EpubReader } from "@/components/EpubReader";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Article } from "@/types";
import { getBook, getBookFile, updateBookProgress } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id as string;
  const articleId = rawId ? decodeURIComponent(rawId) : "";
  const articles = useAppStore((state) => state.articles);
  const [article, setArticle] = useState<Article | null>(null);
  const [bookUrl, setBookUrl] = useState<string | null>(null);
  const [bookMetadata, setBookMetadata] = useState<any>(null);
  const [initialLocation, setInitialLocation] = useState<string | number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);
  const minSwipeDistance = 150; // 降低灵敏度

  useEffect(() => {
    if (!articleId) {
      setIsLoading(false);
      return;
    }

    // 1. Try finding in Articles Store
    const foundArticle = articles.find((a) => a.id === articleId);
    if (foundArticle && foundArticle.content) {
      setArticle(foundArticle);
      setIsLoading(false);
      return;
    }

    // 2. Try finding in Books (LocalStorage + IndexedDB)
    const loadBook = async () => {
      try {
        const meta = await getBook(articleId);
        if (meta) {
          setBookMetadata(meta);
          if (meta.position !== undefined) {
            setInitialLocation(meta.position);
          }
        }
        const blob = await getBookFile(articleId);
        if (blob) {
          if (blob.size === 0) {
            console.error("❌ Book file is empty (0 bytes)");
          } else {
            const safeBlob = new Blob([blob], { type: "application/epub+zip" });
            const url = URL.createObjectURL(safeBlob);
            setBookUrl(url);
          }
          setIsLoading(false);
          return true;
        }
        const storedBooks = localStorage.getItem('my_library');
        if (storedBooks) {
          const books = JSON.parse(storedBooks);
          const foundBook = books.find((b: any) => b.id === articleId);
          if (foundBook) {
            setBookMetadata(foundBook);
            if (foundBook.position !== undefined) {
              setInitialLocation(foundBook.position);
            }
            const blob = await getBookFile(articleId);
            if (blob) {
              if (blob.size === 0) {
                 console.error("❌ Book file is empty (0 bytes)");
              } else {
                 // Force MIME type for safety
                 const safeBlob = new Blob([blob], { type: "application/epub+zip" });
                 const url = URL.createObjectURL(safeBlob);
                 setBookUrl(url);
              }
            }
            setIsLoading(false);
            return true;
          }
        }
      } catch (error) {
        console.error("Failed to load book:", error);
      }
      return false;
    };

    const loadFallback = async () => {
      const loadedBook = await loadBook();
      if (loadedBook) return;
      try {
        const { data, error } = await supabase
          .from("articles")
          .select("*")
          .eq("id", articleId)
          .maybeSingle();
        if (error) {
          console.error("Failed to load article:", error);
        }
        if (data) {
          setArticle({
            ...data,
            id: String(data.id),
            createdAt: data.createdAt || data.created_at || new Date().toISOString(),
            wordCount: data.wordCount ?? data.word_count ?? (data.content ? data.content.split(/\s+/).length : 0),
            isRead: data.isRead ?? data.is_read ?? false,
            is_public: data.is_public ?? false,
          });
        }
      } catch (error) {
        console.error("Failed to load article:", error);
      }
      setIsLoading(false);
    };

    void loadFallback();
  }, [articles, articleId]);
  
  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (bookUrl) URL.revokeObjectURL(bookUrl);
    };
  }, [bookUrl]);

  // 处理加载超时（作为兜底方案）
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only force stop loading if we are still loading and haven't found anything
      // But since we have async book loading, we should be careful not to cut it off too early.
      // 5 seconds should be enough for IDB.
    }, 5000); 
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isEditable) return;
      if (e.key === "Escape" || e.key === "Backspace" || e.key === "ArrowLeft") {
        e.preventDefault();
        router.back();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      touchEndRef.current = null;
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      touchEndRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };
    const onTouchEnd = () => {
      const touchStart = touchStartRef.current;
      const touchEnd = touchEndRef.current;
      if (!touchStart || !touchEnd) return;

      // 1. 只有从屏幕左边缘开始的滑动才触发返回 (防止与文本选择冲突)
      if (touchStart.x > 50) return;

      // 2. 如果有文本选中，不触发返回
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;

      const xDistance = touchStart.x - touchEnd.x;
      const yDistance = touchStart.y - touchEnd.y;
      
      // Right Swipe (Start - End < -Distance) => End > Start + Distance => Left to Right
      const isRightSwipe = xDistance < -minSwipeDistance;
      const isHorizontal = Math.abs(xDistance) > Math.abs(yDistance) * 1.5;
      
      // 3. 仅允许从左向右滑动触发退出 (移除垂直滑动退出)
      if (isRightSwipe && isHorizontal) {
        router.back();
      }
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [router]);

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
        <main className={`mx-auto ${bookUrl ? 'w-full px-0 py-0' : 'max-w-4xl px-4 sm:px-6 lg:px-8 py-8'}`}>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 dark:text-slate-400">加载中...</p>
            </div>
          ) : article ? (
            <>
              {/* 顶部导航栏 - 始终显示 */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>返回</span>
                </button>
              </div>
              <ImmersiveReader 
                title={article.title}
                title_zh={article.title_zh}
                content={article.content} 
                phrases={article.phrases} 
                aiVocabulary={article.aiVocabulary} 
                tags={article.tags}
                topic={article.topic}
                wordCount={article.wordCount}
                createdAt={article.createdAt}
                difficulty={article.difficulty === "Beginner" ? "初级" : article.difficulty === "Intermediate" ? "中级" : "高级"}
              />
            </>
          ) : bookUrl ? (
            <div className="relative w-full h-[calc(100vh-64px)]">
               <div className="absolute top-4 left-4 z-50">
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full shadow-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors border border-slate-200 dark:border-slate-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">返回</span>
                </button>
               </div>
               <EpubReader 
                 url={bookUrl} 
                 title={bookMetadata?.title} 
                 initialLocation={initialLocation}
                 onProgressChange={(loc, progress) => {
                   if (!articleId) return;
                   void updateBookProgress(articleId, loc, progress);
                 }}
               />
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                内容未找到 (ID: {articleId})
              </p>
              <p className="text-sm text-slate-400 mb-6">
                可能是内容已被删除或链接错误
              </p>
              <Link
                href="/library"
                className="text-primary-600 dark:text-primary-400 hover:underline"
              >
                前往书架
              </Link>
            </div>
          )}
        </main>
    </div>
  );
}
