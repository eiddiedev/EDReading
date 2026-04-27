import { notFound } from "next/navigation";
import { FeaturedArticleExperienceShell } from "@/features/featured/article/FeaturedArticleExperienceShell";
import { FEATURED_DEMO_ARTICLES, getFeaturedArticleBySlug } from "@/features/featured/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return FEATURED_DEMO_ARTICLES.map((article) => ({
    slug: article.slug,
  }));
}

export default async function FeaturedArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getFeaturedArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  return <FeaturedArticleExperienceShell article={article} />;
}
