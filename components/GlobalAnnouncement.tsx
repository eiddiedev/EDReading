/**
 * 全局公告组件 (GlobalAnnouncement)
 * 作用：在应用顶部显示重要的系统通知或更新信息。
 * 定义：一个可关闭的顶部横幅组件。
 * 逻辑：
 * 1. 检查本地存储或会话状态，判断用户是否已关闭公告。
 * 2. 如果未关闭，显示配置的公告内容。
 * 3. 点击关闭后更新状态，避免重复显示。
 */
"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { X, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function GlobalAnnouncement() {
  const latestAnnouncement = useAppStore((state) => state.latestAnnouncement);
  const fetchAnnouncement = useAppStore((state) => state.fetchAnnouncement);
  const closeAnnouncement = useAppStore((state) => state.closeAnnouncement);

  useEffect(() => {
    fetchAnnouncement();
  }, [fetchAnnouncement]);

  if (!latestAnnouncement || !latestAnnouncement.content) return null;

  const { content, type, id } = latestAnnouncement;

  const getIcon = () => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case "warning":
        return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100";
      case "success":
        return "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100";
      default:
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100";
    }
  };

  return (
    <div className={cn("relative w-full px-4 py-3 border-b flex items-center justify-center text-sm font-medium", getStyles())}>
      <div className="flex items-center gap-3 max-w-4xl w-full mx-auto relative">
        <span className="shrink-0">{getIcon()}</span>
        <p className="flex-1 mr-8 text-center sm:text-left">{content}</p>
        <button
          onClick={() => closeAnnouncement(id)}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Close announcement"
        >
          <X className="w-4 h-4 opacity-70" />
        </button>
      </div>
    </div>
  );
}
