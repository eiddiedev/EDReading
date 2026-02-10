"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Book as BookIcon, Trash2, HardDrive, Loader2 } from "lucide-react";
import { getAllBooks, saveBook, deleteBook, Book } from "@/lib/storage";
import { saveBookFile } from "@/lib/book-storage";
import Link from "next/link";
import { toast } from "sonner";
import ePub from "epubjs";

export default function BookshelfPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const data = await getAllBooks();
      setBooks(data.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error("Failed to load books:", error);
      toast.error("无法加载书籍");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleLoadDemo = async () => {
    const toastId = toast.loading("正在下载测试书籍 (Alice in Wonderland)...");
    try {
      const response = await fetch("https://react-reader.metabits.no/files/alice.epub");
      if (!response.ok) throw new Error("Download failed");
      
      const arrayBuffer = await response.arrayBuffer();
      const blob = await response.blob();
      const bookId = "demo-alice";

      // 1. Save file to IDB
      await saveBookFile(bookId, blob);

      // 2. Save metadata
      const newBook: Book = {
        id: bookId,
        title: "Alice in Wonderland (Demo)",
        createdAt: Date.now(),
      };

      await saveBook(newBook);
      toast.success("测试书籍导入成功", { id: toastId });
      loadBooks();
    } catch (error) {
      console.error("Demo load failed:", error);
      toast.error("下载测试书籍失败，请检查网络", { id: toastId });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Basic Validation
    if (!file.name.endsWith('.epub')) {
      toast.error("只能导入 .epub 格式的电子书 (EPUB only)");
      return;
    }

    const toastId = toast.loading("正在导入书架...");

    try {
      const bookId = `book_${Date.now()}`;
      
      // 2. Save the ACTUAL FILE to IndexedDB
      await saveBookFile(bookId, file);

      // 3. Save Metadata (Title, etc.)
      // We still try to parse metadata for better UX, but prioritize saving the file first
      let title = file.name.replace('.epub', '');
      let author = "Unknown Author";
      let coverBase64 = undefined;

      try {
        const buffer = await file.arrayBuffer();
        const book = ePub(buffer);
        const metadata = await book.loaded.metadata;
        title = metadata.title || title;
        author = metadata.creator || author;
        
        const coverUrl = await book.coverUrl();
        if (coverUrl) {
          const response = await fetch(coverUrl);
          const blob = await response.blob();
          coverBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } catch (parseErr) {
        console.warn("Metadata parsing failed, using defaults", parseErr);
      }

      const newBook: Book = {
        id: bookId,
        title,
        author,
        cover: coverBase64,
        createdAt: Date.now(),
      };

      await saveBook(newBook);
      
      // 4. Success & Refresh
      toast.success("导入成功！", { id: toastId });
      loadBooks();
      
    } catch (err) {
      console.error(err);
      toast.error("导入失败：数据库写入错误", { id: toastId });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirm("确定要删除这本书吗？")) {
      try {
        await deleteBook(id);
        toast.success("已删除");
        loadBooks();
      } catch (error) {
        toast.error("删除失败");
      }
    }
  };

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                书架
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-slate-600 dark:text-slate-400">
                  管理您的 ePub 电子书收藏
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                  🔒 本地存储 • 不上传云端
                </span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLoadDemo}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
              >
                <BookIcon className="w-5 h-5" />
                <span className="hidden sm:inline">加载测试书籍</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleImportClick}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">导入 ePub</span>
              </motion.button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <BookIcon className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                书架空空如也
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                导入您的第一本 ePub 电子书开始阅读
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleImportClick}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                导入 ePub
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLoadDemo}
                className="inline-flex items-center gap-2 px-6 py-3 ml-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <BookIcon className="w-5 h-5" />
                加载测试书籍
              </motion.button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {books.map((book) => (
                <Link key={book.id} href={`/bookshelf/${book.id}`}>
                  <div className="group relative bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow aspect-[2/3] flex flex-col">
                    {/* Cover Image or Placeholder */}
                    <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                       {book.cover ? (
                         <img 
                           src={book.cover} 
                           alt={book.title} 
                           className="w-full h-full object-cover" 
                         />
                       ) : (
                         <>
                           {/* Default Cover - User specified */}
                           <img 
                             src="/default-cover.png" 
                             alt={book.title}
                             className="w-full h-full object-cover relative z-10"
                             onError={(e) => {
                               e.currentTarget.style.display = 'none';
                               e.currentTarget.parentElement?.querySelector('.gradient-fallback')?.classList.remove('hidden');
                             }}
                           />
                           
                           {/* Fallback Gradient (shown if default cover fails) */}
                           <div className="gradient-fallback hidden absolute inset-0 w-full h-full flex items-center justify-center">
                             <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${
                               ['from-blue-400 to-indigo-500', 'from-emerald-400 to-teal-500', 'from-orange-400 to-red-500', 'from-purple-400 to-pink-500', 'from-cyan-400 to-blue-500'][book.title.length % 5]
                             }`} />
                             
                             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent" />
                             
                             <BookIcon className={`w-12 h-12 opacity-40 relative z-10 ${
                               ['text-blue-700', 'text-emerald-700', 'text-orange-700', 'text-purple-700', 'text-cyan-700'][book.title.length % 5]
                             }`} />
                           </div>
                         </>
                       )}
                      
                      {/* Progress Badge - Moved to Top Left for better visibility */}
                      {book.progress !== undefined && book.progress > 0 && (
                        <div className="absolute top-2 left-2 z-20 bg-black/70 backdrop-blur-md text-white text-xs py-1 px-2.5 rounded-full font-medium shadow-sm border border-white/10">
                          已读 {book.progress}%
                        </div>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDelete(e, book.id)}
                        className="absolute top-2 right-2 p-1.5 bg-white/80 dark:bg-black/50 rounded-full text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="p-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <h3 className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2 text-sm h-10 leading-tight">
                        {book.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(book.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
      </main>
      
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".epub"
        className="hidden"
      />

      {/* Mobile FAB */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleImportClick}
        className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center z-40"
        aria-label="Import"
      >
        <Plus size={28} />
      </motion.button>
    </>
  );
}
