/**
 * 仪表盘布局组件，包含侧边栏、底部导航栏和全局公告，处理用户会话检查和每日配额初始化。
 */
"use client";

import { Sidebar } from "@/components/Navigation/Sidebar";
import { BottomTab } from "@/components/Navigation/BottomTab";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { GlobalAnnouncement } from "@/components/GlobalAnnouncement";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ensureDailyUsage = useAppStore((state) => state.ensureDailyUsage);
  const ensureDeviceId = useAppStore((state) => state.ensureDeviceId);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className="md:ml-64 pb-20 md:pb-0">
        <GlobalAnnouncement />
        {children}
        <footer className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500 py-4">
          <img src="/beian-icon.png" alt="公安备案" className="h-4 w-auto inline-block" />
          <a href="https://beian.mps.gov.cn/#/query/webSearch?code=61012502000367" target="_blank" rel="noreferrer">
            陕公网安备61012502000367号
          </a>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
            陕ICP备2026009305号-1
          </a>
        </footer>
      </div>
      <BottomTab />
    </div>
  );
}
