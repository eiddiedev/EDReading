"use client";

import { useEffect, useState, useRef, useCallback, memo } from "react";
/**
 * 单词卡片模态框组件 (WordCardModal)
 * 作用：展示单个单词的详细复习卡片，支持发音和从生词本移除。
 * 定义：用于单词复习或详情查看的 UI 组件。
 * 逻辑：
 * 1. 从 Props 接收单词对象（包含拼写、音标、释义、例句等）。
 * 2. 提供发音播放功能。
 * 3. 提供“移除”按钮，调用 `wordStore` 从生词本中删除该词。
 */
import { X, Share2, Download, Loader2, Quote, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { DictionaryResult } from "@/types";
import { triggerHaptic } from "@/lib/utils";
import { readStreamedJson } from "@/lib/stream-client";
import { getCardPreview } from "@/lib/stream-preview";

interface WordCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  wordData: DictionaryResult | null;
}

interface CardGenResult {
  sentence: string;
  translation: string;
}

const WORD_CARD_SHOW_CHINESE_KEY = "word-card-show-chinese-v1";

export const WordCardModal = memo(function WordCardModal({ isOpen, onClose, wordData }: WordCardModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [cardContent, setCardContent] = useState<CardGenResult | null>(null);
  const [streamPreview, setStreamPreview] = useState("");
  const [showChinese, setShowChinese] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const partialCard = getCardPreview(streamPreview);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedPreference = window.localStorage.getItem(WORD_CARD_SHOW_CHINESE_KEY);
    setShowChinese(storedPreference !== "0");
  }, []);

  const generateCardContent = useCallback(async () => {
    if (!wordData) return;
    setIsLoading(true);
    setStreamPreview("");
    try {
      const response = await fetch("/api/ai/card-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          word: wordData.word,
          definition: wordData.definition 
        }),
      });
      
      if (!response.ok) throw new Error("Failed to generate card");
      
      const data = await readStreamedJson<CardGenResult>({
        response,
        onDelta: (chunk) => {
          setStreamPreview((prev) => prev + chunk);
        },
      });
      setCardContent(data);
    } catch (error) {
      console.error("Card Gen Error:", error);
      toast.error("Failed to generate word card");
    } finally {
      setIsLoading(false);
    }
  }, [wordData]);

  useEffect(() => {
    if (isOpen && wordData) {
      generateCardContent();
    } else {
      setCardContent(null);
      setStreamPreview("");
    }
  }, [isOpen, wordData, generateCardContent]);

  const handleToggleChinese = () => {
    setShowChinese((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(WORD_CARD_SHOW_CHINESE_KEY, next ? "1" : "0");
      }
      return next;
    });
  };

  const handleDownload = async () => {
    if (!cardRef.current || !wordData) return;
    
    const toastId = toast.loading("Generating card image...");
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // Higher resolution
        useCORS: true,
        backgroundColor: null, // Transparent background handled by CSS
      } as any);

      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `edreading-card-${wordData.word.toLowerCase()}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Card saved successfully!", { id: toastId });
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to save card image", { id: toastId });
    }
  };

  const handleShare = async () => {
    if (!cardRef.current || !wordData) return;

    const toastId = toast.loading("Preparing to share...");

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      } as any);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Failed to generate image", { id: toastId });
          return;
        }

        const file = new File([blob], `card-${wordData.word}.png`, { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Word Card: ${wordData.word}`,
              text: `Check out this word card for "${wordData.word}" from EDReading!`,
            });
            toast.dismiss(toastId);
          } catch (shareError) {
            if ((shareError as Error).name !== 'AbortError') {
              console.error("Share failed:", shareError);
              // Fallback to clipboard
              copyToClipboard(blob, toastId);
            } else {
              toast.dismiss(toastId);
            }
          }
        } else {
          // Fallback: Copy to clipboard
          copyToClipboard(blob, toastId);
        }
      }, "image/png");
    } catch (error) {
      console.error("Share generation failed:", error);
      toast.error("Failed to share card", { id: toastId });
    }
  };

  const copyToClipboard = async (blob: Blob, toastId: string | number) => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      toast.success("Image copied to clipboard!", { id: toastId });
    } catch (clipboardError) {
      console.error("Clipboard failed:", clipboardError);
      toast.error("Your browser doesn't support image sharing.", { id: toastId });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-stone-100 dark:bg-stone-900 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors z-10"
            >
              <X className="w-5 h-5 text-stone-600 dark:text-stone-400" />
            </button>

            {/* Card Content */}
            <div 
              ref={cardRef}
              className="p-8 flex flex-col items-center text-center min-h-[400px] justify-center bg-stone-100 dark:bg-stone-900"
            >
              {isLoading ? (
                <div className="w-full space-y-6">
                  <div className="flex flex-col items-center gap-3 text-stone-500">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                    <p className="text-sm font-medium animate-pulse">正在生成卡片...</p>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    {wordData?.tags && wordData.tags[0] && (
                      <span className="px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 tracking-widest border border-stone-200 dark:border-stone-700">
                        {wordData.tags[0]}
                      </span>
                    )}
                    <h2 className="text-5xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                      {wordData?.word}
                    </h2>
                    <span className="text-stone-500 font-mono text-base tracking-wider">
                      {wordData?.phonetic}
                    </span>
                  </div>

                  <div className="w-12 h-1 bg-primary-500/30 mx-auto rounded-full" />

                  <div className="min-h-[52px]">
                    {showChinese ? (
                      <p className="text-stone-700 dark:text-stone-300 font-medium leading-relaxed">
                        {wordData?.definition}
                      </p>
                    ) : (
                      <p className="text-sm text-stone-400 dark:text-stone-500 italic">
                        中文释义已隐藏
                      </p>
                    )}
                  </div>

                  {partialCard && (
                    <div className="relative mt-6 pt-6 border-t border-stone-200 dark:border-stone-800">
                      <Quote className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary-500 fill-primary-100 dark:fill-primary-900/30 bg-stone-100 dark:bg-stone-900" />
                      <blockquote className="space-y-3">
                        {partialCard.sentence && (
                          <p className="font-serif text-lg text-stone-800 dark:text-stone-200 italic leading-relaxed">
                            &ldquo;{partialCard.sentence}&rdquo;
                          </p>
                        )}
                        <p className="text-xs text-stone-500 dark:text-stone-500 font-medium tracking-wide uppercase">
                          — The Economist Style
                        </p>
                        {showChinese && partialCard.translation && (
                          <p className="text-sm text-stone-600 dark:text-stone-400 border-t border-dashed border-stone-200 dark:border-stone-800 pt-3 mt-3">
                            {partialCard.translation}
                          </p>
                        )}
                      </blockquote>
                    </div>
                  )}
                </div>
              ) : wordData && cardContent ? (
                <div className="w-full space-y-6">
                  {/* Header */}
                  <div className="flex flex-col items-center gap-3">
                    {wordData.tags && wordData.tags[0] && (
                      <span className="px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 tracking-widest border border-stone-200 dark:border-stone-700">
                        {wordData.tags[0]}
                      </span>
                    )}
                    <h2 className="text-5xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                      {wordData.word}
                    </h2>
                    <span className="text-stone-500 font-mono text-base tracking-wider">
                      {wordData.phonetic}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="w-12 h-1 bg-primary-500/30 mx-auto rounded-full" />

                  {/* Definition */}
                  <div className="min-h-[52px]">
                    {showChinese ? (
                      <p className="text-stone-700 dark:text-stone-300 font-medium leading-relaxed">
                        {wordData.definition}
                      </p>
                    ) : (
                      <p className="text-sm text-stone-400 dark:text-stone-500 italic">
                        中文释义已隐藏
                      </p>
                    )}
                  </div>

                  {/* AI Context */}
                  <div className="relative mt-6 pt-6 border-t border-stone-200 dark:border-stone-800">
                    <Quote className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary-500 fill-primary-100 dark:fill-primary-900/30 bg-stone-100 dark:bg-stone-900" />
                    <blockquote className="space-y-3">
                      <p className="font-serif text-lg text-stone-800 dark:text-stone-200 italic leading-relaxed">
                        &ldquo;{cardContent.sentence}&rdquo;
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-500 font-medium tracking-wide uppercase">
                        — The Economist Style
                      </p>
                      {showChinese && (
                        <p className="text-sm text-stone-600 dark:text-stone-400 border-t border-dashed border-stone-200 dark:border-stone-800 pt-3 mt-3">
                          {cardContent.translation}
                        </p>
                      )}
                    </blockquote>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-white dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 space-y-3">
              <button
                onClick={handleToggleChinese}
                className="w-full py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
              >
                {showChinese ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showChinese ? "隐藏中文释义" : "显示中文释义"}
              </button>
              <div className="flex gap-3">
              <button
                onClick={() => {
                  triggerHaptic();
                  handleDownload();
                }}
                disabled={isLoading}
                className="flex-1 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 duration-100 touch-manipulation disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                保存卡片
              </button>
              <button
                onClick={handleShare}
                disabled={isLoading}
                className="p-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
              >
                <Share2 className="w-5 h-5" />
              </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
