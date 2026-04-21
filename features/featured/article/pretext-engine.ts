"use client";

import { layoutNextLine, prepareWithSegments } from "@chenglou/pretext";
import * as THREE from "three";
import type { FeaturedDemoConfig } from "@/features/featured/types";

interface Slot {
  left: number;
  right: number;
}

interface MaskInterval {
  left: number;
  right: number;
}

interface Region {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScrubRanges {
  yawRange: [number, number];
  pitchRange: [number, number];
  distanceRange: [number, number];
  panRange: [number, number];
}

interface LeadLineSpec {
  prepared: PreparedText;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  fontWeight: string;
  textTransform: "none" | "uppercase";
  slotHeight: number;
  advanceAfter: number;
  align: "left" | "right";
}

type PreparedText = ReturnType<typeof prepareWithSegments>;

export interface PointerState {
  dragging: boolean;
  progress: number;
  target: number;
  startX: number;
  startProgress: number;
}

export interface LinePlacement {
  x: number;
  y: number;
  text: string;
  width: number;
  slotWidth: number;
  align: "left" | "right" | "justify";
  wordSpacing: string;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  fontWeight: string;
  textTransform: "none" | "uppercase";
}

export interface PreparedBlock {
  id: string;
  bodyAlign: "left" | "right";
  titleAlign: "left" | "right";
  headerOffset: number;
  leadLines: LeadLineSpec[];
  preparedParagraphs: PreparedText[];
}

const BODY_FONT_FAMILY = '"Iowan Old Style","Palatino Linotype","Book Antiqua",Palatino,serif';
const BODY_FONT_SIZE = 14;
export const BODY_LINE_HEIGHT = 22;
const BODY_FONT = `${BODY_FONT_SIZE}px ${BODY_FONT_FAMILY}`;
const KICKER_FONT = '8px "Helvetica Neue", Helvetica, Arial, sans-serif';
const KICKER_FONT_SIZE = 8;
const KICKER_LINE_HEIGHT = 12;
const TITLE_FONT_SIZE_LARGE = 44;
const TITLE_FONT_SIZE_SMALL = 15;
const TITLE_LINE_HEIGHT_LARGE = 36;
const TITLE_LINE_HEIGHT_SMALL = 18;
const MIN_SLOT_WIDTH = 160;
export const SCRUB_RANGES: ScrubRanges = {
  yawRange: [-0.6, 0.4],
  pitchRange: [0.02, 0.1],
  distanceRange: [1.3, 0.4],
  panRange: [-0.6, 0.6],
};
export const MASK_SIZE = { width: 1024, height: 576 };
const MASK_PADDING = 20;
const MIN_JUSTIFY_WIDTH = 180;
const MAX_RENDERER_DPR = 1.5;

function splitParagraphs(text: string) {
  return text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function getScrubPose(progress: number, ranges: ScrubRanges) {
  const t = clamp(progress, 0, 1);

  return {
    yaw: lerp(ranges.yawRange[0], ranges.yawRange[1], t),
    pitch: lerp(ranges.pitchRange[0], ranges.pitchRange[1], t),
    distance: lerp(ranges.distanceRange[0], ranges.distanceRange[1], t),
    panX: lerp(ranges.panRange[0], ranges.panRange[1], t),
  };
}

export function getLayoutCacheKey(viewportWidth: number, viewportHeight: number, poseKey: number | string) {
  const normalizedPoseKey = typeof poseKey === "number" ? poseKey.toFixed(4) : poseKey;

  return `${viewportWidth}:${viewportHeight}:${normalizedPoseKey}`;
}

export function getRendererPixelRatio(viewportWidth: number) {
  if (typeof window === "undefined") return 1;

  const cappedDpr = Math.min(window.devicePixelRatio || 1, MAX_RENDERER_DPR);
  return viewportWidth < 768 ? Math.min(cappedDpr, 1.25) : cappedDpr;
}

export function disposeModel(root: THREE.Object3D | null) {
  if (!root) return;

  const disposedMaterials = new Set<THREE.Material>();
  const disposedGeometries = new Set<THREE.BufferGeometry>();

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    if (!disposedGeometries.has(child.geometry)) {
      child.geometry.dispose();
      disposedGeometries.add(child.geometry);
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (disposedMaterials.has(material)) return;
      material.dispose();
      disposedMaterials.add(material);
    });
  });
}

