import Link from "next/link";
import { ArrowRight, Orbit, Sparkles } from "lucide-react";
import { FEATURED_DEMO_ARTICLES } from "@/lib/featured/demo-content";

export function FeaturedLandingPage() {
  const [heroArticle, ...otherArticles] = FEATURED_DEMO_ARTICLES;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.35),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(167,243,208,0.25),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.14),transparent_32%)]" />
        <div className="relative grid gap-8 px-6 py-8 md:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.9fr)] md:px-10 md:py-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-sky-600 dark:text-sky-400">
              Featured Reading
            </p>
            <h1 className="mt-4 text-balance text-4xl font-bold text-slate-900 dark:text-slate-100 md:text-6xl">
              3D 模型与英文阅读真正共存的精选文章页
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 md:text-lg">
              这里不是把模型塞进文章旁边，而是让文字围绕模型的真实轮廓回流。首屏负责沉浸感，下方正文回到高效率阅读，兼顾记忆点与可读性。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/featured/${heroArticle.slug}`}
                className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                阅读主打文章
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/library"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-600 dark:hover:text-sky-400"
              >
                返回文库
              </Link>
            </div>
          </div>

          <div className="grid gap-4 self-start">
            <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
                <Orbit aria-hidden="true" className="h-5 w-5" />
              </div>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                每篇文章都可以绑定独立的模型、镜头范围、主题色和阅读信息，后续扩充到 10 篇只需要继续补配置。
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Sparkles aria-hidden="true" className="h-5 w-5" />
              </div>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                详情页内置“重置视角、隐藏模型、标准排版”三种控制，方便你快速验证真实阅读体验，而不是只看一个炫技 Demo。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
              Curated Collection
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-3xl">
              当前精选文章
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            建议每篇文章配一个主题明确的模型和一句强导语。列表页负责选择，详情页负责沉浸与学习。
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[heroArticle, ...otherArticles].map((article) => (
            <Link
              key={article.id}
              href={`/featured/${article.slug}`}
              className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-800 dark:bg-slate-950"
              style={{
                backgroundImage: `linear-gradient(135deg, ${article.theme.glow}, rgba(255,255,255,0.96) 48%, rgba(248,250,252,0.92) 100%)`,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    {article.topic}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {article.title}
                  </h3>
                  {article.titleZh ? (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{article.titleZh}</p>
                  ) : null}
                </div>
                <span
                  className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm"
                  style={{ backgroundColor: article.theme.accent }}
                >
                  <ArrowRight aria-hidden="true" className="h-5 w-5 transition group-hover:translate-x-0.5" />
                </span>
              </div>

              <p className="mt-5 line-clamp-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {article.summary}
              </p>

              <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span className="rounded-full bg-white/70 px-3 py-1.5 dark:bg-slate-800/90">
                  {article.difficulty}
                </span>
                <span className="rounded-full bg-white/70 px-3 py-1.5 dark:bg-slate-800/90">
                  {article.estimatedMinutes} min
                </span>
                <span className="rounded-full bg-white/70 px-3 py-1.5 dark:bg-slate-800/90">
                  {article.vocabularyFocus.length} 个重点词
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
