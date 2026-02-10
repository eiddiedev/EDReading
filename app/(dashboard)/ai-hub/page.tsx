"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, Save, Globe, Clock, RefreshCw, ExternalLink, MessageSquare, Send, Bot, User, BookOpen } from "lucide-react";
import { analyzeArticleWithAI } from "@/app/actions";
import { useAppStore } from "@/lib/store";
import { Article, AIVocabulary, AISentence } from "@/types";
import { CuratedItem, AIProcessResult } from "@/lib/ai-processor";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AIHubPage() {
  // Tabs
  const [activeTab, setActiveTab] = useState<"import" | "discovery" | "chat">("discovery");

  // Import State
  const [inputContent, setInputContent] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AIProcessResult | null>(null);

  // Discovery State
  const [recommendations, setRecommendations] = useState<CuratedItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const addArticle = useAppStore((state) => state.addArticle);
  const router = useRouter();

  // Load Cache on Mount
  useEffect(() => {
    // Discovery Cache
    const storedTime = localStorage.getItem("last_curation_time");
    const storedRecs = localStorage.getItem("cached_recommendations");
    
    if (storedTime && storedRecs) {
      setLastUpdated(parseInt(storedTime));
      setRecommendations(JSON.parse(storedRecs));
    }

    // Chat History
    const storedChat = localStorage.getItem("chat_history");
    if (storedChat) {
      setChatMessages(JSON.parse(storedChat));
    }
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    if (activeTab === "chat" && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  // Import Logic
  const handleAnalyze = async () => {
    if (!inputContent.trim()) return;
    setIsAnalyzing(true);
    try {
      const aiResult = await analyzeArticleWithAI(inputContent.trim());
      setResult(aiResult);
    } catch (error) {
      console.error("Analysis failed", error);
      toast.error("分析失败，请重试");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!result) return;
    const newArticle: Article = {
      id: Date.now().toString(),
      title: result.title || "AI Imported Article",
      title_zh: result.title_zh,
      content: result.content,
      difficulty: "Intermediate",
      wordCount: result.content.split(/\s+/).length,
      createdAt: new Date().toISOString(),
      phrases: result.phrases,
      aiVocabulary: result.vocabulary,
      aiSentences: result.sentences,
      tags: result.tags,
    };
    addArticle(newArticle);
    router.push("/library");
  };

  // Discovery Logic
  const checkUpdateAvailable = () => {
    if (!lastUpdated) return true;
    return Date.now() - lastUpdated > 6 * 60 * 60 * 1000; // 6 hours
  };

  const getNextUpdateTime = () => {
    if (!lastUpdated) return "现在";
    const nextUpdate = lastUpdated + 6 * 60 * 60 * 1000;
    const hours = Math.ceil((nextUpdate - Date.now()) / (1000 * 60 * 60));
    return hours > 0 ? `${hours} 小时后` : "现在";
  };

  const handleRefresh = async (force = false) => {
    if (!force && !checkUpdateAvailable()) return;
    
    const executeRefresh = async () => {
      setIsRefreshing(true);
      try {
        const res = await fetch("/api/feeds");
        if (!res.ok) throw new Error("Failed to fetch feeds");
        const data = await res.json();
        const items = data.items || [];
        
        setRecommendations(items);
        const now = Date.now();
        setLastUpdated(now);
        localStorage.setItem("cached_recommendations", JSON.stringify(items));
        localStorage.setItem("last_curation_time", now.toString());
        toast.success("刷新成功");
      } catch (e) {
        console.error(e);
        toast.error("刷新失败，请检查网络");
      } finally {
        setIsRefreshing(false);
      }
    };

    if (force) {
        toast("强制刷新将消耗 API 额度，确定要继续吗？", {
            action: {
                label: "继续",
                onClick: executeRefresh,
            },
            cancel: {
                label: "取消",
            },
        });
        return;
    }

    executeRefresh();
  };

  const handleDebugRefresh = async () => {
    toast("Debug Refresh: Clear cache and force fetch?", {
      action: {
        label: "Confirm",
        onClick: async () => {
          // 1. Clear Cache
          localStorage.removeItem("last_curation_time");
          localStorage.removeItem("cached_recommendations");
          setLastUpdated(null);
          
          setIsRefreshing(true);
          try {
            // 2. Call API
            const res = await fetch("/api/feeds");
            if (!res.ok) throw new Error("Failed to fetch feeds");
            const data = await res.json();
            const items = data.items || [];
            
            setRecommendations(items);
            const now = Date.now();
            setLastUpdated(now);
            localStorage.setItem("cached_recommendations", JSON.stringify(items));
            localStorage.setItem("last_curation_time", now.toString());
            
            // 3. Show Toast
            toast.success(`Refreshed! Found ${items.length} articles`);
          } catch (e) {
            console.error(e);
            toast.error("Debug Refresh Failed");
          } finally {
            setIsRefreshing(false);
          }
        }
      },
      cancel: {
        label: "Cancel"
      }
    });
  };

  // Chat Logic
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newUserMessage = { role: "user", content: inputMessage.trim() };
    const newMessages = [...chatMessages, newUserMessage];
    
    setChatMessages(newMessages);
    setInputMessage("");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) throw new Error("Chat API failed");
      
      const data = await response.json();
      const updatedMessages = [...newMessages, data];
      
      setChatMessages(updatedMessages);
      localStorage.setItem("chat_history", JSON.stringify(updatedMessages));
    } catch (error) {
      console.error("Chat error:", error);
      // Optional: Add error message to chat
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] md:h-screen overflow-hidden">
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 shrink-0">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    AI Hub
                </h1>
            </div>
            
            <div className="flex gap-4 border-b border-slate-100 dark:border-slate-700 overflow-x-auto">
                <button
                    onClick={() => setActiveTab("discovery")}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap ${
                        activeTab === "discovery" 
                        ? "text-indigo-600 dark:text-indigo-400" 
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        每日精选
                    </div>
                    {activeTab === "discovery" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("chat")}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap ${
                        activeTab === "chat" 
                        ? "text-indigo-600 dark:text-indigo-400" 
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        AI 对话
                    </div>
                    {activeTab === "chat" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("import")}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap ${
                        activeTab === "import" 
                        ? "text-indigo-600 dark:text-indigo-400" 
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        智能导入
                    </div>
                    {activeTab === "import" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                    )}
                </button>
            </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
            {activeTab === "discovery" && (
                <div className="h-full overflow-y-auto p-4 md:p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">精选文章推荐</h2>
                            <p className="text-sm text-slate-500">精选自《卫报》、《经济学人》、《自然》、《新科学家》、《国家地理》及《时代周刊》</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {!checkUpdateAvailable() && (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {getNextUpdateTime()} 更新
                                </span>
                            )}
                            <button
                                onClick={() => handleRefresh(true)} // Force refresh
                                disabled={isRefreshing}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                                {checkUpdateAvailable() ? "获取更新" : "强制刷新"}
                            </button>
                            <button
                                onClick={handleDebugRefresh}
                                className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-red-200 dark:border-red-800"
                                title="Debug: Clear Cache & Reload"
                            >
                                Debug
                            </button>
                        </div>
                    </div>

                    {recommendations.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {recommendations.map((item, i) => (
                                <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow group flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                            (item.difficulty.includes("8") || item.difficulty.includes("9") || item.difficulty === "Hard") ? "bg-red-100 text-red-700" :
                                            (item.difficulty.includes("7") || item.difficulty === "Medium") ? "bg-yellow-100 text-yellow-700" :
                                            "bg-green-100 text-green-700"
                                        }`}>
                                            {item.difficulty}
                                        </span>
                                        <div className="flex gap-1">
                                            {(item.tags || []).slice(0, 2).map((tag, t) => (
                                                <span key={t} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                        <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
                                    </h3>
                                    
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg mb-4 flex-1">
                                        <p className="text-sm text-slate-600 dark:text-slate-300 italic">
                                            "{item.reason}"
                                        </p>
                                    </div>

                                    <div className="mt-auto pt-2">
                                        <a 
                                            href={item.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                                        >
                                            <Globe className="w-4 h-4" />
                                            阅读原文
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Globe className="w-12 h-12 mb-4 opacity-20" />
                            <p>暂无推荐内容</p>
                            <button 
                                onClick={() => handleRefresh(true)}
                                className="mt-4 text-indigo-600 hover:underline"
                            >
                                点击获取最新文章
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "chat" && (
                <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
                    {/* Chat History */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chatMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 opacity-60">
                                <Bot className="w-16 h-16 mb-4" />
                                <p>你好！我是你的 AI 学习助手。</p>
                                <p className="text-sm mt-2">我可以帮助你解答英语学习问题。</p>
                            </div>
                        ) : (
                            chatMessages.map((msg, idx) => (
                                <div 
                                    key={idx} 
                                    className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div className={`flex max-w-[80%] md:max-w-[70%] gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                            msg.role === "user" ? "bg-indigo-600" : "bg-emerald-600"
                                        }`}>
                                            {msg.role === "user" ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                                        </div>
                                        <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                            msg.role === "user" 
                                            ? "bg-indigo-600 text-white rounded-tr-none" 
                                            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none"
                                        }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        {isChatLoading && (
                            <div className="flex w-full justify-start">
                                <div className="flex max-w-[80%] gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
                        <div className="relative">
                            <textarea
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="输入消息..."
                                className="w-full bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                rows={1}
                                style={{ minHeight: "48px", maxHeight: "120px" }}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputMessage.trim() || isChatLoading}
                                className="absolute right-2 bottom-2 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "import" && (
                <div className="h-full overflow-y-auto p-4 md:p-6">
                    <div className="max-w-3xl mx-auto">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <Save className="w-5 h-5 text-indigo-600" />
                                导入文章
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
                                粘贴英语文章内容，AI 将为您分析生词、短语和句法结构。
                            </p>
                            
                            <textarea
                                value={inputContent}
                                onChange={(e) => setInputContent(e.target.value)}
                                placeholder="在此粘贴英语文章内容..."
                                className="w-full h-64 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono text-sm"
                            />
                            
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setInputContent("")}
                                    className="px-4 py-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors"
                                >
                                    清空
                                </button>
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing || !inputContent.trim()}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            分析中...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            开始分析
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {result && (
                            <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                        分析结果
                                    </h3>
                                    <button
                                        onClick={handleSave}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        <BookOpen className="w-4 h-4" />
                                        加入文库
                                    </button>
                                </div>
                                
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">标题</h4>
                                        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                            {result.title}
                                        </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                                            <h4 className="font-medium text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                                                重点词汇 ({result.vocabulary.length})
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {result.vocabulary.slice(0, 8).map((v, i) => (
                                                    <span key={i} className="px-2 py-1 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                                                        {v.word}
                                                    </span>
                                                ))}
                                                {result.vocabulary.length > 8 && (
                                                    <span className="px-2 py-1 text-xs text-slate-400">
                                                        +{result.vocabulary.length - 8} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                                            <h4 className="font-medium text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                                                地道表达 ({result.phrases.length})
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {result.phrases.slice(0, 6).map((p, i) => (
                                                    <span key={i} className="px-2 py-1 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                                                        {p}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
        </main>
    </div>
  );
}
