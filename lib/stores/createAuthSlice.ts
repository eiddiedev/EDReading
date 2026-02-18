/**
 * 认证状态切片 (Auth Slice)
 * 作用：管理用户登录状态、设备指纹及每日配额。
 * 定义：Zustand Store 的一部分，处理 Auth 和 Quota。
 * 逻辑：
 * 1. `setUser` / `logout`: 管理 Supabase 用户会话。
 * 2. `ensureDeviceId`: 生成或获取设备指纹，用于游客限流。
 * 3. `check...Quota`: 检查生成、导入、对话等操作的每日剩余额度。
 * 4. `scheduleMidnightReset`: 自动在午夜重置本地配额计数。
 */
import { StateCreator } from "zustand";
import { AppState, AuthSlice } from "./types";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { ADMIN_EMAIL, ADMIN_EMAILS } from "@/lib/constants";

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => {
  const getTodayKey = () => new Date().toISOString().slice(0, 10);
  const resetUsage = () => ({
    date: getTodayKey(),
    generate: 0,
    import: 0,
    chat: 0,
    sentenceAnalysisCount: 0,
    feedRefresh: 0,
  });

  let resetTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleMidnightReset = () => {
    if (resetTimer) {
      clearTimeout(resetTimer);
    }
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();
    resetTimer = setTimeout(async () => {
      set({ dailyUsage: resetUsage() });
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentDeviceId = get().deviceId;
      if (session?.user && currentDeviceId) {
        const today = getTodayKey();
        await supabase.from("profiles").upsert({
          id: session.user.id,
          email: session.user.email,
          device_id: currentDeviceId,
          usage_date: today,
          generate_count: 0,
          import_count: 0,
          chat_count: 0,
          updated_at: new Date().toISOString(),
        });
      }
      scheduleMidnightReset();
    }, msUntilMidnight);
  };

  const ensureDailyUsage = () => {
    const current = get().dailyUsage;
    if (!current || current.date !== getTodayKey()) {
      set({ dailyUsage: resetUsage() });
    }
    scheduleMidnightReset();
  };

  const checkAndIncrement = async (
    type: "generate" | "import" | "chat" | "sentenceAnalysisCount" | "feedRefresh",
    limit: number,
    message: string
  ) => {
    // Admin Unlimited Quota
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
       return true;
    }

    if (get().isAdmin) {
      return true;
    }

    ensureDailyUsage();
    const current = get().dailyUsage;
    const currentCount = current[type] || 0;
    if (type === "import") {
      if (currentCount >= 5) {
        toast.error("今日导入额度已用完 (每日限 5 篇)");
        return false;
      }
    } else if (currentCount >= limit) {
      toast.error(message);
      return false;
    }
    set({ dailyUsage: { ...current, [type]: currentCount + 1 } });
    return true;
  };

  return {
    user: null,
    setUser: (user) => set({ user, isAdmin: !!user?.email && ADMIN_EMAILS.includes(user.email) }),
    clearUser: () => set({ user: null, isAdmin: false }),
    logout: async () => {
      await supabase.auth.signOut();
      get().clearUser();
    },
    dailyUsage: resetUsage(),
    deviceId: null,
    isAdmin: false,
    ensureDailyUsage,
    ensureDeviceId: async () => {
      const existing = get().deviceId;
      if (existing) return existing;
      
      let deviceId: string;
      try {
        const agent = await FingerprintJS.load();
        const result = await agent.get();
        deviceId = result.visitorId;
      } catch (error) {
        console.warn("Fingerprint failed, using fallback:", error);
        // Fallback mechanism
        const storageKey = 'edreading_device_fallback_id';
        let fallbackId = localStorage.getItem(storageKey);
        if (!fallbackId) {
            fallbackId = `fallback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            localStorage.setItem(storageKey, fallbackId);
        }
        deviceId = fallbackId;
      }

      set({ deviceId });
      
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const today = getTodayKey();
          await supabase.from("profiles").upsert({
            id: session.user.id,
            email: session.user.email,
            device_id: deviceId,
            usage_date: today,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error("Profile update failed during init:", e);
      }
      
      return deviceId;
    },
    ensureAdmin: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const isAdmin = !!session?.user?.email && ADMIN_EMAILS.includes(session.user.email);
      set({ isAdmin });
      return isAdmin;
    },
    checkGenerateQuota: async () => {
      // Admin Unlimited Quota - Check directly with session to be sure
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
         return true;
      }
      
      // Also check store state as fallback
      if (get().isAdmin) {
        return true;
      }

      ensureDailyUsage();
      const current = get().dailyUsage;
      if (current.generate >= 5) {
        toast.error("今日生成额度已用完");
        return false;
      }
      
      if (!session?.user) {
        toast.error("请先登录再生成");
        return false;
      }
      const deviceId = await get().ensureDeviceId();
      if (!deviceId) {
        toast.error("设备指纹初始化失败");
        return false;
      }
      const today = getTodayKey();
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, device_id, usage_date, generate_count")
        .eq("id", session.user.id)
        .maybeSingle();
      if (profileError) {
        // Fail Open: 如果查询失败，允许用户继续（假设是网络问题或表结构问题）
        console.error("Profile check failed:", profileError);
        // toast.error("云端校验失败，请稍后再试");
        // return false;
      }
      const normalizedGenerate =
        profile?.usage_date === today ? profile?.generate_count ?? 0 : 0;
      if (
        !profile ||
        profile.device_id !== deviceId ||
        profile.usage_date !== today
      ) {
        const { error: upsertError } = await supabase.from("profiles").upsert({
          id: session.user.id,
          email: session.user.email,
          device_id: deviceId,
          usage_date: today,
          generate_count: normalizedGenerate,
          updated_at: new Date().toISOString(),
        });
        if (upsertError) {
          console.error("Profile init failed:", upsertError);
          // toast.error("云端校验失败，请稍后再试");
          // return false;
        }
      }
      const { data: deviceProfiles, error: deviceError } = await supabase
        .from("profiles")
        .select("generate_count, usage_date")
        .eq("device_id", deviceId);
      if (deviceError) {
        console.error("Device check failed:", deviceError);
        // toast.error("云端校验失败，请稍后再试");
        // return false;
      }
      const deviceTotal = (deviceProfiles || []).reduce((sum, row) => {
        if (row.usage_date !== today) return sum;
        return sum + (row.generate_count ?? 0);
      }, 0);
      if (deviceTotal >= 2) {
        toast.error("该设备今日生成额度已用完 (每日限 2 篇)");
        return false;
      }
      set({ dailyUsage: { ...current, generate: current.generate + 1 } });
      const { error: updateError } = await supabase.from("profiles").upsert({
        id: session.user.id,
        email: session.user.email,
        device_id: deviceId,
        usage_date: today,
        generate_count: normalizedGenerate + 1,
        updated_at: new Date().toISOString(),
      });
      if (updateError) {
        // Just log error, but allow generation since we already incremented local state
        console.error("Quota update failed:", updateError);
        // set({ dailyUsage: { ...current, generate: current.generate } });
        // toast.error("云端校验失败，请稍后再试");
        // return false;
      }
      return true;
    },
    checkImportQuota: () =>
      checkAndIncrement("import", 5, "今日导入额度已用完 (每日限 5 篇)"),
    checkChatQuota: () =>
      checkAndIncrement("chat", 50, "今日咨询额度已用完 (每日限 50 次)"),
    checkSentenceAnalysisQuota: () =>
      checkAndIncrement(
        "sentenceAnalysisCount",
        15,
        "今日 15 句精读分析配额已用完，请优先精读已分析的内容。"
      ),
    checkFeedRefreshQuota: () =>
      checkAndIncrement("feedRefresh", 5, "今日刷新次数已达上限 (5次)"),
  };
};
