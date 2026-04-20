/**
 * 仪表盘布局组件，包含侧边栏、底部导航栏和全局公告，处理用户会话检查和每日配额初始化。
 */
"use client";

import { Sidebar } from "@/components/Navigation/Sidebar";
import { BottomTab } from "@/components/Navigation/BottomTab";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { GlobalAnnouncement } from "@/components/GlobalAnnouncement";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ensureDailyUsage = useAppStore((state) => state.ensureDailyUsage);
  const ensureDeviceId = useAppStore((state) => state.ensureDeviceId);
  const pathname = usePathname();
  const isFeaturedArticle = /^\/featured\/[^/]+$/.test(pathname);

  useEffect(() => {
    ensureDailyUsage();
    void ensureDeviceId();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      ensureDailyUsage();
      if (session) {
        void ensureDeviceId();
      }
    });
    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [ensureDailyUsage, ensureDeviceId]);

  return (
    <div className={isFeaturedArticle ? "min-h-screen bg-black" : "min-h-screen bg-slate-50 dark:bg-slate-900"}>
      {!isFeaturedArticle ? <Sidebar /> : null}
      <div className={isFeaturedArticle ? "" : "md:ml-64 pb-20 md:pb-0"}>
        {!isFeaturedArticle ? <GlobalAnnouncement /> : null}
        {children}
      </div>
      {!isFeaturedArticle ? <BottomTab /> : null}
    </div>
  );
}
