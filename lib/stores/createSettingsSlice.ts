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
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsSlice> = (set, get) => ({
  isDarkMode: false,
  fontSize: 16,
  targetLevel: 'ielts', // Default

  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setFontSize: (size) => set({ fontSize: size }),

  fetchTargetLevel: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('target_level')
        .eq('id', session.user.id)
        .single();
      
      if (error) {
        // Ignore PGRST116 (No rows found)
        if (error.code !== 'PGRST116') {
          console.error('Failed to fetch target level:', error);
        }
        return;
      }

      if (data?.target_level) {
        set({ targetLevel: data.target_level });
      }
    } catch (err) {
      console.error('Fetch target level exception:', err);
    }
  },

  setTargetLevel: async (level: string) => {
    // Optimistic update
    set({ targetLevel: level });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return; // Guest user only updates local state

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ target_level: level, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);

      if (error) {
        console.error('Failed to update target level in DB:', error);
        toast.error('保存学习目标失败，请重试');
      }
    } catch (err) {
      console.error('Update target level exception:', err);
    }
  },
});
