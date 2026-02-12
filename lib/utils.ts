import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 安全触发轻微震动 (Haptic Feedback)
 * @param pattern 震动时长(ms)，默认为 10ms (极轻)
 */
export const triggerHaptic = (pattern: number | number[] = 10) => {
  // 1. 环境检测：确保在浏览器端
  if (typeof window === "undefined" || typeof navigator === "undefined") return;

  // 2. 能力检测：确保硬件支持且未被禁用
  // 注意：iOS Safari 通常不支持此 API，会直接返回 false，不会报错
  if (!navigator.vibrate) return;

  try {
    // 3. 执行震动 (静默捕获所有潜在异常)
    navigator.vibrate(pattern);
  } catch (e) {
    // 忽略所有错误，保证 App 不崩
    console.warn("Haptic feedback failed silently", e);
  }
};
