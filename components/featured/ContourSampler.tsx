"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ContourFrame, RowSpan } from "@/types";

interface ContourSamplerProps {
  enabled: boolean;
  rowHeight: number;
  textBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  sampleScale: number;
  sampleIntervalMs?: number;
  onFrame: (frame: ContourFrame) => void;
}

const MIN_FRAGMENT_WIDTH = 84;
const SILHOUETTE_PADDING = 18;
const SAMPLE_INTERVAL_MS = 140;
const MASK_THRESHOLD = 24;

function hashRowSpans(rowSpans: RowSpan[]): number {
  let hash = 17;

  for (const row of rowSpans) {
    hash = (hash * 31 + Math.round(row.leftWidth)) | 0;
    hash = (hash * 31 + Math.round(row.rightWidth)) | 0;
    hash = (hash * 31 + Math.round(row.rightStart)) | 0;
    hash = (hash * 31 + (row.isSplitRow ? 1 : 0)) | 0;
  }

  return hash;
}

export function ContourSampler({
  enabled,
  rowHeight,
  textBox,
  sampleScale,
  sampleIntervalMs = SAMPLE_INTERVAL_MS,
  onFrame,
}: ContourSamplerProps) {
  const { gl, size, scene, camera } = useThree();
  const renderTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const pixelBufferRef = useRef<Uint8Array | null>(null);
  const lastHashRef = useRef<number | null>(null);
  const lastSampleAtRef = useRef(0);

  const maskMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    []
  );

  useEffect(() => {
    return () => {
      maskMaterial.dispose();
      renderTargetRef.current?.dispose();
    };
  }, [maskMaterial]);

  useFrame((state) => {
    if (!enabled || textBox.width <= 0 || textBox.height <= 0) return;

    const now = state.clock.elapsedTime * 1000;
    if (now - lastSampleAtRef.current < sampleIntervalMs) return;
    lastSampleAtRef.current = now;

    const targetWidth = Math.max(64, Math.floor(size.width * sampleScale));
    const targetHeight = Math.max(64, Math.floor(size.height * sampleScale));

    if (
      !renderTargetRef.current ||
      renderTargetRef.current.width !== targetWidth ||
      renderTargetRef.current.height !== targetHeight
    ) {
      renderTargetRef.current?.dispose();
      renderTargetRef.current = new THREE.WebGLRenderTarget(targetWidth, targetHeight, {
        depthBuffer: true,
        stencilBuffer: false,
      });
    }

    const renderTarget = renderTargetRef.current;
    if (!renderTarget) return;

    const scaledX = Math.max(0, Math.floor(textBox.x * sampleScale));
    const scaledWidth = Math.max(
      1,
      Math.min(targetWidth - scaledX, Math.floor(textBox.width * sampleScale))
    );
    const scaledHeight = Math.max(
      1,
      Math.min(targetHeight, Math.floor(textBox.height * sampleScale))
    );
    const scaledTop = Math.max(0, Math.floor(textBox.y * sampleScale));
    const scaledReadY = Math.max(0, targetHeight - scaledTop - scaledHeight);

    const pixelCount = scaledWidth * scaledHeight * 4;
    if (!pixelBufferRef.current || pixelBufferRef.current.length !== pixelCount) {
      pixelBufferRef.current = new Uint8Array(pixelCount);
    }

    const pixels = pixelBufferRef.current;
    if (!pixels) return;

    const previousTarget = gl.getRenderTarget();
    const previousOverride = scene.overrideMaterial;
    const previousAutoClear = gl.autoClear;
    const previousClearColor = new THREE.Color();
    gl.getClearColor(previousClearColor);
    const previousClearAlpha = gl.getClearAlpha();

    scene.overrideMaterial = maskMaterial;
    gl.autoClear = true;
    gl.setRenderTarget(renderTarget);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    gl.render(scene, camera);
    gl.readRenderTargetPixels(
      renderTarget,
      scaledX,
      scaledReadY,
      scaledWidth,
      scaledHeight,
      pixels
    );

    scene.overrideMaterial = previousOverride;
    gl.autoClear = previousAutoClear;
    gl.setRenderTarget(previousTarget);
    gl.setClearColor(previousClearColor, previousClearAlpha);

    const step = Math.max(1, Math.round(rowHeight * sampleScale));
    const rowSpans: RowSpan[] = [];
    const widthInCssPixels = scaledWidth / sampleScale;

    for (let y = 0, rowIndex = 0; y < scaledHeight; y += step, rowIndex += 1) {
      const bandEnd = Math.min(scaledHeight, y + step);
      let minX = scaledWidth;
      let maxX = -1;

      for (let row = y; row < bandEnd; row += 1) {
        const rowOffset = row * scaledWidth * 4;
        for (let x = 0; x < scaledWidth; x += 1) {
          const red = pixels[rowOffset + x * 4];
          const green = pixels[rowOffset + x * 4 + 1];
          const blue = pixels[rowOffset + x * 4 + 2];
          const brightness = Math.max(red, green, blue);

          if (brightness > MASK_THRESHOLD) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
          }
        }
      }

      if (maxX === -1) {
        rowSpans.push({
          y: rowIndex * rowHeight,
          leftStart: 0,
          leftWidth: widthInCssPixels,
          rightStart: 0,
          rightWidth: 0,
          isSplitRow: false,
        });
        continue;
      }

      const silhouetteLeft = Math.max(0, minX / sampleScale - SILHOUETTE_PADDING);
      const silhouetteRight = Math.min(
        widthInCssPixels,
        maxX / sampleScale + SILHOUETTE_PADDING
      );
      const leftWidth = Math.max(0, silhouetteLeft);
      const rightStart = silhouetteRight;
      const rightWidth = Math.max(0, widthInCssPixels - silhouetteRight);
      const isSplitRow =
        leftWidth >= MIN_FRAGMENT_WIDTH && rightWidth >= MIN_FRAGMENT_WIDTH;

      rowSpans.push({
        y: rowIndex * rowHeight,
        leftStart: 0,
        leftWidth,
        rightStart,
        rightWidth,
        isSplitRow,
      });
    }

    const hash = hashRowSpans(rowSpans);
    if (lastHashRef.current === hash) return;

    lastHashRef.current = hash;
    onFrame({
      rowSpans,
      sampleScale,
      hasSilhouette: rowSpans.some((row) => row.isSplitRow),
      hash,
    });
  });

  return null;
}
