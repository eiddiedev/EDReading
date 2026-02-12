import { StateCreator } from "zustand";
import { AppState, AnnouncementSlice } from "./types";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ADMIN_EMAIL } from "@/lib/constants";

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
        console.error("Failed to fetch announcement:", error);
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
      console.error("Error fetching announcement:", e);
    }
  },

  publishAnnouncement: async (content, type) => {
    if (!content || content.trim().length === 0) {
      toast.error("公告内容不能为空");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || session.user.email !== ADMIN_EMAIL) {
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
    
    if (!session?.user || session.user.email !== ADMIN_EMAIL) {
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
