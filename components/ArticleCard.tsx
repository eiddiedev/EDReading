"use client";

import Link from "next/link";
import { Article } from "@/types";
import { BookOpen, Trash2, Check } from "lucide-react";

interface ArticleCardProps {
  article: Article;
  onDelete?: (id: string) => void;
  onRead?: (id: string) => void;
  onToggleRead?: (id: string) => void;
}

const difficultyColors: Record<string, string> = {
  Beginner: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  Intermediate: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  Advanced: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

const difficultyLabels: Record<string, string> = {
  Beginner: "初级",
  Intermediate: "中级",
  Advanced: "高级",
};

export function ArticleCard({ article, onDelete, onRead, onToggleRead }: ArticleCardProps) {
  const difficultyColor = difficultyColors[article.difficulty] || "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400";
  const difficultyLabel = difficultyLabels[article.difficulty] || article.difficulty;

  // Smart Title Logic for Backward Compatibility
  // New Articles: title=Eng, title_zh=Zh
  // Old Articles: title=Zh, original_title=Eng
  // The goal is to always show English as main, Chinese as subtitle
  const isTitleZh = /[\u4e00-\u9fa5]/.test(article.title);
  
  let displayTitleEn = article.title;
  let displayTitleZh = article.title_zh;

  if (isTitleZh) {
     // If main title is Chinese, try to find English title
     displayTitleZh = article.title;
     displayTitleEn = article.original_title || article.title; // Fallback to same if no english
  } else {
     // If main title is English (Standard)
     displayTitleEn = article.title;
     displayTitleZh = article.title_zh || article.original_title; // Some old records might store translation in original_title? Unlikely but safe.
  }

  // Fallback: If no Chinese title is found, use original logic to check if we can infer it
  if (!displayTitleZh && article.original_title && article.title !== article.original_title) {
      // Case where title is Chinese and original_title is English (Old schema)
      // Already handled by isTitleZh check, but double check
      if (article.title !== article.original_title) {
          // If title and original_title are different, one might be translation
          // We prefer English as Main
      }
  }

  const handleToggleRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleRead) {
      onToggleRead(article.id);
    }
  };

  return (
    <Link href={`/reader/${article.id}`} onClick={() => onRead && onRead(article.id)}>
      <div className={`group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 hover:border-primary-300 dark:hover:border-primary-700 cursor-pointer relative h-full flex flex-col ${article.isRead ? "opacity-60" : ""}`}>
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 mr-4">
              <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2 leading-snug">
                {displayTitleEn}
              </h3>
              {displayTitleZh && displayTitleZh !== displayTitleEn && (
                <p className="text-base text-slate-500 dark:text-slate-400 mt-2 line-clamp-1 font-sans">
                  {displayTitleZh}
                </p>
              )}
            </div>
            {article.isRead ? (
              <div 
                onClick={handleToggleRead} 
                className="flex items-center gap-1.5 text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2.5 py-1.5 rounded-lg flex-shrink-0 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors z-10"
                title="点击标记为未读 (Mark as Unread)"
              >
                <Check size={14} />
                <span>已读</span>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center flex-shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-primary-500 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
                <BookOpen className="w-5 h-5" />
              </div>
            )}
          </div>
          
          {/* Tags Row */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {article.tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-auto pt-2">
            <span
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${difficultyColor}`}
            >
              {difficultyLabel}
            </span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
               • {article.wordCount} 词
            </span>
          </div>
        </div>
        
        {onDelete && (
          <button
            className="absolute bottom-6 right-6 p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors z-10 opacity-0 group-hover:opacity-100 bg-white dark:bg-slate-800 rounded-full shadow-sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(article.id);
            }}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </Link>
  );
}
