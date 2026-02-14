"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function SessionListener() {
  const router = useRouter();
  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    // 1. App 启动时，主动去 Supabase 拿最新的 Session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // 同步到 Zustand Store
        useAppStore.getState().setUser(session.user);
        accessTokenRef.current = session.access_token;
      }
    };
    checkSession();

    // 2. 监听 Auth 变化（包括 Token 自动刷新）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }

      // 处理用户状态同步
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        useAppStore.getState().setUser(session?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        useAppStore.getState().clearUser();
        router.refresh(); // 退出登录时强制刷新
      }

      // 检查 Token 是否变化，如果变化则刷新路由以同步 Cookie
      const newAccessToken = session?.access_token;
      if (newAccessToken && newAccessToken !== accessTokenRef.current) {
        accessTokenRef.current = newAccessToken;
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
