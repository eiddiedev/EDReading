"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { ArticleCard } from "@/components/ArticleCard";
import { PasteToReadModal } from "@/components/PasteToReadModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { TopicSelectionModal, IELTS_TOPICS } from "@/components/TopicSelectionModal";
// Imports removed
import { Plus, Sparkles, Book as BookIcon, Loader2 } from "lucide-react";
import { Article } from "@/types";
import { analyzeArticleWithAI } from "@/app/actions";
import { toast } from "sonner";
import { motion } from "framer-motion";

// Dummy data for initial articles
const dummyArticles: Article[] = [
  {
    id: "1",
    title: "The Future of Artificial Intelligence",
    content: "Artificial intelligence is transforming the way we live and work. Machine learning algorithms can now process vast amounts of data and make predictions with remarkable accuracy. These advancements account for significant improvements in efficiency. The applications of AI are endless, from healthcare to transportation, as well as education and entertainment. However, we must cope with ethical challenges that may result in unintended consequences.",
    difficulty: "Advanced",
    wordCount: 65,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Climate Change and Its Impact",
    content: "Climate change is one of the most pressing issues of our time. Rising global temperatures are causing sea levels to rise, due to melting ice caps. This may lead to severe weather patterns. Scientists according to recent studies are working to understand these changes. We must come up with solutions to protect our planet.",
    difficulty: "Intermediate",
    wordCount: 55,
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    title: "The Benefits of Reading",
    content: "Reading is a fundamental skill that opens doors to knowledge and imagination. When you read regularly, you improve your vocabulary, enhance your comprehension skills, and expand your understanding of the world. Books can transport you to different places and times.",
    difficulty: "Beginner",
    wordCount: 38,
    createdAt: new Date().toISOString(),
  },
];

