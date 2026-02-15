"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { Moon, Sun, Cloud, CloudOff, LogOut, User, Loader2, ArrowRight, CheckCircle2, Megaphone, Trash2, Mail, Music, Copy } from "lucide-react";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { toast } from "sonner";
import { VocabularyWord } from "@/types";
import { motion } from "framer-motion";
import { DonationSection } from "@/components/settings/DonationSection";
import { APP_VERSION, APP_STAGE, ADMIN_EMAIL, ADMIN_EMAILS } from "@/lib/constants";
import { useRouter } from "next/navigation";
import Image from "next/image";

const CONTACT_EMAIL = ADMIN_EMAIL.replace("@", "#");

export default function SettingsPage() {
  const router = useRouter();
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleDarkMode = useAppStore((state) => state.toggleDarkMode);
  const fontSize = useAppStore((state) => state.fontSize);
  const setFontSize = useAppStore((state) => state.setFontSize);
  
  // Store Data for Sync
  const localVocabulary = useAppStore((state) => state.vocabulary);
  const setVocabulary = useAppStore((state) => state.setVocabulary);
  const localArticles = useAppStore((state) => state.articles);
  const setArticles = useAppStore((state) => state.setArticles);

  const [session, setSession] = useState<Session | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'idle'>('idle');
  
  // Custom Auth State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Admin Announcement State
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementType, setAnnouncementType] = useState<'info' | 'warning' | 'success'>('info');
  const publishAnnouncement = useAppStore((state) => state.publishAnnouncement);
  const revokeAllAnnouncements = useAppStore((state) => state.revokeAllAnnouncements);

  const hasSynced = useRef(false);
  const [devClickCount, setDevClickCount] = useState(0);

  const handleAdminClick = () => {
    // 🔒 第一道防线：前端检查
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      toast.error("⛔️ 你没有管理员权限 (Nice try!)");
      return;
    }

    // ✅ 通过验证，跳转
    router.push('/admin/dashboard');
  };

  const handleSync = useCallback(async (currentSession: Session) => {
    if (syncStatus === 'syncing') return;
    setSyncStatus('syncing');
    
    try {
      // 1. Check Cloud Data
      const { count: vocabCount, error: vocabError } = await supabase
        .from('vocabulary')
        .select('*', { count: 'exact', head: true });
        
      if (vocabError) throw vocabError;

      // 2. Logic: If Cloud is empty and Local has data -> Upload Local (First Sync)
      if ((vocabCount === 0 || vocabCount === null) && localVocabulary.length > 0) {
        toast.info("检测到本地数据，正在同步到云端...");
        
        // Batch insert vocabulary
        const vocabPayload = localVocabulary.map(v => ({
            id: v.id,
            user_id: currentSession.user.id,
            word: v.word,
            phonetic: v.phonetic,
            definition: v.definition,
            translation: v.exampleTranslation,
            example: v.example,
            review_count: v.reviewCount || 0,
            correct_count: v.correctCount || 0,
            tags: v.tags || [], 
            created_at: v.createdAt || new Date().toISOString()
        }));

        const { error: uploadError } = await supabase.from('vocabulary').upsert(vocabPayload);
        if (uploadError) throw uploadError;
        
        toast.success("本地数据已成功上传！");
      } else {
        // 3. If Cloud has data (or both empty) -> Download Cloud (Hydrate)
        if (vocabCount && vocabCount > 0) {
            const { data: cloudVocab, error: fetchError } = await supabase
                .from('vocabulary')
                .select('id, user_id, word, phonetic, definition, translation, example, review_count, correct_count, tags, created_at, next_review_at, last_reviewed_at, review_stage, mastery_level');
            if (fetchError) throw fetchError;
            
            if (cloudVocab) {
                const mappedVocab: VocabularyWord[] = cloudVocab.map((v: any) => ({
                    id: v.id,
                    word: v.word,
                    phonetic: v.phonetic,
                    definition: v.definition,
                    example: v.example,
                    exampleTranslation: v.translation,
                    reviewCount: v.review_count,
                    correctCount: v.correct_count || 0,
                    createdAt: v.created_at,
                    tags: v.tags || []
                }));
                setVocabulary(mappedVocab);
                toast.success("已从云端同步数据");
            }
        }
      }
      setSyncStatus('synced');
    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 20 || error.message?.includes('AbortError')) {
        // 静默失败或温和提示
        console.warn('Sync aborted due to timeout or navigation');
        toast.info("网络连接较慢，同步仍在后台尝试...");
      } else {
        console.error("Sync failed:", error);
        toast.error(`同步失败: ${error.message || "请检查网络"}`, {
          duration: 4000
        });
      }
      setSyncStatus('idle');
    }
  }, [localVocabulary, setVocabulary, syncStatus]);

  useEffect(() => {
    // Only sync once per mount
    if (hasSynced.current) return;
    
    const initSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        if (error.message.includes("Refresh Token") || error.message.includes("refresh_token")) {
           console.warn("Session invalid, signing out...");
           await supabase.auth.signOut();
           setSession(null);
        }
        return;
      }

      setSession(session);
      if (session) {
        hasSynced.current = true;
        handleSync(session);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Only sync on auth state change if it's a different session or we haven't synced yet
      if (session && !hasSynced.current) {
         hasSynced.current = true;
         handleSync(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [handleSync]);

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
          setSession(signInData.session);
        }
      } else {
        // --- 2. Sign Up Mode ---
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
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
               setSession(signUpData.session);
            } else if (signUpData.user && !signUpData.session) {
               toast.info("注册成功！请查收邮件以验证您的账号");
               // Switch to login mode for clarity
               setIsLoginMode(true);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setSyncStatus('idle');
    setEmail("");
    setPassword("");
    setVocabulary([]); // Clear vocabulary
    setArticles([]);   // Clear articles
    toast.success("已退出登录");
  };

  const handlePublishAnnouncement = () => {
    if (!announcementContent.trim()) {
      toast.error("公告内容不能为空");
      return;
    }
    publishAnnouncement(announcementContent, announcementType);
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8">
            设置
          </h1>

          <div className="space-y-6">
            {/* Admin Dashboard */}
            {session?.user?.email && ADMIN_EMAILS.includes(session.user.email) && (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-900/50 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10">
                  <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                    <Megaphone className="w-5 h-5" />
                    管理员公告后台
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      公告内容
                    </label>
                    <textarea
                      value={announcementContent}
                      onChange={(e) => setAnnouncementContent(e.target.value)}
                      placeholder="输入系统公告..."
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all h-24 resize-none"
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">类型:</span>
                      <select
                        value={announcementType}
                        onChange={(e) => setAnnouncementType(e.target.value as any)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="info">普通通知 (蓝色)</option>
                        <option value="warning">重要警告 (黄色)</option>
                        <option value="success">成功提示 (绿色)</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={revokeAllAnnouncements}
                            className="flex-1 sm:flex-none px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            撤下所有
                        </button>
                        <button
                            onClick={handlePublishAnnouncement}
                            className="flex-1 sm:flex-none px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                            立即发布
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Account / Auth Section */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <User className="w-5 h-5" />
                        账户与同步
                    </h3>
                </div>
                
                <div className="p-6">
                    {!session ? (
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
                                {isLoginMode ? "未验证邮箱也可尝试直接登录" : "注册后请留意邮箱验证链接"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">当前账号</p>
                                    <p className="font-medium text-slate-900 dark:text-slate-100">{session.user.email}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {syncStatus === 'synced' ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                            <Cloud className="w-3.5 h-3.5" />
                                            已同步
                                        </span>
                                    ) : syncStatus === 'syncing' ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            同步中...
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                            <CloudOff className="w-3.5 h-3.5" />
                                            未同步
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center pt-2">
                                <button
                                    onClick={() => handleSync(session)}
                                    disabled={syncStatus === 'syncing'}
                                    className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 disabled:opacity-50"
                                >
                                    <Cloud className="w-4 h-4" />
                                    {syncStatus === 'syncing' ? "正在同步..." : "手动同步数据"}
                                </button>

                                <button
                                    onClick={handleSignOut}
                                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    退出登录
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Dark Mode Toggle */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isDarkMode ? (
                    <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  ) : (
                    <Sun className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      深色模式
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      在浅色和深色主题之间切换
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isDarkMode ? "bg-primary-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isDarkMode ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Font Size Slider */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  字体大小
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  调整阅读字体大小（12px - 24px）
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500 dark:text-slate-400 w-12">
                  12px
                </span>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <span className="text-sm text-slate-500 dark:text-slate-400 w-12">
                  24px
                </span>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 w-12 text-right">
                  {fontSize}px
                </span>
              </div>
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <p
                  className="text-slate-700 dark:text-slate-300"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  预览：The quick brown fox jumps over the lazy dog.
                </p>
              </div>
            </div>

            {/* About Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md">
                    <Image 
                      src="/icon.png" 
                      alt="EDReading Icon" 
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">EDReading</h3>
                    <p className="text-xs font-mono text-teal-500 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-full inline-block mt-1">{APP_VERSION} {APP_STAGE}</p>
                  </div>
                </div>
                <button 
                  onClick={() => toast.success("您使用的是最新版本！")}
                  className="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 font-medium hover:underline"
                >
                  检查更新
                </button>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                专为英语备考打造的 AI 阅读助手。集成 DeepSeek V3.2 深度分析，帮助你突破阅读瓶颈。
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                 {[
                    { icon: CheckCircle2, text: "AI 智能阅读分析" },
                    { icon: CheckCircle2, text: "智能生词本" },
                    { icon: CheckCircle2, text: "云端同步 (Supabase)" },
                 ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <feature.icon className="w-3.5 h-3.5 text-teal-500" />
                      {feature.text}
                    </div>
                 ))}
              </div>
              {/* Footer */}
              <div className="border-t border-slate-100 dark:border-slate-700 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-400 gap-2">
                <span>设计与开发: <strong className="text-slate-600 dark:text-slate-300">Eiddie & TL</strong></span>
                <span>技术支持: DeepSeek V3.2 & Supabase</span>
              </div>
            </motion.div>

            {/* Donation Section */}
            <DonationSection />

            {/* Contact & Community Section */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  📬 联系与反馈 / Contact
                </h3>
              </div>
              <div className="p-2">
                {/* Email Item */}
                <button
                  onClick={() => {
                    const realEmail = CONTACT_EMAIL.replace("#", "@");
                    navigator.clipboard.writeText(realEmail);
                    toast.success("邮箱已复制");
                    window.location.href = `mailto:${realEmail}`;
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-all group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shadow-sm">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-slate-900 dark:text-slate-100">Bug 反馈 & 建议</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                        点击发送邮件
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 hidden sm:inline-block font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{CONTACT_EMAIL}</span>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                </button>
              </div>
            </div>

            {/* App Version Footer */}
            <div className="mt-8 mb-4 text-center space-y-4">
              {devClickCount >= 5 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-4"
                >
                  <button
                    onClick={handleAdminClick}
                    className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-lg text-sm font-medium shadow-lg hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
                  >
                    <User className="w-4 h-4" />
                    进入管理员后台
                  </button>
                </motion.div>
              )}
              
              <button
                onClick={() => {
                  setDevClickCount(prev => {
                    const newCount = prev + 1;
                    if (newCount === 5) {
                      toast.success("🚀 开发者模式已激活！");
                    }
                    return newCount;
                  });
                }}
                className="text-xs text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
              >
                EDReading {APP_VERSION} ({APP_STAGE}) · Made with ❤️ by Eiddie & TL
              </button>
            </div>
          </div>
        </main>
  );
}
