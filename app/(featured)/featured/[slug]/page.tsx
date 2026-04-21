import { notFound } from "next/navigation";
import { FeaturedArticleExperience } from "@/features/featured/article/FeaturedArticleExperience";
import { FEATURED_DEMO_ARTICLES, getFeaturedArticleBySlug } from "@/features/featured/content";

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

  return <FeaturedArticleExperience article={article} />;
}
