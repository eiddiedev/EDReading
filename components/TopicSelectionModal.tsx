/**
 * 话题选择模态框组件 (TopicSelectionModal)
 * 作用：在生成内容（如 IELTS 阅读）前，让用户选择感兴趣的话题或领域。
 * 定义：包含多个话题选项卡或列表的对话框。
 * 逻辑：
 * 1. 展示预定义的话题列表（如科技、教育、环境等）。
 * 2. 允许用户单选或多选。
 * 3. 确认后将选中的话题传递给生成 API。
 */
"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, BarChart3, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";

export const IELTS_TOPICS = [
  { id: 'tech', label: '🤖 科技与未来 (Technology)', prompt: 'Technology, AI, or Digital Privacy' },
  { id: 'env', label: '🌿 环境与自然 (Environment)', prompt: 'Climate Change, Pollution, or Conservation' },
  { id: 'edu', label: '🎓 教育与成长 (Education)', prompt: 'University Education, Online Learning, or Child Development' },
  { id: 'soc', label: '👥 社会与生活 (Society)', prompt: 'Urbanization, Work-Life Balance, or Globalization' },
  { id: 'cul', label: '🎨 文化与艺术 (Culture)', prompt: 'Traditional Culture, Art, or Languages' },
  { id: 'rnd', label: '🎲 随便来一个 (Surprise Me)', prompt: 'Random' }
];

const LEVEL_OPTIONS = [
  { id: 'CET-4', label: '大学四级', desc: 'CET-4 (Basic)' },
  { id: 'CET-6', label: '大学六级', desc: 'CET-6 (Advanced)' },
  { id: 'PG-Entrance', label: '考研英语', desc: 'Postgrad (Hard)' },
  { id: 'IELTS', label: '雅思学术', desc: 'IELTS (Band 7+)' },
  { id: 'TOEFL', label: '托福阅读', desc: 'TOEFL (Academic)' }
];

interface TopicSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (prompt: string, topicId: string, difficulty: string, count?: number) => void;
  isGenerating: boolean;
}

export function TopicSelectionModal({ isOpen, onClose, onSelect, isGenerating }: TopicSelectionModalProps) {
  const [level, setLevel] = useState("IELTS");
  const [count, setCount] = useState(1);
  const [selectedTopicId, setSelectedTopicId] = useState(IELTS_TOPICS[0].id);
  const { dailyUsage, ensureDailyUsage, isAdmin } = useAppStore((state) => ({
    dailyUsage: state.dailyUsage,
    ensureDailyUsage: state.ensureDailyUsage,
    isAdmin: state.isAdmin,
  }));

  useEffect(() => {
    ensureDailyUsage();
  }, [ensureDailyUsage]);

  if (!isOpen) return null;

  const selectedTopic = IELTS_TOPICS.find((topic) => topic.id === selectedTopicId) || IELTS_TOPICS[0];
  const remainingGenerate = Math.max(0, 5 - dailyUsage.generate);
  const isQuotaExhausted = !isAdmin && remainingGenerate <= 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={onClose} />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              定制你的阅读训练
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                选择目标等级 (Target Level)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LEVEL_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setLevel(opt.id)}
                    className={`
                      relative p-2 rounded-lg text-left border transition-all duration-200
                      ${level === opt.id 
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none" 
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }
                    `}
                  >
                    <div className="font-bold text-xs">{opt.label}</div>
                    <div className={`text-[10px] mt-0.5 ${level === opt.id ? "text-indigo-100" : "text-slate-400"}`}>
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                  生成数量 (Batch Size)
                </label>
                <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                  AI 生成耗时约 {count * 20} 秒
                </span>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800/50 p-0.5 rounded-lg">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    onClick={() => setCount(num)}
                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                      count === num
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    {num} 篇
                  </button>
                ))}
              </div>
            </div>

            <div>
               <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                选择话题 (Select Topic)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                {IELTS_TOPICS.map((topic) => (
                  <button
                    type="button"
                    key={topic.id}
                    onClick={() => setSelectedTopicId(topic.id)}
                    className={`group relative flex flex-col items-start p-2.5 rounded-lg border transition-all text-left ${
                      selectedTopicId === topic.id
                        ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-900/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10"
                    }`}
                  >
                    <span className="text-xs font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                      {topic.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelect(selectedTopic.prompt, selectedTopic.id, level, count)}
              disabled={isGenerating || isQuotaExhausted}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                isGenerating || isQuotaExhausted
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {isQuotaExhausted ? "配额已耗尽，请明天再试" : "开始生成"}
            </button>
            <p className="text-[10px] text-slate-400 mt-1 text-center">
              {isAdmin 
                ? "管理员无限配额模式 🚀" 
                : `今日剩余生成额度：${remainingGenerate} / 5 篇`
              }
            </p>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