function getMaskIntervalForBand(
  mask: ImageData,
  bandTop: number,
  bandBottom: number,
  viewportWidth: number,
  viewportHeight: number,
  options: { threshold?: number; padding?: number; minPixels?: number } = {}
): MaskInterval | null {
  const { data, width, height } = mask;
  const threshold = options.threshold ?? 20;
  const padding = options.padding ?? 0;
  const minPixels = options.minPixels ?? 1;
  const top = clamp(Math.floor((bandTop / viewportHeight) * height), 0, height - 1);
  const bottom = clamp(Math.ceil((bandBottom / viewportHeight) * height), 0, height - 1);

  let left = width;
  let right = -1;
  let hits = 0;

  for (let y = top; y <= bottom; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if ((data[offset] ?? 0) < threshold) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      hits += 1;
    }
  }

  if (hits < minPixels || right < left) return null;

  const scaleX = viewportWidth / width;

  return {
    left: left * scaleX - padding,
    right: (right + 1) * scaleX + padding,
  };
}

function shouldJustifyLine(text: string, slotWidth: number, minJustifyWidth = 160) {
  if (slotWidth < minJustifyWidth) return false;

  const words = text.trim().split(/\s+/);
  if (words.length < 4) return false;
  if (!text.includes(" ")) return false;

  return !/[.!?]$/.test(text.trim());
}

