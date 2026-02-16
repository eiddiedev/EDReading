/**
 * 主题提供者组件 (ThemeProvider)
 * 作用：为应用提供明亮/暗黑模式的主题切换能力。
 * 定义：基于 `next-themes` 库的封装组件。
 * 逻辑：
 * 1. 包裹应用根组件，注入主题上下文。
 * 2. 处理系统主题跟随及用户手动切换主题的持久化。
 * 3. 解决服务端渲染与客户端主题不匹配的水合问题（Hydration Mismatch）。
 */
"use client";

import * as React from "react";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isDarkMode = useAppStore((state) => state.isDarkMode);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDarkMode]);

  return <>{children}</>;
}
