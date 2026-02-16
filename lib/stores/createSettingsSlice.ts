/**
 * 设置状态切片 (Settings Slice)
 * 作用：管理应用的用户偏好设置。
 * 定义：Zustand Store 的一部分，轻量级状态。
 * 逻辑：
 * 1. `isDarkMode`: 控制暗黑模式（实际由 ThemeProvider 处理，此处可能用于同步或备用）。
 * 2. `fontSize`: 全局阅读字体大小设置。
 */
import { StateCreator } from "zustand";
import { AppState, SettingsSlice } from "./types";

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsSlice> = (set) => ({
  isDarkMode: false,
  fontSize: 16,
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setFontSize: (size) => set({ fontSize: size }),
});
