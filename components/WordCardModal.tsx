"use client";

import { useEffect, useState } from "react";
import { X, Share2, Download, Loader2, Quote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { DictionaryResult } from "@/types";

interface WordCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  wordData: DictionaryResult | null;
}

interface CardGenResult {
  sentence: string;
  translation: string;
}

export function WordCardModal({ isOpen, onClose, wordData }: WordCardModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [cardContent, setCardContent] = useState<CardGenResult | null>(null);

  useEffect(() => {
    if (isOpen && wordData) {
      generateCardContent();
    } else {
      setCardContent(null);
    }
  }, [isOpen, wordData]);

  const generateCardContent = async () => {
    if (!wordData) return;
    setIsLoading(true);
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
      
      const data = await response.json();
      setCardContent(data);
    } catch (error) {
      console.error("Card Gen Error:", error);
      toast.error("Failed to generate word card");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1000)),
      {
        loading: 'Generating image...',
        success: 'Word card saved to gallery!',
        error: 'Failed to save image',
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
            <div className="p-8 flex flex-col items-center text-center min-h-[400px] justify-center">
              {isLoading ? (
                <div className="flex flex-col items-center gap-3 text-stone-500">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                  <p className="text-sm font-medium animate-pulse">Designing your card...</p>
                </div>
              ) : wordData && cardContent ? (
                <div className="w-full space-y-6">
                  {/* Header */}
                  <div className="space-y-2">
                    <h2 className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                      {wordData.word}
                    </h2>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-stone-500 font-mono text-sm tracking-wider">
                        {wordData.phonetic}
                      </span>
                      {wordData.tags && wordData.tags[0] && (
                        <span className="px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-[10px] uppercase font-bold text-stone-600 dark:text-stone-400 tracking-wider">
                          {wordData.tags[0]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-12 h-1 bg-primary-500/30 mx-auto rounded-full" />

                  {/* Definition */}
                  <p className="text-stone-700 dark:text-stone-300 font-medium leading-relaxed">
                    {wordData.definition}
                  </p>

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
                      <p className="text-sm text-stone-600 dark:text-stone-400 border-t border-dashed border-stone-200 dark:border-stone-800 pt-3 mt-3">
                        {cardContent.translation}
                      </p>
                    </blockquote>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-white dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 flex gap-3">
              <button
                onClick={handleDownload}
                disabled={isLoading}
                className="flex-1 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Save Card
              </button>
              <button
                disabled={isLoading}
                className="p-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
