import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Boxes,
  Clock3,
  Library,
  Orbit,
  Sparkles,
} from "lucide-react";
import { FEATURED_DEMO_ARTICLES } from "@/features/featured/content";
import type { FeaturedDemoConfig } from "@/features/featured/types";

function getTotalMinutes(articles: FeaturedDemoConfig[]) {
  return articles.reduce((total, article) => total + article.estimatedMinutes, 0);
}

function getVocabularyCount(articles: FeaturedDemoConfig[]) {
  return new Set(articles.flatMap((article) => article.vocabularyFocus)).size;
}

function getModelName(modelSrc: string) {
  return decodeURIComponent(modelSrc.replace("/models/landmarks/", "").replace(/\.glb$/i, ""));
}

export function FeaturedLandingScreen() {
  const [heroArticle, ...supportingArticles] = FEATURED_DEMO_ARTICLES;
  const totalMinutes = getTotalMinutes(FEATURED_DEMO_ARTICLES);
  const vocabularyCount = getVocabularyCount(FEATURED_DEMO_ARTICLES);
  const spotlightArticles = supportingArticles.slice(0, 3);

  return (
    <main className="featured-production-page min-h-screen overflow-hidden text-stone-100">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(217,119,6,0.20),transparent_28%),radial-gradient(circle_at_72%_10%,rgba(59,130,246,0.17),transparent_30%),radial-gradient(circle_at_50%_72%,rgba(124,58,237,0.16),transparent_34%),linear-gradient(180deg,#05060d_0%,#03040a_54%,#080605_100%)]" />
        <div className="absolute inset-0 opacity-[0.38] [background-image:radial-gradient(circle,rgba(255,255,255,0.72)_0_1px,transparent_1.4px),radial-gradient(circle,rgba(252,211,77,0.42)_0_1px,transparent_1.5px)] [background-position:0_0,80px_120px] [background-size:190px_190px,310px_310px]" />
        <div className="absolute left-1/2 top-10 h-[620px] w-[620px] -translate-x-1/2 rounded-full border border-white/[0.06]" />
        <div className="absolute left-1/2 top-28 h-[420px] w-[920px] -translate-x-1/2 rounded-[999px] border border-amber-200/[0.08] rotate-[-8deg]" />
      </div>

      <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 pb-10 pt-6 sm:px-6 lg:px-8 lg:pb-16">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <Link href="/library" className="inline-flex items-center gap-3 text-sm font-semibold text-stone-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-300 text-stone-950">
              ED
            </span>
            <span>EDReading Featured</span>
          </Link>

          <nav aria-label="精选文章导航" className="flex items-center gap-2 text-sm text-stone-300">
            <Link
              href="/library"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <Library className="h-4 w-4" />
              文库
            </Link>
            <Link
              href={`/featured/${heroArticle.slug}`}
              className="inline-flex items-center gap-2 rounded-full bg-white text-stone-950 px-4 py-2 font-medium transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              开始阅读
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </header>

        <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.1fr)_430px]">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-[0_28px_120px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="absolute bottom-0 right-12 h-44 w-44 rounded-full bg-sky-400/10 blur-3xl" />

            <div className="relative max-w-4xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">
                <Sparkles className="h-3.5 w-3.5" />
                Immersive Landmark Reading
              </p>
              <h1 className="mt-7 max-w-4xl text-balance font-serif text-5xl leading-[0.96] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
                把世界名胜，变成一座可阅读的星际博物馆。
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-stone-300 sm:text-lg">
                精选文章不再只是示例入口，而是一套可正式上线的沉浸式阅读展厅：英文文章、词汇焦点、思考问题与 3D 模型在同一个阅读节奏里协作。
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/featured/${heroArticle.slug}`}
                  className="group inline-flex items-center gap-2 rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-stone-950 shadow-[0_18px_60px_rgba(251,191,36,0.24)] transition hover:-translate-y-0.5 hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100"
                >
                  阅读主打专题
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/library"
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-5 py-3 text-sm font-medium text-stone-200 transition hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
                >
                  返回文库
                </Link>
              </div>

              <dl className="mt-10 grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-stone-400">
                    <BookOpenText className="h-4 w-4 text-amber-200" />
                    Articles
                  </dt>
                  <dd className="mt-3 text-3xl font-semibold text-white">{FEATURED_DEMO_ARTICLES.length}</dd>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-stone-400">
                    <Clock3 className="h-4 w-4 text-amber-200" />
                    Minutes
                  </dt>
                  <dd className="mt-3 text-3xl font-semibold text-white">{totalMinutes}</dd>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-stone-400">
                    <Boxes className="h-4 w-4 text-amber-200" />
                    Vocabulary
                  </dt>
                  <dd className="mt-3 text-3xl font-semibold text-white">{vocabularyCount}</dd>
                </div>
              </dl>
            </div>
          </section>

          <Link
            href={`/featured/${heroArticle.slug}`}
            className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-stone-950 p-6 shadow-[0_28px_120px_rgba(0,0,0,0.42)] transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            style={{
              backgroundImage: `radial-gradient(circle at 70% 20%, ${heroArticle.theme.glow}, transparent 34%), linear-gradient(150deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02) 34%, rgba(0,0,0,0.52))`,
            }}
          >
            <div className="absolute inset-x-8 top-8 h-52 rounded-full border border-white/10 opacity-70" />
            <div className="absolute right-8 top-16 h-44 w-44 rounded-full border border-amber-100/20" />
            <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-amber-300/10 blur-3xl" />

            <div className="relative flex h-full min-h-[460px] flex-col justify-between">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.26em] text-amber-100">
                  <Orbit className="h-3.5 w-3.5" />
                  Lead Exhibit
                </p>
                <div className="mt-10 aspect-square rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_45%,rgba(251,191,36,0.22),rgba(255,255,255,0.04)_34%,transparent_64%)] p-8">
                  <div className="flex h-full items-center justify-center rounded-full border border-white/10 bg-black/20 text-center">
                    <div>
                      <p className="font-serif text-5xl text-white">{heroArticle.titleZh ?? "精选"}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.28em] text-stone-400">
                        3D Reading Module
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-400">
                  {heroArticle.topic}
                </p>
                <h2 className="mt-3 font-serif text-4xl leading-tight text-white">
                  {heroArticle.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-stone-300">{heroArticle.summary}</p>
                <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-stone-200">
                  <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1.5">
                    {heroArticle.difficulty}
                  </span>
                  <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1.5">
                    {heroArticle.estimatedMinutes} min
                  </span>
                  <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1.5">
                    {heroArticle.vocabularyFocus.length} words
                  </span>
                </div>
                <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5 text-sm font-medium text-amber-100">
                  <span>进入沉浸式阅读</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        <section className="grid gap-4 lg:grid-cols-3">
          {spotlightArticles.map((article) => (
            <Link
              key={article.id}
              href={`/featured/${article.slug}`}
              className="group overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                {article.topic}
              </p>
              <h3 className="mt-4 text-2xl font-semibold text-white">{article.title}</h3>
              {article.titleZh ? <p className="mt-1 text-sm text-amber-100/80">{article.titleZh}</p> : null}
              <p className="mt-4 line-clamp-3 text-sm leading-7 text-stone-300">{article.summary}</p>
              <div className="mt-6 flex items-center justify-between text-xs text-stone-400">
                <span>{article.difficulty} / {article.estimatedMinutes} min</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1 group-hover:text-amber-200" />
              </div>
            </Link>
          ))}
        </section>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-[#0a0b12]/86 p-5 shadow-[0_28px_120px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:p-7">
          <div className="flex flex-col justify-between gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">
                Curated Reading Atlas
              </p>
              <h2 className="mt-3 font-serif text-4xl tracking-[-0.03em] text-white">
                精选专题索引
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-stone-300">
              每张卡片都是一个可进入的 3D 阅读展厅，适合在正式环境中作为内容推荐、课程专题或模型阅读实验入口。
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {FEATURED_DEMO_ARTICLES.map((article, index) => (
              <ArticleCard key={article.id} article={article} index={index} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

interface ArticleCardProps {
  article: FeaturedDemoConfig;
  index: number;
}

function ArticleCard({ article, index }: ArticleCardProps) {
  return (
    <Link
      href={`/featured/${article.slug}`}
      className="group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-1 hover:border-white/18 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
    >
      <div
        className="absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-25 blur-2xl transition group-hover:opacity-40"
        style={{ backgroundColor: article.theme.accent }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
              {(index + 1).toString().padStart(2, "0")} / {article.topic}
            </p>
            <h3 className="mt-3 text-xl font-semibold leading-tight text-white">
              {article.title}
            </h3>
            {article.titleZh ? <p className="mt-1 text-sm text-stone-400">{article.titleZh}</p> : null}
          </div>
          <span
            className="mt-1 h-3 w-3 shrink-0 rounded-full shadow-[0_0_24px_currentColor]"
            style={{ color: article.theme.accent, backgroundColor: article.theme.accent }}
          />
        </div>

        <p className="mt-4 line-clamp-3 text-sm leading-7 text-stone-300">{article.summary}</p>

        <div className="mt-5 flex flex-wrap gap-2 text-xs text-stone-300">
          <span className="rounded-full border border-white/10 bg-black/18 px-3 py-1.5">{article.difficulty}</span>
          <span className="rounded-full border border-white/10 bg-black/18 px-3 py-1.5">{article.estimatedMinutes} min</span>
          <span className="rounded-full border border-white/10 bg-black/18 px-3 py-1.5">{article.vocabularyFocus.length} words</span>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-stone-500">
          <span className="truncate pr-4">{getModelName(article.modelSrc)}</span>
          <span className="inline-flex items-center gap-1 text-amber-100 opacity-0 transition group-hover:opacity-100">
            Open
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
