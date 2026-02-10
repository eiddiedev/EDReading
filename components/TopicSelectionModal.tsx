"use client";

import { useState } from "react";
import { X, Sparkles, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const IELTS_TOPICS = [
  { id: 'tech', label: '🤖 科技与未来 (Technology)', prompt: 'Technology, AI, or Digital Privacy' },
  { id: 'env', label: '🌿 环境与自然 (Environment)', prompt: 'Climate Change, Pollution, or Conservation' },
  { id: 'edu', label: '🎓 教育与成长 (Education)', prompt: 'University Education, Online Learning, or Child Development' },
  { id: 'soc', label: '👥 社会与生活 (Society)', prompt: 'Urbanization, Work-Life Balance, or Globalization' },
  { id: 'cul', label: '🎨 文化与艺术 (Culture)', prompt: 'Traditional Culture, Art, or Languages' },
  { id: 'rnd', label: '🎲 随便来一个 (Surprise Me)', prompt: 'Random' }
];

const DIFFICULTY_LEVELS = [
  { id: '6.0', label: 'Band 6.0', desc: '基础巩固 (Simple)' },
  { id: '7.0', label: 'Band 7.0', desc: '目标冲刺 (Target)' },
  { id: '8.0', label: 'Band 8.0', desc: '高分挑战 (Hard)' }
];

interface TopicSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (prompt: string, topicId: string, difficulty: string, count?: number) => void;
  isGenerating: boolean;
}

export function TopicSelectionModal({ isOpen, onClose, onSelect, isGenerating }: TopicSelectionModalProps) {
  const [difficulty, setDifficulty] = useState('7.0');
  const [count, setCount] = useState(1);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-700"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                选择今日阅读主题
              </h2>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Difficulty Selector */}
            <div className="mb-6">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                选择难度 (Target Band)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTY_LEVELS.map((level) => (
                  <button
                    type="button"
                    key={level.id}
                    onClick={(e) => { e.preventDefault(); setDifficulty(level.id); }}
                    className={`p-2 rounded-lg text-sm border transition-all ${
                      difficulty === level.id
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                    }`}
                  >
                    <div className="font-bold">{level.label}</div>
                    <div className={`text-xs mt-0.5 ${difficulty === level.id ? "text-indigo-100" : "text-slate-400"}`}>
                      {level.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Batch Count Selector */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  生成数量 (Batch Size)
                </label>
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                  预计耗时: {count} 分钟
                </span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setCount(num)}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                      count === num
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    {num} 篇
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {IELTS_TOPICS.map((topic) => (
                <button
                  type="button"
                  key={topic.id}
                  onClick={(e) => { e.preventDefault(); onSelect(topic.prompt, topic.id, difficulty, count); }}
                  disabled={isGenerating}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
                >
                  <div className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                    {topic.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
