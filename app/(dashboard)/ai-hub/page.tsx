"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, Save, Globe, Clock, RefreshCw, ExternalLink, Send } from "lucide-react";
import { analyzeArticleWithAI } from "@/app/actions";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Article, AIVocabulary, AISentence } from "@/types";
import { CuratedItem, AIProcessResult } from "@/lib/ai-processor";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AIHubPage() {
  const [activeTab, setActiveTab] = useState<"import" | "discovery" | "chat">("discovery");

  const [inputContent, setInputContent] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AIProcessResult | null>(null);

  const [recommendations, setRecommendations] = useState<CuratedItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const overLimitRef = useRef(false);

  const { addArticle, dailyUsage, ensureDailyUsage, checkImportQuota, checkChatQuota } = useAppStore((state) => ({
    addArticle: state.addArticle,
    dailyUsage: state.dailyUsage,
    ensureDailyUsage: state.ensureDailyUsage,
    checkImportQuota: state.checkImportQuota,
    checkChatQuota: state.checkChatQuota,
  }));
  const router = useRouter();
  const wordCount = inputContent.trim() ? inputContent.trim().split(/\s+/).length : 0;
  const remainingImport = Math.max(0, 20 - dailyUsage.import);
  const remainingChat = Math.max(0, 100 - dailyUsage.chat);

  useEffect(() => {
    ensureDailyUsage();
    const storedTime = localStorage.getItem("last_curation_time_v2");
    const storedRecs = localStorage.getItem("cached_recommendations_v2");
    if (storedTime && storedRecs) {
      setLastUpdated(parseInt(storedTime));
      setRecommendations(JSON.parse(storedRecs));
    }
    
    // Initial fetch of chat history from Supabase
    const fetchChatHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("role, content")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });
        
        if (data && !error) {
          setChatMessages(data);
        }
      } else {
        // Fallback for non-logged in users (optional, or just clear)
        setChatMessages([]);
      }
    };
    fetchChatHistory();

    if (!storedRecs) {
      handleRefresh();
    }
  }, [ensureDailyUsage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const getHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  };

  const handleAnalyze = async () => {
    const trimmedInput = inputContent.trim();
    if (!trimmedInput) return;
    if (wordCount > 3000) {
      toast.error("字数超过 3000，无法分析");
      return;
    }

    // 1. Check Local Cache
    const cacheKey = `ai_cache_${getHash(trimmedInput)}`;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        try {
            setResult(JSON.parse(cachedData));
            toast.success("已加载本地缓存结果 (无消耗)");
            return;
        } catch (e) {
            console.error("Cache parse error", e);
            localStorage.removeItem(cacheKey);
        }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("请先登录再分析");
        return;
      }
      if (!checkImportQuota()) return;
      setIsAnalyzing(true);
      setResult(null);
      
      // Use Streaming API to avoid timeout
      const response = await fetch("/api/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmedInput,
          userId: user.id,
          level: "IELTS"
        })
      });

      if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Analysis failed");
      }

      const contentType = response.headers.get("content-type");
      let aiResult;

      if (contentType && contentType.includes("application/json")) {
          // Handle Cached Result or simple JSON response
          aiResult = await response.json();
          toast.success("已加载缓存结果 (无消耗)");
      } else {
          // Handle Stream (SSE)
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let done = false;
          let accumulatedText = "";

          while (!done) {
            const { value, done: doneReading } = await reader?.read()!;
            done = doneReading;
            const chunkValue = decoder.decode(value, { stream: true });
            
            const lines = chunkValue.split('\n');
            for (const line of lines) {
                if (line.trim().startsWith('data: ')) {
                    const dataStr = line.trim().slice(6);
                    if (dataStr === '[DONE]') continue;
                    try {
                        const json = JSON.parse(dataStr);
                        const content = json.choices[0]?.delta?.content || "";
                        accumulatedText += content;
                    } catch (e) {
                        // ignore incomplete chunks
                    }
                }
            }
          }
          try {
            aiResult = JSON.parse(accumulatedText);
          } catch (e) {
            console.error("JSON Parse Error:", e, accumulatedText);
            throw new Error("AI output incomplete");
          }
      }
      
      // 2. Save to Cache
      localStorage.setItem(cacheKey, JSON.stringify(aiResult));
      
      setResult(aiResult);
    } catch (error: any) {
      if (error.message && (error.message.includes("Rate limit") || error.message.includes("额度"))) {
          toast.error(error.message);
      } else {
          toast.error("分析失败，请稍后重试");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    const newArticle: Article = {
      id: result.id || Date.now().toString(),
      title: result.title || "Imported Article",
      title_zh: result.title_zh,
      content: result.content,
      difficulty: result.level || "Intermediate",
      level: result.level,
      wordCount: result.content.split(/\s+/).length,
      createdAt: new Date().toISOString(),
      phrases: result.phrases,
      aiVocabulary: result.vocabulary,
      aiSentences: result.sentences,
      tags: result.tags,
      is_public: false,
    };
    try {
      const publishPromise = addArticle(newArticle, false);
      toast.promise(publishPromise, {
        loading: "发布中...",
        success: "已成功发布到公共文库",
        error: "发布失败，请稍后重试",
      });
      await publishPromise;
      router.push("/library");
      toast.success("已存入文库");
    } catch (error) {
      return;
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/feeds");
      const data = await res.json();
      setRecommendations(data.items || []);
      const now = Date.now();
      setLastUpdated(now);
      localStorage.setItem("cached_recommendations_v2", JSON.stringify(data.items));
      localStorage.setItem("last_curation_time_v2", now.toString());
    } catch (e) {
      toast.error("获取外刊失败");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isChatLoading) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("请先登录");
        return;
      }

      if (!checkChatQuota()) return;
      
      const userContent = inputMessage.trim();
      setInputMessage("");
      
      // Optimistic update
      const newMessages = [...chatMessages, { role: "user", content: userContent }];
      setChatMessages(newMessages);
      setIsChatLoading(true);

      // Save user message to Supabase
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        role: "user",
        content: userContent
      });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) throw new Error("Chat failed");
      
      const data = await response.json();
      // API returns { role: "assistant", content: "..." }
      const assistantMessage = { 
        role: "assistant", 
        content: data.content || data.reply || "Sorry, I couldn't understand that." 
      };
      
      // Save assistant message to Supabase
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        role: "assistant",
        content: data.reply
      });

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      toast.error("发送失败，请重试");
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] md:h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 shrink-0">
            <h1 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                AI Hub
            </h1>
            <div className="flex gap-6 mt-4 border-b border-slate-100 dark:border-slate-700">
                {["discovery", "import", "chat"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`pb-2 text-sm font-medium capitalize relative ${
                            activeTab === tab ? "text-indigo-600" : "text-slate-500"
                        }`}
                    >
                        {tab === "discovery" ? "外刊精选" : tab === "import" ? "分析文章" : "AI 助手"}
                        {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
                    </button>
                ))}
            </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
            {activeTab === "discovery" && (
                <div className="h-full overflow-y-auto p-6">
                    <div className="flex flex-col gap-3 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-indigo-600" />
                                    精选文章推荐
                                </h2>
                                <p className="text-sm text-slate-500">为您精选的地道外刊资讯</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {lastUpdated && (
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        更新于 {new Date(lastUpdated).toLocaleTimeString()}
                                    </div>
                                )}
                                <button onClick={handleRefresh} disabled={isRefreshing} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                共 {recommendations.length} 篇
                            </span>
                            <span className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/60">
                                每日更新
                            </span>
                        </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {recommendations.map((item, i) => (
                            <div key={i} className="group bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col">
                                <div className="flex items-start justify-between mb-3 gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/60 whitespace-nowrap">
                                            {item.difficulty || "General"}
                                        </span>
                                        {item.tags?.[0] && (
                                            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                                {item.tags[0]}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                                        {item.date ? new Date(item.date).toLocaleDateString() : ""}
                                    </span>
                                </div>
                                <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2 line-clamp-2">{item.title}</h3>
                                <p className="text-sm text-slate-500 mb-4 line-clamp-3">{item.reason}</p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {item.tags?.slice(1, 4).map((tag) => (
                                        <span key={tag} className="text-[11px] px-2 py-1 bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-200 rounded-full">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <a href={item.url} target="_blank" className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
                                    阅读原文 <ExternalLink size={14} />
                                </a>
                            </div>
                        ))}
                    </div>
                    {!isRefreshing && recommendations.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-sm text-slate-500">
                            暂无推荐内容
                        </div>
                    )}
                    <div className="mt-8 pb-8 text-center">
                        <p className="text-xs text-slate-400">
                            本站仅提供英语学习外刊链接，不提供代理服务。请用户在遵守所在地区法律法规的前提下访问。
                        </p>
                    </div>
                </div>
            )}

            {activeTab === "import" && (
                <div className="h-full overflow-y-auto p-6">
                    <div className="max-w-3xl mx-auto">
                        <textarea
                            value={inputContent}
                            onChange={(e) => {
                              const nextValue = e.target.value;
                              setInputContent(nextValue);
                              const nextCount = nextValue.trim() ? nextValue.trim().split(/\s+/).length : 0;
                              if (nextCount > 3000 && !overLimitRef.current) {
                                toast.error("字数超过 3000，已禁止分析");
                                overLimitRef.current = true;
                              }
                              if (nextCount <= 3000 && overLimitRef.current) {
                                overLimitRef.current = false;
                              }
                            }}
                            placeholder="在此粘贴文章内容进行 AI 深度分析..."
                            className="w-full h-64 p-4 bg-white dark:bg-slate-800 border rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500 resize-none shadow-sm"
                        />
                        <div className={`mb-4 text-xs ${wordCount > 3000 ? "text-red-500" : "text-slate-500"}`}>
                          Word Count: {wordCount} / 3000
                        </div>
                        <button onClick={handleAnalyze} disabled={isAnalyzing || wordCount > 3000} className={`w-full py-3 font-bold rounded-xl flex items-center justify-center gap-2 ${isAnalyzing || wordCount > 3000 ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-indigo-600 text-white"}`}>
                            {isAnalyzing ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />} 开始分析
                        </button>
                        <div className="mt-2 text-xs text-slate-400">今日剩余导入额度：{remainingImport} 篇</div>
                        {result && (
                            <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl p-6 border shadow-sm">
                                <h2 className="text-xl font-bold mb-2">{result.title}</h2>
                                <p className="text-slate-500 mb-6">{result.title_zh}</p>
                                <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium">
                                    <Save size={18} /> 存入我的文库
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === "chat" && (
                <div className="flex flex-col h-full bg-white dark:bg-slate-900">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="p-4 border-t">
                        <div className="mb-2 text-xs text-slate-500">
                          今日剩余咨询次数：{remainingChat} 次
                        </div>
                        <div className="flex gap-2">
                            <input value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="询问英语问题..." />
                            <button onClick={handleSendMessage} className="p-2 bg-indigo-600 text-white rounded-full"><Send size={20} /></button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    </div>
  );
}