export default function LibraryPage() {
  const router = useRouter();
  const articles = useAppStore((state) => state.articles);
  const setArticles = useAppStore((state) => state.setArticles);
  const addArticle = useAppStore((state) => state.addArticle);
  const removeArticle = useAppStore((state) => state.removeArticle);
  const markAsRead = useAppStore((state) => state.markAsRead);
  const toggleReadStatus = useAppStore((state) => state.toggleReadStatus);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastTopicId, setLastTopicId] = useState<string | null>(null);
  const hasCheckedDaily = useRef(false);

  useEffect(() => {
    setIsMounted(true);
    
    const fetchArticles = async (userId: string) => {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
          const mapped: Article[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            title_zh: d.title_zh, // Attempt to get title_zh if it exists in DB, otherwise undefined
            original_title: d.original_title, // Map original_title
            content: d.content,
            topic: d.topic,
            difficulty: d.difficulty,
            wordCount: d.word_count,
            createdAt: d.created_at,
            isRead: d.is_read,
            tags: d.tags || [], // Assuming tags might be in DB or default to empty
            // Note: phrases, aiVocabulary, aiSentences might be lost if not in DB
          }));
          setArticles(mapped);
       }
    };

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        fetchArticles(session.user.id);
      } else {
        setArticles([]); // Strict clear if no user
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
       if (session?.user) {
         fetchArticles(session.user.id);
       } else {
         setArticles([]); // Strict clear on logout/change
       }
    });

    return () => subscription.unsubscribe();
  }, [setArticles]);

  // Auto-Generate Daily Paper Logic
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Strict Sync Check: Immediate Exit if already done
    const today = new Date().toISOString().split("T")[0];
    const lastGen = localStorage.getItem("lastDailyGenDate");
    if (lastGen === today) return;

    // 2. Ref Check: Prevent Double-Fire in Strict Mode
    if (hasCheckedDaily.current) return;
    hasCheckedDaily.current = true;

    const generateDaily = async () => {
      console.log("☀️ New day detected. Generating Daily Paper...");
      const toastId = toast.loading("☀️ 早安！AI 正在为您撰写今日日报...");

      try {
        await handleGenerate(undefined, '7.0', true);
        localStorage.setItem("lastDailyGenDate", today);
        toast.success("今日日报已就绪！", { id: toastId });
      } catch (error) {
        console.error("Daily Gen Failed", error);
        toast.error("自动生成失败，请点击“AI 生成”按钮手动重试", { id: toastId });
        // Do NOT update date, so it tries again next reload
      }
    };

    generateDaily();
  }, []);

  const handleGenerate = async (topicPrompt?: string, difficulty: string = '7.0', isAuto: boolean = false, count: number = 1) => {
    if (isGenerating) return; // Prevent double trigger
    setIsGenerating(true);
    
    // Batch Generation Loop
    const total = count;
    let successCount = 0;

    for (let i = 0; i < total; i++) {
      const toastId = isAuto 
        ? undefined 
        : toast.loading(`AI 正在生成第 ${i + 1}/${total} 篇文章...`);

      try {
        const res = await fetch("/api/generate-ielts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicPrompt, difficulty }),
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Generation failed: ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.error) {
           throw new Error(data.error);
        }
        
        // Step 2: Analyze the generated content
        // Optimization: Check if the API already returned the analysis (Merged 1-Step Process)
        let aiResult;
        
        if (data.vocabulary && Array.isArray(data.vocabulary) && data.vocabulary.length > 0) {
          console.log("⚡ Fast Path: Using merged AI Analysis from Generation step");
          aiResult = {
            phrases: data.phrases || [],
            vocabulary: data.vocabulary.map((v: any) => ({
               ...v,
               translation: v.translation || v.definition || "", 
               definition: v.definition || v.translation || "" 
            })),
            sentences: data.sentences || [],
            tags: data.tags || []
          };
        } else {
          console.log("🐢 Slow Path: Falling back to separate Analysis step");
          const analysis = await analyzeArticleWithAI(data.content);
          aiResult = {
            phrases: analysis.phrases,
            vocabulary: analysis.vocabulary,
            sentences: analysis.sentences,
            tags: analysis.tags
          };
        }
  
        const newArticle: Article = {
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2),
          title: data.title,
          title_zh: data.title_zh,
          original_title: data.title, // Keep track of original english title
          content: data.content,
          difficulty: data.difficulty || "Advanced",
          wordCount: data.content.split(/\s+/).length,
          createdAt: new Date().toISOString(),
          topic: data.topic,
          tags: data.tags || aiResult.tags, // Prefer API tags, fallback to Analysis tags
          phrases: aiResult.phrases,
          aiVocabulary: aiResult.vocabulary,
          aiSentences: aiResult.sentences,
        };
        
        await addArticle(newArticle);
        successCount++;
        
        if (!isAuto) {
           toast.success(`第 ${i + 1}/${total} 篇生成成功！`, { id: toastId });
        }

      } catch (error) {
        console.error(error);
        if (!isAuto) toast.error(`第 ${i + 1} 篇生成失败`, { id: toastId });
        // Don't stop the loop, try next one? Or stop? 
        // Usually safer to continue so user gets at least some.
      }
    }

    setIsGenerating(false);
    if (!isAuto && successCount > 0) {
       toast.success(`批量生成完成！成功: ${successCount}/${total}`);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      removeArticle(deleteId);
      setDeleteId(null);
      toast.success("文章已删除");
    }
  };

  const handleRead = (id: string) => {
    markAsRead(id);
    // Navigation is handled by Link in ArticleCard, but we update state before/during navigation
  };

  const handleToggleRead = (id: string) => {
    toggleReadStatus(id);
    toast.success("已标记为未读");
  };

  // Sort articles: Unread first, then by date
  const sortedArticles = [...articles].sort((a, b) => {
    // Unread (0/false) comes first, Read (1/true) comes last
    return (Number(!!a.isRead) - Number(!!b.isRead));
  });

  const readCount = articles.filter(b => b.isRead).length;
  const totalCount = articles.length;
  const progress = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;

  return (
    <>
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                文库
              </h1>
              <div className="mt-2 flex items-center gap-4">
                <p className="text-slate-600 dark:text-slate-400">
                  您的阅读收藏
                </p>
                {totalCount > 0 && (
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      📚 阅读进度: <span className="text-primary-600 dark:text-primary-400">{readCount}</span> / {totalCount}
                    </span>
                    <div className="w-20 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.preventDefault(); setIsTopicModalOpen(true); }}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <Sparkles className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isGenerating ? "AI 正在生成..." : "AI 生成美文"}</span>
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.preventDefault(); setIsModalOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">导入文章</span>
              </motion.button>
            </div>
          </div>

          {!isMounted ? (
            <div className="text-center py-16">
              <p className="text-slate-500 dark:text-slate-400">加载中...</p>
            </div>
          ) : (articles.length === 0) ? (
            <div className="text-center py-16">
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                还没有文章。开始您的阅读之旅吧！
              </p>
              <div className="flex justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  导入文章
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              {articles.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    我的文章 ({articles.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedArticles.map((article) => (
                      <ArticleCard 
                        key={article.id} 
                        article={article} 
                        onDelete={handleDelete}
                        onRead={handleRead}
                        onToggleRead={handleToggleRead}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      
      {/* Mobile FAB for Import */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => { e.preventDefault(); setIsModalOpen(true); }}
        className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center z-40"
        aria-label="Import"
      >
        <Plus size={28} />
      </motion.button>


      <TopicSelectionModal
        isOpen={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        onSelect={(prompt, topicId, difficulty, count) => {
          let finalPrompt = prompt;

          // --- SMART RANDOM LOGIC ---
          if (topicId === 'rnd') {
            // Filter out the 'random' option AND the last used topic
            const availableTopics = IELTS_TOPICS.filter(t => t.id !== 'rnd' && t.id !== lastTopicId);
            
            // Pick a new one
            const randomTopic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
            finalPrompt = randomTopic.prompt;
            
            // Update history
            setLastTopicId(randomTopic.id);
          } else {
            setLastTopicId(topicId);
          }

          setIsTopicModalOpen(false);
          handleGenerate(finalPrompt, difficulty, false, count);
        }}
        isGenerating={isGenerating}
      />
      <PasteToReadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="删除确认"
        message="确定要删除这篇文章吗？此操作无法撤销。"
      />
    </>
  );
}
