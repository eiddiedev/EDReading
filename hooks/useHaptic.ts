/**
 * 触觉反馈 Hook (useHaptic)
 * 作用：提供简易的震动反馈功能，增强用户交互体验。
 * 定义：封装 navigator.vibrate API 的 Hook。
 * 逻辑：
 * 1. 检查浏览器是否支持 vibrate API。
 * 2. 提供 triggerHaptic 函数，执行短震动（默认 10ms）。
 */
"use client";

import { useCallback } from "react";

export const useHaptic = () => {
  const triggerHaptic = useCallback(() => {
    // Check if navigator.vibrate is supported
    if (typeof window !== "undefined" && navigator.vibrate) {
      // Trigger a short vibration (10ms)
      navigator.vibrate(10);
    }
  }, []);

  return { triggerHaptic };
};
