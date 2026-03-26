/**
 * 单词导入模态框，支持用户粘贴文本批量导入生词，并进行去重处理。
 */
"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getImportWordsPreview } from "@/lib/stream-preview";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rawInput: string) => void;
  isLoading: boolean;
  streamPreview?: string;
  existingWords: string[];
}

function getLocalPreview(text: string, existingWords: string[]) {
  const existingSet = new Set(existingWords);
  const raw = text
    .split(/[\n,，;；、/|]+/)
    .map((item) =>
      item
        .trim()
        .replace(/^[\d.)\]-]+\s*/, "")
        .replace(/^[•·\-*]\s*/, "")
        .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    )
    .filter((item) => item.length > 0);

  const unique: string[] = [];
  const seen = new Set<string>();

  raw.forEach((item) => {
    const normalized = item.toLowerCase();
    if (seen.has(normalized)) return;
    seen.add(normalized);
    unique.push(item);
  });

  const newWords = unique.filter((item) => !existingSet.has(item.toLowerCase()));
  const duplicateCount = unique.length - newWords.length;

  return { previewWords: newWords, duplicateCount };
}

export function ImportModal({ isOpen, onClose, onImport, isLoading, streamPreview = "", existingWords }: ImportModalProps) {
  const [input, setInput] = useState("");
  const [previewWords, setPreviewWords] = useState<string[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const liveWords = getImportWordsPreview(streamPreview);

  useEffect(() => {
    if (!isOpen) {
      setInput("");
      setPreviewWords([]);
      setDuplicateCount(0);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInput(text);

    const nextPreview = getLocalPreview(text, existingWords);
    setPreviewWords(nextPreview.previewWords);
    setDuplicateCount(nextPreview.duplicateCount);
  };

  const handleImport = () => {
    const rawInput = input.trim();
    if (rawInput) {
      onImport(rawInput);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                智能导入词汇
              </h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  粘贴要导入的单词、短语或混合文本
                </label>
                <textarea
                  className="w-full h-40 p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none font-mono text-sm"
                  placeholder={"apple, paradigm shift, algorithm\n或者直接粘贴一整段词表，AI 会自动识别并拆分"}
                  value={input}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                  <span>本地预估可导入：</span>
                  <span className="font-bold text-primary-600 dark:text-primary-400">{previewWords.length} 个</span>
                </div>
                {duplicateCount > 0 && (
                  <div className="text-xs text-amber-600 dark:text-amber-500">
                    已过滤 {duplicateCount} 个重复词
                  </div>
                )}
                {input.trim() && previewWords.length === 0 && (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    本地没有拆出明确词条，提交后 AI 会自动识别并批量导入。
                  </div>
                )}
                {previewWords.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {previewWords.slice(0, 10).map((w, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-600 dark:text-slate-300">
                        {w}
                      </span>
                    ))}
                    {previewWords.length > 10 && (
                      <span className="text-xs text-slate-400 self-center">+{previewWords.length - 10} more</span>
                    )}
                  </div>
                )}
              </div>
              {isLoading && streamPreview && (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-medium text-primary-600 dark:text-primary-400 mb-2">
                    AI 正在实时生成词条...
                  </div>
                  <div className="space-y-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      已识别 {liveWords.length} 个词条
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                      {liveWords.map((item, index) => (
                        <span
                          key={`${item.text || item.word || "word"}-${index}`}
                          className="px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
                        >
                          {item.text || item.word}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                disabled={isLoading}
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={!input.trim() || isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm shadow-primary-200 dark:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    智能导入
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
