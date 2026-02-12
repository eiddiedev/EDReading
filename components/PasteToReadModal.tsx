"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Article } from "@/types";
import { analyzeArticleWithAI } from "@/app/actions";
import { toast } from "sonner";

interface PasteToReadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasteToReadModal({ isOpen, onClose }: PasteToReadModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const difficultyOptions = [
    { value: "Beginner" as const, label: "初级" },
    { value: "Intermediate" as const, label: "中级" },
    { value: "Advanced" as const, label: "高级" },
  ];
  const { addArticle, dailyUsage, ensureDailyUsage, checkImportQuota } = useAppStore((state) => ({
    addArticle: state.addArticle,
    dailyUsage: state.dailyUsage,
    ensureDailyUsage: state.ensureDailyUsage,
    checkImportQuota: state.checkImportQuota,
  }));
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const remainingImport = Math.max(0, 20 - dailyUsage.import);

  useEffect(() => {
    ensureDailyUsage();
  }, [ensureDailyUsage]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    
    if (!content.trim()) {
      toast.error("请填写内容");
      return;
    }
    if (wordCount > 3000) {
      toast.error("内容超过 3000 词，已禁止导入");
      return;
    }
    if (remainingImport <= 0) {
      toast.error("今日导入额度已用完");
      return;
    }
    if (!checkImportQuota()) {
      return;
    }

    setIsAnalyzing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("请先登录再导入");
        setIsAnalyzing(false);
        return;
      }
      const levelMap: Record<typeof difficulty, string> = {
        Beginner: "CET-4",
        Intermediate: "IELTS",
        Advanced: "TOEFL",
      };
      const aiResult = await analyzeArticleWithAI(content.trim(), user.id, levelMap[difficulty]);

      const wordCount = content.split(/\s+/).length;
      const newArticle: Article = {
        id: Date.now().toString(),
        title: title.trim() || aiResult.title,
        title_zh: aiResult.title_zh,
        content: aiResult.content || content.trim(),
        difficulty,
        wordCount,
        createdAt: new Date().toISOString(),
        phrases: aiResult.phrases,
        aiVocabulary: aiResult.vocabulary,
        aiSentences: aiResult.sentences,
        tags: aiResult.tags,
      };

      addArticle(newArticle, false);
      setTitle("");
      setContent("");
      setDifficulty("Intermediate");
      onClose();
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("导入失败，请重试");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isAnalyzing ? undefined : onClose}
      />
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              导入文章 (Import)
            </h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI 解析
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={isAnalyzing}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              标题 (Title) <span className="text-slate-400 font-normal">- Optional (Auto-generated if empty)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isAnalyzing}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
              placeholder="输入文章标题"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              难度
            </label>
            <select
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as "Beginner" | "Intermediate" | "Advanced")
              }
              disabled={isAnalyzing}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
            >
              {difficultyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isAnalyzing}
              rows={12}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:opacity-50"
              placeholder="在此粘贴文章内容..."
            />
            <div className={`mt-2 text-xs ${wordCount > 3000 ? "text-red-500" : "text-slate-500"}`}>
              Word Count: {wordCount} / 3000
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isAnalyzing}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isAnalyzing || wordCount > 3000 || remainingImport <= 0}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${isAnalyzing || wordCount > 3000 || remainingImport <= 0 ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-primary-600 hover:bg-primary-700 text-white"}`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI 分析中...
                </>
              ) : (
                "创建文章"
              )}
            </button>
          </div>
          <div className="text-xs text-slate-400">
            今日剩余导入额度：{remainingImport} 篇
          </div>
        </div>
      </div>
    </div>
  );
}
