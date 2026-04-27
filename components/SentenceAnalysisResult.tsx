"use client";

import { memo } from "react";
import { GraduationCap, Loader2 } from "lucide-react";

interface AnalysisData {
  translation?: string;
  grammarExplanation?: string;
  structure?: {
    subject?: string;
    verb?: string;
    object?: string;
  };
  vocabulary?: string[];
  importantPhrases?: Array<{
    phrase?: string;
    localExpression?: string;
    explanation?: string;
  }>;
}

interface SentenceAnalysisResultProps {
  streamText?: string;
  result?: AnalysisData;
  isLoading: boolean;
}

function getPreview(streamText: string | undefined): AnalysisData | null {
  if (!streamText) return null;
  try {
    const parsed = JSON.parse(streamText);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export const SentenceAnalysisResult = memo(function SentenceAnalysisResult({
  streamText,
  result,
  isLoading,
}: SentenceAnalysisResultProps) {
  const preview = getPreview(streamText);
  const data = result || preview;

  if (isLoading && !data) {
    return (
      <div className="space-y-4 py-4">
        <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium animate-pulse">
          <Loader2 className="animate-spin" />
          分析中...
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
      {data.translation && (
        <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl border border-primary-100 dark:border-primary-900/30">
          <h4 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-2">
            中文翻译
          </h4>
          <p className="text-lg text-slate-800 dark:text-slate-200">
            {data.translation}
          </p>
        </div>
      )}

      {(data.structure || data.grammarExplanation) && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
            <GraduationCap size={16} />
            语法解析
          </h4>
          {data.structure && (
            <div className="flex flex-wrap gap-2 mb-4 text-sm">
              {data.structure.subject && (
                <span className="px-2 py-1 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                  <b>S:</b> {data.structure.subject}
                </span>
              )}
              {data.structure.verb && (
                <span className="px-2 py-1 rounded bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
                  <b>V:</b> {data.structure.verb}
                </span>
              )}
              {data.structure.object && (
                <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  <b>O:</b> {data.structure.object}
                </span>
              )}
            </div>
          )}
          {data.grammarExplanation && (
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
              {data.grammarExplanation}
            </p>
          )}
        </div>
      )}

      {data.vocabulary && data.vocabulary.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
            重点词汇
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.vocabulary.map((w: string) => (
              <span
                key={w}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm rounded-md border border-slate-200 dark:border-slate-700"
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.importantPhrases && data.importantPhrases.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
            重要短语与地道表达
          </h4>
          <div className="space-y-3">
            {data.importantPhrases.map((item, index) => (
              <div
                key={`${item.phrase || "phrase"}-${index}`}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3"
              >
                {item.phrase && (
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.phrase}
                  </p>
                )}
                {item.localExpression && (
                  <p className="mt-1 text-sm text-primary-600 dark:text-primary-400">
                    地道表达：{item.localExpression}
                  </p>
                )}
                {item.explanation && (
                  <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                    {item.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
