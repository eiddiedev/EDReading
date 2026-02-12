"use client";

import Link from "next/link";
import { Article } from "@/types";
import { BookOpen, Trash2, Check, GraduationCap, Plus } from "lucide-react";
import { triggerHaptic } from "@/lib/utils";

interface ArticleCardProps {
  article: Article;
  onDelete?: (id: string) => void;
  onAdminDelete?: (id: string) => void;
  onRead?: (id: string) => void;
  onToggleRead?: (id: string) => void;
  onAdd?: (article: Article) => void;
}

// --- 核心升级：适配新的等级系统 ---
const difficultyColors: Record<string, string> = {
  // 新等级配色
  'CET-4': "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  'CET-6': "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  'PG-Entrance': "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
  'IELTS': "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400",
  'TOEFL': "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400",
  
  // 兼容旧数据
  Beginner: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  Intermediate: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  Advanced: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

const difficultyLabels: Record<string, string> = {
  'CET-4': "四级",
  'CET-6': "六级",
  'PG-Entrance': "考研",
  'IELTS': "雅思",
  'TOEFL': "托福",
  Beginner: "初级",
  Intermediate: "中级",
  Advanced: "高级",
};

export function ArticleCard({ article, onDelete, onAdminDelete, onRead, onToggleRead, onAdd }: ArticleCardProps) {
  // 如果数据库里的 difficulty 是新标签，就用新的颜色；否则用默认紫
  const difficultyColor = difficultyColors[article.difficulty] || "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400";
  const difficultyLabel = difficultyLabels[article.difficulty] || article.difficulty;

  // 智能标题逻辑 (保持不变)
  const isTitleZh = /[\u4e00-\u9fa5]/.test(article.title);
  let displayTitleEn = article.title;
  let displayTitleZh = article.title_zh;

  if (isTitleZh) {
     displayTitleZh = article.title;
     displayTitleEn = article.original_title || article.title; 
  } else {
     displayTitleEn = article.title;
     displayTitleZh = article.title_zh || article.original_title; 
  }

  // Fallback 逻辑
  if (!displayTitleZh && article.original_title && article.title !== article.original_title) {
      // 保持原有逻辑
  }

  const handleToggleRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleRead) {
      onToggleRead(article.id);
    }
  };

  return (
    <div className="relative h-full">
      {onAdminDelete && (
        <button
          className="absolute top-4 left-4 p-2 text-red-500 hover:text-red-600 transition-colors z-10 bg-white dark:bg-slate-800 rounded-full shadow-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAdminDelete(article.id);
          }}
        >
          <Trash2 size={18} />
        </button>
      )}
      <Link href={`/reader/${article.id}`} onClick={() => onRead && onRead(article.id)} className="block h-full">
        <div className={`group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 hover:border-teal-300 dark:hover:border-teal-700 cursor-pointer relative h-full flex flex-col ${article.isRead ? "opacity-60" : ""}`}>
          <div className="p-6 flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 mr-4">
              <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2 leading-snug">
                {displayTitleEn}
              </h3>
              {displayTitleZh && displayTitleZh !== displayTitleEn && (
                <p className="text-base text-slate-500 dark:text-slate-400 mt-2 line-clamp-1 font-sans">
                  {displayTitleZh}
                </p>
              )}
              {article.isGenerating && (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 rounded-lg mt-2 w-fit">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  AI 正在生成
                </div>
              )}
            </div>
            {article.isRead ? (
              <div 
                onClick={(e) => {
                  triggerHaptic();
                  handleToggleRead(e);
                }} 
                className="flex items-center gap-1.5 text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2.5 py-1.5 rounded-lg flex-shrink-0 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 transition-transform active:scale-95 duration-100 touch-manipulation z-10"
                title="点击标记为未读"
              >
                <Check size={14} />
                <span>已读</span>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center flex-shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-teal-500 group-hover:bg-teal-50 dark:group-hover:bg-teal-900/20 transition-colors">
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

          <div className="flex flex-wrap items-center gap-2 mt-auto pt-2">
            <span
              className={`flex items-center gap-1 px-2.5 py-1 md:px-3 text-[11px] md:text-xs font-bold uppercase tracking-wider rounded-full whitespace-nowrap ${difficultyColor}`}
            >
              {/* 加个小图标显得更专业 */}
              <GraduationCap size={12} />
              {difficultyLabel}
            </span>
            <span className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 whitespace-nowrap">
                • {article.wordCount || 0} 词
            </span>
            {onAdd && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAdd(article);
                }}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-teal-200 dark:border-teal-500/40 bg-teal-50/60 dark:bg-teal-900/20 px-2.5 py-1.5 md:px-3 min-h-[30px] text-[11px] md:text-xs font-semibold text-teal-600 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors whitespace-nowrap"
              >
                <Plus size={12} />
                加入文库
              </button>
            )}
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
    </div>
  );
}
