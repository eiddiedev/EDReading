"use client";

import dynamic from "next/dynamic";

const FeaturedDemoPage = dynamic(
  () => import("@/components/featured/FeaturedDemoPage").then((mod) => mod.FeaturedDemoPage),
  {
    ssr: false,
    loading: () => (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex min-h-[60vh] items-center justify-center rounded-[2rem] border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          正在加载精选文章 Demo...
        </div>
      </main>
    ),
  }
);

export default function FeaturedPage() {
  return <FeaturedDemoPage />;
}
