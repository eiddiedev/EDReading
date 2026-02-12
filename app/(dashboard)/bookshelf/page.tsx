"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Book as BookIcon, Trash2, Loader2 } from "lucide-react";
import { getAllBooks, saveBook, deleteBook, saveBookFile, clearLibrary, Book } from "@/lib/storage";
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.epub')) {
      toast.error("格式错误：仅支持 .epub 格式电子书");
      return;
    }

    const toastId = toast.loading("正在导入书架...");

    try {
      const bookId = `book_${Date.now()}`;
      await saveBookFile(bookId, file);

      let title = file.name.replace(/\.epub$/i, '');
      let author = "Unknown";
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
        console.warn("Metadata parsing failed:", parseErr);
      }

      const newBook: Book = {
        id: bookId,
        title,
        author,
        cover: coverBase64,
        createdAt: Date.now(),
        progress: 0,
      };

      await saveBook(newBook);
      toast.success("导入成功！", { id: toastId });
      loadBooks();
      
    } catch (err: any) {
      console.error(err);
      toast.error(`导入失败：${err.message || "存储空间可能已满"}`, { id: toastId });
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
        toast.error("删除失败，建议使用重置按钮");
      }
    }
  };

  const handleResetLibrary = async () => {
    if (confirm("⚠️ 警告：这会清空所有书籍和进度！\n\n仅在书籍无法删除或导入时使用此功能。")) {
      try {
        await clearLibrary();
        toast.success("书架已重置");
        loadBooks();
      } catch (e) {
        toast.error("重置失败");
      }
    }
  };

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                书架
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  🔒 仅本地存储 • 不上传云端
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                  📚 仅支持 .epub 格式
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleResetLibrary}
                className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 hover:underline px-2"
              >
                重置/修复数据库
              </button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleImportClick}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors shadow-sm font-medium"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">导入电子书</span>
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
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {books.map((book) => (
                <Link key={book.id} href={`/bookshelf/${book.id}`}>
                  <div className="group relative bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow aspect-[2/3] flex flex-col">
                    <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                       {book.cover ? (
                         /* eslint-disable-next-line @next/next/no-img-element */
                         <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                           <BookIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2" />
                           <span className="text-xs text-slate-400 line-clamp-2">{book.title}</span>
                         </div>
                       )}
                      {book.progress !== undefined && book.progress > 0 && (
                        <div className="absolute top-2 left-2 z-20 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold py-1 px-2 rounded-full shadow-sm border border-white/10">
                          {Math.round(book.progress)}%
                        </div>
                      )}
                      <button
                        onClick={(e) => handleDelete(e, book.id)}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-black/60 rounded-full text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="p-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <h3 className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2 text-sm h-10 leading-tight" title={book.title}>
                        {book.title}
                      </h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
      </main>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".epub" className="hidden" />
    </>
  );
}