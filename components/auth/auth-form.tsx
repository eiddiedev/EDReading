"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Loader2, ArrowRight, Mail } from "lucide-react";

interface AuthFormProps {
  onSuccess?: (session: Session) => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("请输入邮箱和密码");
      return;
    }

    setIsAuthLoading(true);
    try {
      if (isLoginMode) {
        // --- 1. Login Mode ---
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          // Fallback: If "User not found" might be misclassified, give a hint
          if (signInError.message.includes("Invalid login credentials")) {
            toast.error("登录失败：账号不存在或密码错误");
          } else if (signInError.message.includes("Email not confirmed")) {
            toast.error("登录失败：请先验证您的邮箱");
          } else {
            toast.error(`登录失败: ${signInError.message}`);
          }
        } else {
          toast.success("欢迎回来！");
          if (signInData.session && onSuccess) {
            onSuccess(signInData.session);
          }
        }
      } else {
        // --- 2. Sign Up Mode ---
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) {
          if (signUpError.message.includes("User already registered")) {
            toast.error("该邮箱已注册，请切换到登录模式");
            // Optionally auto-switch to login? No, let user decide.
          } else {
            toast.error(`注册失败: ${signUpError.message}`);
          }
        } else {
          if (signUpData.session) {
            toast.success("注册成功并已登录！");
            if (onSuccess) {
              onSuccess(signUpData.session);
            }
          } else if (signUpData.user && !signUpData.session) {
            toast.success("注册成功！请前往邮箱查收验证链接以完成注册");
            // 注册成功但无会话（Supabase 开启了邮箱验证），显示验证提示页面
            setCheckEmail(true);
          }
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("发生未知错误");
    } finally {
      setIsAuthLoading(false);
    }
  };

  if (checkEmail) {
    return (
      <div className="max-w-sm mx-auto text-center">
        <div className="mb-6 flex justify-center">
          <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Mail className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          请查收验证邮件
        </h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6">
          我们已向 <strong className="text-slate-900 dark:text-slate-100">{email}</strong> 发送了一封验证邮件。<br />
          请点击邮件中的链接以完成注册流程。
        </p>
        <button
          onClick={() => {
            setCheckEmail(false);
            setIsLoginMode(true);
          }}
          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium hover:underline"
        >
          返回登录
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="text-center mb-6">
        <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          {isLoginMode ? "登录账号" : "注册新账号"}
        </h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isLoginMode ? "欢迎回来，请输入您的账号信息" : "创建一个新账号以同步您的数据"}
        </p>
      </div>

      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            邮箱地址
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            密码
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            required
            minLength={6}
          />
        </div>
        <button
          type="submit"
          disabled={isAuthLoading}
          className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isAuthLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {isLoginMode ? "登录" : "注册"} <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setIsLoginMode(!isLoginMode)}
          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:underline"
        >
          {isLoginMode ? "还没有账号？点击注册" : "已有账号？点击登录"}
        </button>
      </div>
      <p className="text-xs text-center text-slate-400 mt-4">
        {isLoginMode ? "注册后需验证邮箱才能登录" : "注册后请留意邮箱验证链接"}
      </p>
    </div>
  );
}
