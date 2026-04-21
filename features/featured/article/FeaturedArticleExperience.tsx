"use client";

import { useRef } from "react";
import type { FeaturedDemoConfig } from "@/features/featured/types";
import { useFeaturedPretextScene } from "@/features/featured/article/useFeaturedPretextScene";

interface FeaturedArticleExperienceProps {
  article: FeaturedDemoConfig;
}

export function FeaturedArticleExperience({ article }: FeaturedArticleExperienceProps) {
  const sceneLayerRef = useRef<HTMLDivElement | null>(null);
  const copyLayerRef = useRef<HTMLDivElement | null>(null);
  const scrubFillRef = useRef<HTMLDivElement | null>(null);
  const statusChipRef = useRef<HTMLDivElement | null>(null);

  useFeaturedPretextScene({
    article,
    copyLayerRef,
    sceneLayerRef,
    scrubFillRef,
    statusChipRef,
  });

  return (
    <main className="pretext-app">
      <div ref={sceneLayerRef} className="pretext-scene-layer" />
      <div ref={copyLayerRef} className="pretext-copy-layer" />
      <div className="pretext-scrub-track">
        <div ref={scrubFillRef} className="pretext-scrub-fill" />
      </div>
      <div ref={statusChipRef} className="pretext-status-chip">
        Loading model…
      </div>
    </main>
  );
}
