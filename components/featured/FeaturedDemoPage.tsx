"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, EyeOff, Orbit, RotateCcw, Sparkles, Type } from "lucide-react";
import { FeaturedSceneCanvas } from "@/components/featured/FeaturedSceneCanvas";
import { PretextContourText } from "@/components/featured/PretextContourText";
import type { ContourFrame, FeaturedDemoConfig } from "@/types";

interface FeaturedDemoPageProps {
  article: FeaturedDemoConfig;
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });

    observer.observe(element);
    setWidth(element.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

export function FeaturedDemoPage({ article }: FeaturedDemoPageProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [contourFrame, setContourFrame] = useState<ContourFrame | null>(null);
  const [contentHeight, setContentHeight] = useState(1120);
  const [showModel, setShowModel] = useState(true);
  const [immersiveLayout, setImmersiveLayout] = useState(true);
  const [resetVersion, setResetVersion] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    setContourFrame(null);
    setContentHeight(1120);
    setShowModel(true);
    setImmersiveLayout(true);
    setResetVersion(0);
  }, [article.slug]);

  useEffect(() => {
    if (!showModel || !immersiveLayout) {
      setContourFrame(null);
    }
  }, [immersiveLayout, showModel]);

  const paragraphs = useMemo(
    () => article.body.split("\n\n").filter(Boolean),
    [article.body]
  );

  const isMobile = width > 0 && width < 768;
  const fontSize = isMobile ? 16 : 19;
  const lineHeight = isMobile ? 30 : 36;
  const stageHeight = Math.max(isMobile ? 960 : 1080, contentHeight + 168);
  const sceneHeight = showModel ? Math.min(stageHeight, isMobile ? 360 : 620) : 0;
  const paddingX = isMobile ? 20 : 54;
  const textTop = isMobile ? 36 : 54;
  const textBox = useMemo(
    () => ({
      x: paddingX,
      y: textTop,
      width: Math.max(0, width - paddingX * 2),
      height: Math.max(0, stageHeight - textTop - 56),
    }),
    [paddingX, stageHeight, textTop, width]
  );

  const sampleScale = isMobile ? 0.33 : 0.48;

  if (!isReady) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex min-h-[60vh] items-center justify-center rounded-[2rem] border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          正在加载精选文章...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-600 dark:text-sky-400">
            Featured Reading
          </p>
          <h1 className="mt-3 text-balance text-3xl font-bold text-slate-900 dark:text-slate-100 md:text-5xl">
            {article.title}
          </h1>
          {article.titleZh ? (
            <p className="mt-3 text-base text-slate-500 dark:text-slate-400 md:text-lg">
              {article.titleZh}
            </p>
          ) : null}
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 md:text-lg">
            {article.summary}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {article.topic} · {article.difficulty} · {article.estimatedMinutes} min
          </div>
          <Link
            href="/featured"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-600 dark:hover:text-sky-400"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回精选列表
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
            <Orbit aria-hidden="true" className="h-4 w-4" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            这一屏保留沉浸式模型互动，下方正文则回到标准单栏阅读，避免长文阅读疲劳。
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            可以切换“标准排版”快速验证可读性，也可以隐藏模型单独检查文字节奏。
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
            <Type aria-hidden="true" className="h-4 w-4" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            文章数据、3D 模型、主题色和思考题都来自同一份配置，后续补到 10 篇时不需要改页面逻辑。
          </p>
        </div>
      </div>

      <section
        ref={ref}
        className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-950"
        style={{ minHeight: stageHeight }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(147,197,253,0.35),transparent_38%)] dark:bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_35%)]" />
        <div className="absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-white/70 to-transparent dark:from-slate-950/50" />

        <div className="relative z-30 flex flex-wrap items-center gap-3 px-5 pt-5 md:px-8">
          <button
            type="button"
            onClick={() => setResetVersion((value) => value + 1)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/92 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-sky-600 dark:hover:text-sky-400"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            重置视角
          </button>
          <button
            type="button"
            onClick={() => setShowModel((value) => !value)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/92 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-sky-600 dark:hover:text-sky-400"
          >
            <EyeOff aria-hidden="true" className="h-4 w-4" />
            {showModel ? "隐藏模型" : "显示模型"}
          </button>
          <button
            type="button"
            onClick={() => setImmersiveLayout((value) => !value)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/92 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-sky-600 dark:hover:text-sky-400"
          >
            <Type aria-hidden="true" className="h-4 w-4" />
            {immersiveLayout ? "标准排版" : "沉浸排版"}
          </button>
        </div>

        {showModel ? (
          <div className="absolute inset-x-0 top-0 z-0" style={{ height: sceneHeight }}>
            <FeaturedSceneCanvas
              accentColor={article.theme.accent}
              cameraPreset={article.cameraPreset}
              enableSampling={immersiveLayout && textBox.width > 0 && textBox.height > 0}
              modelSrc={article.modelSrc}
              onContourFrame={(frame) => {
                startTransition(() => {
                  setContourFrame(frame);
                });
              }}
              resetVersion={resetVersion}
              rowHeight={lineHeight}
              sampleScale={sampleScale}
              showModel={showModel}
              textBox={textBox}
            />
          </div>
        ) : null}

        <PretextContourText
          contourFrame={immersiveLayout && showModel ? contourFrame : null}
          fontSize={fontSize}
          lineHeight={lineHeight}
          onMetricsChange={({ height }) => {
            setContentHeight((previous) => (Math.abs(previous - height) > 6 ? height : previous));
          }}
          text={article.body}
          textBox={textBox}
        />
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        <article className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:p-8">
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Standard Reading
            </span>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
              {article.topic}
            </span>
          </div>

          <div className="space-y-5 text-[17px] leading-8 text-slate-700 dark:text-slate-200">
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </article>

        <aside className="space-y-6">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Key Takeaways</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {article.keyPoints.map((point) => (
                <li key={point} className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/80">
                  {point}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Vocabulary Focus</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {article.vocabularyFocus.map((word) => (
                <span
                  key={word}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                  {word}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Thinking Questions</h2>
            <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {article.questions.map((question, index) => (
                <li key={question} className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/80">
                  {index + 1}. {question}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </section>
    </main>
  );
}
