"use client";

import { Sidebar } from "@/components/Navigation/Sidebar";
import { BottomTab } from "@/components/Navigation/BottomTab";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Check for invalid session (e.g. invalid refresh token) on mount
    const checkSession = async () => {
      const { error } = await supabase.auth.getSession();
      if (error && (error.message.includes("Refresh Token") || error.message.includes("refresh_token"))) {
        console.warn("Invalid session detected, signing out...");
        await supabase.auth.signOut();
      }
    };
    checkSession();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className="md:ml-64 pb-20 md:pb-0">
        {children}
      </div>
      <BottomTab />
    </div>
  );
}
