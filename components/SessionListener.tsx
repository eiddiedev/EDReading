/**
 * 会话监听器组件 (SessionListener)
 * 作用：全局监听用户认证会话状态的变化。
 * 定义：一个无 UI 的逻辑组件，通常挂载在根布局中。
 * 逻辑：
 * 1. 使用 Supabase `onAuthStateChange` 监听登录、登出、Token 刷新等事件。
 * 2. 当会话过期或用户登出时，执行清理操作（如清除本地状态、跳转登录页）。
 * 3. 同步服务端和客户端的会话状态。
 */
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
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        // 如果遇到 Refresh Token 错误，强制登出以清除无效状态
        if (error.message.includes("Refresh Token") || error.message.includes("refresh_token")) {
          console.warn("Session invalid (Refresh Token Not Found), signing out...");
          await supabase.auth.signOut();
          useAppStore.getState().clearUser();
          router.refresh();
        }
        return;
      }

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
