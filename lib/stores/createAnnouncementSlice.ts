/**
 * 公告状态切片 (Announcement Slice)
 * 作用：管理系统公告的获取、发布和关闭状态。
 * 定义：Zustand Store 的一部分，处理 Announcement 相关逻辑。
 * 逻辑：
 * 1. `fetchAnnouncement`: 获取最新的活跃公告，检查本地是否已关闭。
 * 2. `publishAnnouncement`: 管理员发布新公告（需鉴权）。
 * 3. `revokeAllAnnouncements`: 管理员撤销所有公告。
 * 4. `closeAnnouncement`: 用户关闭公告，记录 ID 到 LocalStorage。
 */
import { StateCreator } from "zustand";
import { AppState, AnnouncementSlice } from "./types";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ADMIN_EMAIL, ADMIN_EMAILS } from "@/lib/constants";

function formatAnnouncementError(error: unknown) {
  if (!error || typeof error !== "object") return "unknown error";

  const maybeError = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
    name?: string;
  };

  return (
    maybeError.message ||
    maybeError.details ||
    maybeError.hint ||
    maybeError.code ||
    maybeError.name ||
    "unknown error"
  );
}

export const createAnnouncementSlice: StateCreator<AppState, [], [], AnnouncementSlice> = (set, get) => ({
  latestAnnouncement: null,

  fetchAnnouncement: async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        set({ latestAnnouncement: null });
        console.warn("Failed to fetch announcement:", formatAnnouncementError(error));
        return;
      }

      if (data) {
        // Check if user has closed this announcement locally
        const closedId = localStorage.getItem('closed_announcement_id');
        if (closedId !== data.id) {
            set({ latestAnnouncement: data });
        } else {
            set({ latestAnnouncement: null });
        }
      } else {
        set({ latestAnnouncement: null });
      }
    } catch (e) {
      set({ latestAnnouncement: null });
      console.warn("Error fetching announcement:", formatAnnouncementError(e));
    }
  },

  publishAnnouncement: async (content, type) => {
    if (!content || content.trim().length === 0) {
      toast.error("公告内容不能为空");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      toast.error("无权操作");
      return;
    }

    try {
      // 1. Deactivate all existing announcements
      await supabase
        .from('announcements')
        .update({ is_active: false })
        .eq('is_active', true);

      // 2. Insert new announcement
      const { error } = await supabase
        .from('announcements')
        .insert([{
          content,
          type,
          is_active: true
        }]);

      if (error) throw error;

      toast.success("公告已发布");
      // Refresh
      await get().fetchAnnouncement();
    } catch (e: any) {
      console.error("Publish failed:", e);
      toast.error(`发布失败: ${e.message || "未知错误"}`);
    }
  },

  revokeAllAnnouncements: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      console.warn("Revoke failed: Unauthorized or invalid session", session?.user?.email);
      toast.error("无权操作");
      return;
    }

    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: false })
        .eq('is_active', true);

      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }

      // Refresh
      await get().fetchAnnouncement();
      toast.success("已撤下所有公告");
    } catch (e: any) {
      console.error("Revoke failed:", e);
      toast.error("撤下失败");
    }
  },

  closeAnnouncement: (id) => {
    localStorage.setItem('closed_announcement_id', id);
    set({ latestAnnouncement: null });
  }
});
