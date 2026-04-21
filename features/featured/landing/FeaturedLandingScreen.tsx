import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FEATURED_DEMO_ARTICLES } from "@/features/featured/content";

export function FeaturedLandingScreen() {
  const [heroArticle, ...otherArticles] = FEATURED_DEMO_ARTICLES;

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2.75rem] border border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.94),rgba(255,255,255,0.98)_32%,rgba(248,250,252,0.98)_100%)] shadow-[0_35px_120px_rgba(15,23,42,0.14)] dark:border-stone-800/80 dark:bg-[linear-gradient(180deg,rgba(41,37,36,0.96),rgba(15,23,42,0.98)_35%,rgba(2,6,23,1)_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_28%),linear-gradient(180deg,transparent,rgba(255,255,255,0.55))] dark:bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_24%),linear-gradient(180deg,transparent,rgba(2,6,23,0.45))]" />

        <div className="relative grid gap-10 px-6 py-8 md:px-10 md:py-10 xl:grid-cols-[minmax(0,1.2fr)_420px] xl:gap-14">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-amber-700 dark:text-amber-300">
              Featured Landmarks
            </p>
            <h1 className="mt-4 max-w-4xl text-balance font-serif text-4xl leading-tight text-stone-950 dark:text-stone-50 md:text-6xl md:leading-[1.04]">
              把 3D 模型真正带进英文文章排版的首页精选。
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-stone-700 dark:text-stone-300 md:text-lg">
              这里不是给景点加一张配图，而是让模型轮廓直接参与文字回流。每篇文章都围绕一处名胜古迹展开，你后续只需要替换模型和正文，就能继续沿用这一整套版式。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/featured/${heroArticle.slug}`}
                className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white"
              >
                打开主打文章
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/library"
                className="inline-flex items-center gap-2 rounded-full border border-stone-300/80 bg-white/85 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-200 dark:hover:border-amber-400 dark:hover:text-amber-300"
              >
                返回原文库
              </Link>
            </div>

            <div className="mt-10 grid gap-6 border-t border-stone-200/80 pt-6 text-sm text-stone-600 dark:border-stone-800/80 dark:text-stone-300 md:grid-cols-3">
              <div>
                <p className="font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
                  Collection
                </p>
                <p className="mt-2 leading-7">{FEATURED_DEMO_ARTICLES.length} 篇精选名胜古迹文章，适合做首页专题入口。</p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
                  Material
                </p>
                <p className="mt-2 leading-7">每篇文章绑定独立 `glb` 模型路径，后续只需按约定文件名替换。</p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
                  Layout
                </p>
                <p className="mt-2 leading-7">首屏保留沉浸式 Pretext 绕排，下方回到标准长文阅读，不动其他页面逻辑。</p>
              </div>
            </div>
          </div>

          <Link
            href={`/featured/${heroArticle.slug}`}
            className="group relative overflow-hidden rounded-[2.4rem] border border-stone-200/80 bg-stone-950 p-7 text-white shadow-2xl transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-stone-700/80"
            style={{
              backgroundImage: `linear-gradient(160deg, ${heroArticle.theme.glow}, rgba(17,24,39,0.96) 28%, rgba(12,10,9,1) 100%)`,
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_36%)] opacity-80" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200/80">
                Lead Story
              </p>
              <h2 className="mt-5 font-serif text-3xl leading-tight text-white md:text-4xl">
                {heroArticle.title}
              </h2>
              {heroArticle.titleZh ? (
                <p className="mt-3 text-base text-stone-300">{heroArticle.titleZh}</p>
              ) : null}
              <p className="mt-5 text-sm leading-7 text-stone-300">{heroArticle.summary}</p>

              <div className="mt-8 flex flex-wrap gap-2 text-xs font-medium text-stone-200">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                  {heroArticle.topic}
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                  {heroArticle.difficulty}
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                  {heroArticle.estimatedMinutes} min
                </span>
              </div>

              <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-5 text-sm text-stone-200">
                <span>进入 3D 阅读页面</span>
                <ArrowRight aria-hidden="true" className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      <section className="mt-10 rounded-[2.4rem] border border-stone-200/80 bg-white/92 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-stone-800 dark:bg-stone-950/92 md:p-8">
        <div className="grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500 dark:text-stone-400">
              Curated Index
            </p>
            <h2 className="mt-3 font-serif text-3xl text-stone-950 dark:text-stone-50">
              十篇可直接替换内容的名胜专题
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-600 dark:text-stone-300">
              现在已经按专题把文章位、slug 和模型路径预留好了。你后续只需要补自己的 `glb` 模型和正文，不需要再动页面结构。
            </p>
          </div>

          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
            {[heroArticle, ...otherArticles].map((article, index) => (
              <Link
                key={article.id}
                href={`/featured/${article.slug}`}
                className="group border-b border-stone-200/80 pb-5 transition last:border-b-0 md:last:border-b md:even:pr-0 dark:border-stone-800/80"
              >
                <div className="flex items-start gap-4">
                  <span
                    className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: article.theme.accent }}
                  >
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">
                      {article.topic}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-stone-950 transition group-hover:text-amber-700 dark:text-stone-100 dark:group-hover:text-amber-300">
                      {article.title}
                    </h3>
                    {article.titleZh ? (
                      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{article.titleZh}</p>
                    ) : null}
                    <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-stone-300">
                      {article.summary}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-500 dark:text-stone-400">
                      <span>{article.difficulty}</span>
                      <span>{article.estimatedMinutes} min</span>
                      <span>{article.modelSrc.replace("/models/landmarks/", "")}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
