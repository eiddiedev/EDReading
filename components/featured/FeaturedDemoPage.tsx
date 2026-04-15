"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Orbit, Sparkles } from "lucide-react";
import { FEATURED_DEMO_ARTICLES } from "@/lib/featured/demo-content";
import { FeaturedSceneCanvas } from "@/components/featured/FeaturedSceneCanvas";
import { PretextContourText } from "@/components/featured/PretextContourText";
import type { ContourFrame } from "@/types";

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

export function FeaturedDemoPage() {
  const article = FEATURED_DEMO_ARTICLES[0];
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [contourFrame, setContourFrame] = useState<ContourFrame | null>(null);
  const [contentHeight, setContentHeight] = useState(1120);

  const isMobile = width > 0 && width < 768;
  const fontSize = isMobile ? 16 : 19;
  const lineHeight = isMobile ? 30 : 36;
  const stageHeight = Math.max(isMobile ? 1040 : 1120, contentHeight + 168);
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

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-600 dark:text-sky-400">
            Featured Demo
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100 md:text-5xl">
            {article.title}
          </h1>
          {article.titleZh ? (
            <p className="mt-3 text-base text-slate-500 dark:text-slate-400 md:text-lg">
              {article.titleZh}
            </p>
          ) : null}
        </div>
        <Link
          href="/library"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-600 dark:hover:text-sky-400"
        >
          <ArrowLeft className="h-4 w-4" />
          返回文库
        </Link>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
            <Orbit className="h-4 w-4" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            按住左键拖拽视角，鼠标滚轮缩放，移动端支持单指旋转和双指缩放。
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            文字会按模型当前视角下的真实轮廓逐帧回流，中间自动留出可视空间。
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
            <ArrowLeft className="h-4 w-4" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            这是 1 篇 demo 内容，后续你只需要替换文本和模型配置即可继续扩展。
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

        <FeaturedSceneCanvas
          accentColor={article.theme.accent}
          cameraPreset={article.cameraPreset}
          enableSampling={textBox.width > 0 && textBox.height > 0}
          modelSrc={article.modelSrc}
          onContourFrame={setContourFrame}
          rowHeight={lineHeight}
          sampleScale={sampleScale}
          textBox={textBox}
        />

        <PretextContourText
          contourFrame={contourFrame}
          fontSize={fontSize}
          lineHeight={lineHeight}
          onMetricsChange={({ height }) => {
            setContentHeight((previous) => (Math.abs(previous - height) > 6 ? height : previous));
          }}
          text={article.body}
          textBox={textBox}
        />
      </section>
    </main>
  );
}
