"use client";

/**
 * 登录页面 (Login Page)
 * 作用：处理用户登录和注册逻辑。
 * 逻辑：
 * 1. 页面加载时检查当前会话状态。
 * 2. 如果已登录，自动重定向到首页 ('/')。
 * 3. 如果未登录，显示居中的 AuthForm 组件。
 * 4. 登录成功后 (onSuccess)，重定向到首页。
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AuthForm from "@/components/auth/auth-form";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // 检查用户是否已登录
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          // 如果已有会话，重定向到首页
          router.replace("/");
        } else {
          // 如果无会话，停止加载并显示表单
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Session check error:", error);
        setIsLoading(false);
      }
    };

    checkSession();
  }, [router]);

  // 显示加载状态，防止页面闪烁
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      {/* 居中卡片容器 */}
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-lg dark:bg-gray-800 dark:border dark:border-gray-700">
        <div className="p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              欢迎使用 EDReading
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              请登录或注册以管理您的阅读进度
            </p>
          </div>
          
          {/* AuthForm 组件处理具体的登录/注册逻辑 */}
          <AuthForm onSuccess={() => router.push("/")} />
        </div>
      </div>
    </div>
  );
}
