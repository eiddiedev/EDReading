"use client";

import type { FeaturedDemoConfig } from "@/features/featured/types";
import { FeaturedArticleExperience } from "@/features/featured/article/FeaturedArticleExperience";

interface FeaturedArticleExperienceShellProps {
  article: FeaturedDemoConfig;
}

export function FeaturedArticleExperienceShell({
  article,
}: FeaturedArticleExperienceShellProps) {
  return <FeaturedArticleExperience article={article} />;
}
