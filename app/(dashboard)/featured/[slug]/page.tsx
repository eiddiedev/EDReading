import { notFound } from "next/navigation";
import { FeaturedDemoPage } from "@/components/featured/FeaturedDemoPage";
import { FEATURED_DEMO_ARTICLES, getFeaturedArticleBySlug } from "@/lib/featured/demo-content";

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

  return <FeaturedDemoPage article={article} />;
}
