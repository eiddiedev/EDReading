"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function SessionListener() {
  useEffect(() => {
    // 1. App 启动时，主动去 Supabase 拿最新的 Session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // 同步到 Zustand Store
        useAppStore.getState().setUser(session.user);
      }
    };
    checkSession();

    // 2. 监听 Auth 变化（包括 Token 自动刷新）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        useAppStore.getState().setUser(session?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        useAppStore.getState().clearUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