function mergeIntervals(intervals: MaskInterval[], minLeft: number, maxRight: number) {
  const clipped = intervals
    .map((interval) => ({
      left: Math.max(minLeft, interval.left),
      right: Math.min(maxRight, interval.right),
    }))
    .filter((interval) => interval.right > interval.left)
    .sort((a, b) => a.left - b.left);

  if (clipped.length === 0) return [] as Slot[];

  const merged: Slot[] = [clipped[0]];
  for (let index = 1; index < clipped.length; index += 1) {
    const current = clipped[index];
    const previous = merged[merged.length - 1];

    if (current.left <= previous.right) {
      previous.right = Math.max(previous.right, current.right);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

function carveTextLineSlots(base: Slot, blocked: Slot[], minSlotWidth: number) {
  let slots = [base];

  for (const interval of blocked) {
    const next: Slot[] = [];

    for (const slot of slots) {
      if (interval.right <= slot.left || interval.left >= slot.right) {
        next.push(slot);
        continue;
      }

      if (interval.left > slot.left) next.push({ left: slot.left, right: interval.left });
      if (interval.right < slot.right) next.push({ left: interval.right, right: slot.right });
    }

    slots = next;
  }

  return slots.filter((slot) => slot.right - slot.left >= minSlotWidth);
}

function chooseSlot(slots: Slot[], side: "left" | "right") {
  let chosen = slots[0];

  for (let index = 1; index < slots.length; index += 1) {
    const candidate = slots[index];
    const candidateWidth = candidate.right - candidate.left;
    const chosenWidth = chosen.right - chosen.left;

    if (candidateWidth > chosenWidth) {
      chosen = candidate;
      continue;
    }

    if (candidateWidth < chosenWidth) continue;

    if (side === "right" ? candidate.left > chosen.left : candidate.left < chosen.left) {
      chosen = candidate;
    }
  }

  return chosen;
}

function formatDisplayTitle(title: string) {
  const words = title
    .replace(/[^\w\s-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length <= 1) return title.toUpperCase();
  if (words.length === 2) return words.map((word) => word.toUpperCase()).join("\n");

  const midpoint = Math.ceil(words.length / 2);
  return `${words.slice(0, midpoint).join(" ").toUpperCase()}\n${words
    .slice(midpoint)
    .join(" ")
    .toUpperCase()}`;
}

function buildEditorialText(article: FeaturedDemoConfig) {
  const paragraphs = splitParagraphs(article.body);
  const leftText = paragraphs.slice(0, 2).join("\n\n");
  const centerText = paragraphs.slice(2).join("\n\n") || paragraphs.slice(1).join("\n\n");
  const rightText = [
    article.summary,
    ...article.keyPoints.map((point) => `• ${point}`),
  ].join("\n\n");
  const noteText = article.questions.map((question, index) => `${index + 1}. ${question}`).join("\n\n");

  return [
    {
      id: "block-left",
      kicker: article.topic,
      title: formatDisplayTitle(article.title),
      bodyAlign: "left" as const,
      titleAlign: "left" as const,
      headerOffset: 22,
      text: leftText,
    },
    {
      id: "block-center",
      kicker: `${article.difficulty} / ${article.estimatedMinutes} min`,
      title: article.titleZh ? formatDisplayTitle(article.titleZh) : "CURATED\nREADING",
      bodyAlign: "left" as const,
      titleAlign: "left" as const,
      headerOffset: 22,
      text: centerText,
    },
    {
      id: "block-right",
      kicker: "Model Notes",
      title: "LANDMARK\nNOTES",
      bodyAlign: "left" as const,
      titleAlign: "left" as const,
      headerOffset: 22,
      text: rightText,
    },
    {
      id: "block-note",
      kicker: "Thinking Questions",
      title: "GUIDED\nREADING",
      bodyAlign: "left" as const,
      titleAlign: "left" as const,
      headerOffset: 22,
      text: noteText,
    },
  ];
}

export function prepareBlocks(article: FeaturedDemoConfig): PreparedBlock[] {
  return buildEditorialText(article).map((block) => {
    const titleLines = block.title.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const leadLines: LeadLineSpec[] = [
      {
        prepared: prepareWithSegments(block.kicker.toUpperCase(), KICKER_FONT),
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        fontSize: `${KICKER_FONT_SIZE}px`,
        lineHeight: `${KICKER_LINE_HEIGHT}px`,
        letterSpacing: "0.28em",
        fontWeight: "400",
        textTransform: "uppercase",
        slotHeight: KICKER_LINE_HEIGHT,
        advanceAfter: 8,
        align: "left",
      },
      ...titleLines.map((text, index) => {
        const isLead = block.id === "block-left";
        const fontSize = isLead ? TITLE_FONT_SIZE_LARGE : TITLE_FONT_SIZE_SMALL;

        return {
          prepared: prepareWithSegments(text, `${fontSize}px ${BODY_FONT_FAMILY}`),
          fontFamily: BODY_FONT_FAMILY,
          fontSize: `${fontSize}px`,
          lineHeight: `${isLead ? TITLE_LINE_HEIGHT_LARGE : TITLE_LINE_HEIGHT_SMALL}px`,
          letterSpacing: isLead ? "0.08em" : "0.18em",
          fontWeight: "700",
          textTransform: "uppercase" as const,
          slotHeight: isLead ? TITLE_LINE_HEIGHT_LARGE : TITLE_LINE_HEIGHT_SMALL,
          advanceAfter: index === 0 ? 0 : 4,
          align: block.titleAlign,
        };
      }),
    ];

    return {
      id: block.id,
      bodyAlign: block.bodyAlign,
      titleAlign: block.titleAlign,
      headerOffset: block.headerOffset,
      leadLines,
      preparedParagraphs: splitParagraphs(block.text).map((paragraph) => prepareWithSegments(paragraph, BODY_FONT)),
    };
  });
}

function getRegions(width: number, height: number) {
  if (width < 980) {
    const fullWidth = width - 44;

    return [
      { id: "block-left", x: 22, y: 24, width: fullWidth, height: 210 },
      { id: "block-center", x: 22, y: 152, width: fullWidth, height: 224 },
      { id: "block-right", x: 22, y: 280, width: fullWidth, height: 172 },
      { id: "block-note", x: 22, y: 460, width: fullWidth, height: 132 },
    ] satisfies Region[];
  }

  const rightColWidth = Math.min(width * 0.27, 360);
  const rightColX = width - rightColWidth - 38;

  return [
    { id: "block-left", x: 32, y: 30, width: Math.min(width * 0.3, 430), height: height * 0.7 },
    { id: "block-center", x: width * 0.356, y: 30, width: Math.min(width * 0.29, 400), height: height * 0.7 },
    { id: "block-right", x: rightColX, y: 30, width: rightColWidth, height: height * 0.4 },
    { id: "block-note", x: rightColX, y: Math.max(380, height * 0.5), width: rightColWidth, height: height * 0.4 },
  ] satisfies Region[];
}

function placeFlowLine(
  lineSpec: LeadLineSpec,
  region: Region,
  mask: ImageData,
  viewportWidth: number,
  viewportHeight: number,
  y: number,
  fallbackLineHeight: number,
  options: { allowRightAlign?: boolean } = {}
) {
  let currentY = y;
  const lineHeight = parseFloat(lineSpec.lineHeight) || fallbackLineHeight;

  while (currentY + lineHeight <= region.y + region.height) {
    const interval = getMaskIntervalForBand(mask, currentY - 4, currentY + lineHeight + 2, viewportWidth, viewportHeight, {
      threshold: 26,
      padding: MASK_PADDING,
      minPixels: 1,
    });

    const merged = interval === null ? [] : mergeIntervals([interval], region.x, region.x + region.width);
    const slots = carveTextLineSlots({ left: region.x, right: region.x + region.width }, merged, MIN_SLOT_WIDTH);

    if (slots.length === 0) {
      currentY += lineHeight;
      continue;
    }

    const slot = chooseSlot(slots, options.allowRightAlign ? "right" : "left");
    const slotWidth = slot.right - slot.left;
    const line = layoutNextLine(lineSpec.prepared, { segmentIndex: 0, graphemeIndex: 0 }, slotWidth);

    if (line === null) {
      currentY += lineHeight;
      continue;
    }

    return {
      line: {
        x: Math.round(slot.left),
        y: Math.round(currentY),
        text: line.text,
        width: line.width,
        slotWidth: Math.floor(slotWidth),
        align: lineSpec.align,
        wordSpacing: "0px",
        fontFamily: lineSpec.fontFamily,
        fontSize: lineSpec.fontSize,
        lineHeight: lineSpec.lineHeight,
        letterSpacing: lineSpec.letterSpacing,
        fontWeight: lineSpec.fontWeight,
        textTransform: lineSpec.textTransform,
      } satisfies LinePlacement,
      nextY: currentY + lineHeight + (lineSpec.advanceAfter ?? 0),
    };
  }

  return null;
}

function layoutBlock(
  block: PreparedBlock,
  region: Region,
  mask: ImageData,
  viewportWidth: number,
  viewportHeight: number
) {
  const lines: LinePlacement[] = [];
  let y = region.y + block.headerOffset;

  for (const leadLine of block.leadLines) {
    const placed = placeFlowLine(leadLine, region, mask, viewportWidth, viewportHeight, y, BODY_LINE_HEIGHT, {
      allowRightAlign: block.titleAlign === "right",
    });

    if (placed === null) {
      y += leadLine.slotHeight;
      continue;
    }

    lines.push(placed.line);
    y = placed.nextY;
  }

  y += 16;

  for (const preparedParagraph of block.preparedParagraphs) {
    let cursor = { segmentIndex: 0, graphemeIndex: 0 };

    while (y + BODY_LINE_HEIGHT <= region.y + region.height) {
      const interval = getMaskIntervalForBand(mask, y - 4, y + BODY_LINE_HEIGHT + 2, viewportWidth, viewportHeight, {
        threshold: 26,
        padding: MASK_PADDING,
        minPixels: 1,
      });

      const merged = interval === null ? [] : mergeIntervals([interval], region.x, region.x + region.width);
      const slots = carveTextLineSlots({ left: region.x, right: region.x + region.width }, merged, MIN_SLOT_WIDTH);

      if (slots.length === 0) {
        y += BODY_LINE_HEIGHT;
        continue;
      }

      const slot = chooseSlot(slots, block.bodyAlign);
      const slotWidth = slot.right - slot.left;
      const line = layoutNextLine(preparedParagraph, cursor, slotWidth);

      if (line === null) break;

      const wordCount = line.text.trim().split(/\s+/).length;
      const isNarrowSlot = slotWidth < MIN_JUSTIFY_WIDTH || wordCount < 4;
      const justify = !isNarrowSlot && shouldJustifyLine(line.text, slotWidth, MIN_JUSTIFY_WIDTH);
      const align = justify ? "justify" : block.bodyAlign;

      let wordSpacing = "0px";
      if (justify && wordCount > 1) {
        const rawSpace = Math.max(0, (slotWidth - line.width) / (wordCount - 1));
        wordSpacing = `${Math.floor(rawSpace * 10) / 10}px`;
      }

      lines.push({
        x: Math.round(slot.left),
        y: Math.round(y),
        text: line.text,
        width: line.width,
        slotWidth: Math.floor(slotWidth),
        align,
        wordSpacing,
        fontFamily: BODY_FONT_FAMILY,
        fontSize: `${BODY_FONT_SIZE}px`,
        lineHeight: `${BODY_LINE_HEIGHT}px`,
        letterSpacing: "0.006em",
        fontWeight: "400",
        textTransform: "none",
      });

      cursor = line.end;
      y += BODY_LINE_HEIGHT;
    }

    y += BODY_LINE_HEIGHT * 0.8;
  }

  return lines;
}

export function getLinePlacements(
  preparedBlocks: PreparedBlock[],
  mask: ImageData,
  viewportWidth: number,
  viewportHeight: number
) {
  const regions = getRegions(viewportWidth, viewportHeight);
  const lines: LinePlacement[] = [];

  for (const block of preparedBlocks) {
    const region = regions.find((entry) => entry.id === block.id);
    if (!region) continue;
    lines.push(...layoutBlock(block, region, mask, viewportWidth, viewportHeight));
  }

  return lines;
}
