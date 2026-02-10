"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ReviewSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (count: number | 'all') => void;
  totalWords: number;
}

export function ReviewSetupModal({ isOpen, onClose, onStart, totalWords }: ReviewSetupModalProps) {
  const options = [
    { label: "10 个单词 (快速)", value: 10 },
    { label: "20 个单词 (标准)", value: 20 },
    { label: "50 个单词 (强化)", value: 50 },
    { label: "所有单词", value: 'all' as const },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                开启复习
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 text-center">
                您的生词本中共有 {totalWords} 个单词。 <br/>
                请选择本次复习的数量：
              </p>

              {options.map((option) => (
                <button
                  key={option.label}
                  onClick={() => onStart(option.value)}
                  disabled={typeof option.value === 'number' && totalWords < option.value && totalWords > 0}
                  className={`w-full py-3 px-4 rounded-xl border-2 text-left transition-all flex justify-between items-center
                    ${typeof option.value === 'number' && totalWords < option.value 
                      ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed dark:border-slate-800 dark:bg-slate-900" 
                      : "border-slate-200 hover:border-primary-500 hover:bg-primary-50 text-slate-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-primary-500 dark:hover:bg-primary-900/20"
                    }`}
                >
                  <span className="font-medium">{option.label}</span>
                  {typeof option.value === 'number' && totalWords < option.value && (
                    <span className="text-xs text-slate-400">单词数量不足</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
