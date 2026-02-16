/**
 * 书籍阅读页面 (BookReaderPage)
 * 作用：加载并渲染特定 ID 的电子书。
 * 定义：动态路由页面，用于阅读导入的书籍。
 * 逻辑：
 * 1. 根据 URL 参数 ID 从 IndexedDB 加载书籍文件和元数据。
 * 2. 渲染 EpubReader 组件进行阅读。
 * 3. 处理手势返回（左滑退出）和键盘快捷键。
 * 4. 实时保存阅读进度。
 */
'use client';
import { useEffect, useRef, useState } from 'react';
import { getBook, getBookFile, getAllBooks, updateBookProgress } from '@/lib/storage';
import { useParams, useRouter } from 'next/navigation';
import { EpubReader } from '@/components/EpubReader';
import { Loader2 } from 'lucide-react';

export default function BookReaderPage() {
  const params = useParams();
  const router = useRouter();
  const [bookData, setBookData] = useState<ArrayBuffer | null>(null);
  const [bookTitle, setBookTitle] = useState<string>("");
  const [initialLocation, setInitialLocation] = useState<string | number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);
  const minSwipeDistance = 150; // 降低灵敏度

  useEffect(() => {
    const loadBook = async () => {
      try {
        const id = params.id as string;
        if (!id) return;
        
        // 1. 从合并后的 storage 逻辑获取文件
        const retrievedBlob = await getBookFile(id);

        if (!retrievedBlob) {
          throw new Error("找不到书籍文件。请返回书架重新导入。");
        }

        // 2. 获取书籍元数据
        const meta = await getBook(id);
        if (meta) {
          setBookTitle(meta.title);
          if (meta.position !== undefined) {
            setInitialLocation(meta.position);
          }
        } else {
          const allBooks = await getAllBooks();
          const fallback = allBooks.find(b => b.id === id);
          if (fallback) setBookTitle(fallback.title);
        }

        const buffer = await retrievedBlob.arrayBuffer();
        setBookData(buffer);

      } catch (err: any) {
        console.error("❌ Reader Error:", err);
        setError(err.message || "书籍加载失败");
      }
    };

    loadBook();
  }, [params.id]);

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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-500">
        <p className="text-lg mb-4 text-red-500 font-bold">{error}</p>
        <button 
          type="button"
          onClick={() => router.push('/bookshelf')} 
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md" 
        >
          返回书架重新导入
        </button>
      </div>
    );
  }

  if (!bookData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-slate-400 gap-4 bg-white dark:bg-slate-900">
        <Loader2 className="animate-spin w-10 h-10 text-indigo-600" />
        <span className="text-lg font-medium">正在解析书籍内容...</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative bg-white dark:bg-slate-900 overflow-hidden">
      <EpubReader
        url={bookData}
        title={bookTitle}
        initialLocation={initialLocation}
        onProgressChange={(loc, progress) => {
          const id = params.id as string;
          if (!id) return;
          void updateBookProgress(id, loc, progress);
        }}
      />
      <button 
        type="button"
        onClick={() => router.back()} 
        className="absolute top-4 left-16 z-50 bg-white/90 dark:bg-slate-800/90 p-2 rounded-full shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-all"
      > 
        <span className="text-xl font-bold">←</span>
      </button>
    </div> 
  );
}
