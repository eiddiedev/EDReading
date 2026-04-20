"use client";

import { layoutNextLine, prepareWithSegments } from "@chenglou/pretext";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { FeaturedDemoConfig } from "@/types";

interface FeaturedDemoPageProps {
  article: FeaturedDemoConfig;
}

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

interface PointerState {
  dragging: boolean;
  progress: number;
  target: number;
  startX: number;
  startProgress: number;
}

interface ScrubRanges {
  yawRange: [number, number];
  pitchRange: [number, number];
  distanceRange: [number, number];
  panRange: [number, number];
}

interface LinePlacement {
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

type PreparedText = ReturnType<typeof prepareWithSegments>;

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

interface PreparedBlock {
  id: string;
  bodyAlign: "left" | "right";
  titleAlign: "left" | "right";
  headerOffset: number;
  leadLines: LeadLineSpec[];
  preparedParagraphs: PreparedText[];
}

const BODY_FONT_FAMILY = '"Iowan Old Style","Palatino Linotype","Book Antiqua",Palatino,serif';
const BODY_FONT_SIZE = 14;
const BODY_LINE_HEIGHT = 22;
const BODY_FONT = `${BODY_FONT_SIZE}px ${BODY_FONT_FAMILY}`;
const KICKER_FONT = '8px "Helvetica Neue", Helvetica, Arial, sans-serif';
const KICKER_FONT_SIZE = 8;
const KICKER_LINE_HEIGHT = 12;
const TITLE_FONT_SIZE_LARGE = 44;
const TITLE_FONT_SIZE_SMALL = 15;
const TITLE_LINE_HEIGHT_LARGE = 36;
const TITLE_LINE_HEIGHT_SMALL = 18;
const MIN_SLOT_WIDTH = 160;
const SCRUB_RANGES: ScrubRanges = {
  yawRange: [-0.6, 0.4],
  pitchRange: [0.02, 0.1],
  distanceRange: [1.3, 0.4],
  panRange: [-0.6, 0.6],
};
const MASK_SIZE = { width: 1024, height: 576 };
const MASK_PADDING = 20;
const MIN_JUSTIFY_WIDTH = 180;
const FRAME_Y_OFFSET = -0.32;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function splitParagraphs(text: string) {
  return text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

function getScrubPose(progress: number, ranges: ScrubRanges) {
  const t = clamp(progress, 0, 1);

  return {
    yaw: lerp(ranges.yawRange[0], ranges.yawRange[1], t),
    pitch: lerp(ranges.pitchRange[0], ranges.pitchRange[1], t),
    distance: lerp(ranges.distanceRange[0], ranges.distanceRange[1], t),
    panX: lerp(ranges.panRange[0], ranges.panRange[1], t),
  };
}

function getLayoutCacheKey(viewportWidth: number, viewportHeight: number, progress: number) {
  return `${viewportWidth}:${viewportHeight}:${progress.toFixed(4)}`;
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

function prepareBlocks(article: FeaturedDemoConfig): PreparedBlock[] {
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

export function FeaturedDemoPage({ article }: FeaturedDemoPageProps) {
  const sceneLayerRef = useRef<HTMLDivElement | null>(null);
  const copyLayerRef = useRef<HTMLDivElement | null>(null);
  const scrubFillRef = useRef<HTMLDivElement | null>(null);
  const statusChipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sceneLayer = sceneLayerRef.current;
    const copyLayer = copyLayerRef.current;
    const scrubFill = scrubFillRef.current;
    const statusChip = statusChipRef.current;

    if (!sceneLayer || !copyLayer || !scrubFill || !statusChip) return;
    const sceneRoot = sceneLayer;
    const copyRoot = copyLayer;
    const scrubRoot = scrubFill;
    const statusRoot = statusChip;
    const preparedBlocks = prepareBlocks(article);

    const linePool: HTMLDivElement[] = [];
    const visibleRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const maskCanvas = document.createElement("canvas");
    const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
    const maskRenderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    const maskOverrideMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const scene = new THREE.Scene();
    const maskScene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    const maskCamera = camera.clone();
    const clock = new THREE.Clock();
    const pointer: PointerState = {
      dragging: false,
      progress: 0.5,
      target: 0.5,
      startX: 0,
      startProgress: 0.5,
    };

    let modelRoot: THREE.Group | null = null;
    let maskRoot: THREE.Group | null = null;
    let fitState: { target: THREE.Vector3; baseDistance: number } | null = null;
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let lastLayoutKey = "";
    let rafId = 0;
    let disposed = false;

    if (maskContext === null) {
      statusRoot.textContent = "Mask init failed";
      return;
    }
    const maskContext2d = maskContext;

    function syncLinePool(count: number) {
      while (linePool.length < count) {
        const node = document.createElement("div");
        node.className = "pretext-copy-line";
        copyRoot.appendChild(node);
        linePool.push(node);
      }

      while (linePool.length > count) {
        const node = linePool.pop();
        node?.remove();
      }
    }

    function normalizeModel(root: THREE.Group) {
      root.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 0.001);
      const scale = 7.8 / maxDim;

      root.scale.setScalar(scale);
      root.updateWorldMatrix(true, true);

      const scaledBox = new THREE.Box3().setFromObject(root);
      const scaledSize = scaledBox.getSize(new THREE.Vector3());
      const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

      root.position.sub(scaledCenter);
      root.position.y -= scaledSize.y * 0.52;

      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;

        child.castShadow = false;
        child.receiveShadow = false;

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (!material) return;
          material.side = THREE.DoubleSide;
        });
      });
    }

    function computeFitState(root: THREE.Group, activeCamera: THREE.PerspectiveCamera, width: number, height: number) {
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const halfFov = THREE.MathUtils.degToRad(activeCamera.fov * 0.5);
      const fitHeightDistance = (size.y * 0.64) / Math.tan(halfFov);
      const fitWidthDistance = (size.x * 0.56) / (Math.tan(halfFov) * (width / height));
      const baseDistance = Math.max(fitHeightDistance, fitWidthDistance, 5.8);

      return {
        target: center.clone().setY(center.y + size.y * 0.08 + FRAME_Y_OFFSET),
        baseDistance,
      };
    }

    function handleResize() {
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
      maskCamera.copy(camera);
      visibleRenderer.setSize(viewportWidth, viewportHeight);
      fitState = modelRoot ? computeFitState(modelRoot, camera, viewportWidth, viewportHeight) : fitState;
      lastLayoutKey = "";
    }

    function handlePointerDown(event: PointerEvent) {
      pointer.dragging = true;
      pointer.startX = event.clientX;
      pointer.startProgress = pointer.target;
    }

    function handlePointerMove(event: PointerEvent) {
      if (!pointer.dragging) return;
      const dx = (event.clientX - pointer.startX) / viewportWidth;
      pointer.target = clamp(pointer.startProgress + dx, 0, 1);
    }

    function handlePointerUp() {
      pointer.dragging = false;
    }

    function placeFlowLine(
      lineSpec: LeadLineSpec,
      region: Region,
      mask: ImageData,
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

    function layoutBlock(block: PreparedBlock, region: Region, mask: ImageData) {
      const lines: LinePlacement[] = [];
      let y = region.y + block.headerOffset;

      for (const leadLine of block.leadLines) {
        const placed = placeFlowLine(leadLine, region, mask, y, BODY_LINE_HEIGHT, {
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

    function renderMask() {
      maskRenderer.render(maskScene, maskCamera);
      maskContext2d.clearRect(0, 0, MASK_SIZE.width, MASK_SIZE.height);
      maskContext2d.drawImage(maskRenderer.domElement, 0, 0, MASK_SIZE.width, MASK_SIZE.height);
      return maskContext2d.getImageData(0, 0, MASK_SIZE.width, MASK_SIZE.height);
    }

    function layoutCopy(mask: ImageData) {
      const regions = getRegions(viewportWidth, viewportHeight);
      const layoutKey = getLayoutCacheKey(viewportWidth, viewportHeight, pointer.progress);
      if (layoutKey === lastLayoutKey) return;
      lastLayoutKey = layoutKey;

      const lines: LinePlacement[] = [];
      for (const block of preparedBlocks) {
        const region = regions.find((entry) => entry.id === block.id);
        if (!region) continue;
        lines.push(...layoutBlock(block, region, mask));
      }

      syncLinePool(lines.length);

      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const node = linePool[index];
        node.textContent = line.text;
        node.style.left = `${line.x}px`;
        node.style.top = `${line.y}px`;
        node.style.wordSpacing = line.wordSpacing;
        node.style.width = `${Math.max(line.slotWidth, line.width)}px`;
        node.style.textAlign = line.align;
        node.style.fontFamily = line.fontFamily;
        node.style.fontSize = line.fontSize;
        node.style.lineHeight = line.lineHeight;
        node.style.letterSpacing = line.letterSpacing;
        node.style.fontWeight = line.fontWeight;
        node.style.textTransform = line.textTransform;
      }
    }

    function updatePose(progress: number) {
      if (!fitState) return;

      const pose = getScrubPose(progress, SCRUB_RANGES);
      const target = fitState.target.clone();
      target.x += pose.panX;

      const distance = fitState.baseDistance * pose.distance;
      const cosPitch = Math.cos(pose.pitch);
      const position = new THREE.Vector3(
        Math.sin(pose.yaw) * distance * cosPitch,
        Math.sin(pose.pitch) * distance + target.y,
        Math.cos(pose.yaw) * distance * cosPitch
      );

      camera.position.copy(position);
      camera.lookAt(target);
      maskCamera.position.copy(camera.position);
      maskCamera.quaternion.copy(camera.quaternion);
    }

    function renderScene() {
      visibleRenderer.render(scene, camera);
    }

    function tick() {
      rafId = window.requestAnimationFrame(tick);
      if (modelRoot === null || maskRoot === null || fitState === null) return;

      const dt = clock.getDelta();
      const idleTarget = 0.5 + Math.sin(performance.now() * 0.0002) * 0.05;
      if (!pointer.dragging) {
        pointer.target = idleTarget;
      }
      pointer.progress += (pointer.target - pointer.progress) * clamp(dt * 5.0, 0.02, 0.1);

      scrubRoot.style.width = "100%";
      scrubRoot.style.transform = `scaleX(${clamp(pointer.progress, 0, 1)})`;

      updatePose(pointer.progress);
      renderScene();
      layoutCopy(renderMask());
    }

    async function loadModel() {
      try {
        statusRoot.textContent = "Loading model…";
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(article.modelSrc);
        if (disposed) return;

        modelRoot = gltf.scene;
        normalizeModel(modelRoot);
        scene.add(modelRoot);

        maskRoot = modelRoot.clone(true);
        maskScene.add(maskRoot);

        fitState = computeFitState(modelRoot, camera, viewportWidth, viewportHeight);
        statusRoot.textContent = "Drag horizontally";
      } catch (error) {
        statusRoot.textContent = "Model load failed";
        console.error(error);
      }
    }

    visibleRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    visibleRenderer.setSize(viewportWidth, viewportHeight);
    visibleRenderer.outputColorSpace = THREE.SRGBColorSpace;
    sceneRoot.appendChild(visibleRenderer.domElement);

    maskRenderer.setSize(MASK_SIZE.width, MASK_SIZE.height, false);
    maskRenderer.setClearColor(0x000000, 1);
    maskRenderer.toneMapping = THREE.NoToneMapping;
    maskRenderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    maskCanvas.width = MASK_SIZE.width;
    maskCanvas.height = MASK_SIZE.height;

    scene.background = new THREE.Color(0x000000);
    maskScene.background = new THREE.Color(0x000000);
    maskScene.overrideMaterial = maskOverrideMaterial;

    const hemi = new THREE.HemisphereLight(0xf3e9d3, 0x120f0a, 1.9);
    const key = new THREE.DirectionalLight(0xfff6de, 2.8);
    key.position.set(8, 10, 12);
    const rim = new THREE.DirectionalLight(0x8c6d42, 1.15);
    rim.position.set(-10, 4, -8);
    scene.add(hemi, key, rim);

    camera.position.set(0, 1.3, 10);
    camera.lookAt(0, 1.2, 0);
    handleResize();

    void loadModel();
    window.addEventListener("resize", handleResize);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerUp);
    rafId = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);
      syncLinePool(0);
      visibleRenderer.dispose();
      maskRenderer.dispose();
      maskOverrideMaterial.dispose();
      scene.clear();
      maskScene.clear();
      visibleRenderer.domElement.remove();
    };
  }, [article]);

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
