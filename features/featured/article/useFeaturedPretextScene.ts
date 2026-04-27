"use client";

import { useEffect, type RefObject } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { FeaturedDemoConfig } from "@/features/featured/types";
import {
  MASK_SIZE,
  clamp,
  disposeModel,
  getLayoutCacheKey,
  getLinePlacements,
  getRendererPixelRatio,
  prepareBlocks,
} from "@/features/featured/article/pretext-engine";

const FRAME_Y_OFFSET = 0;
const DRAG_LAYOUT_INTERVAL_MS = 64;
const IDLE_LAYOUT_INTERVAL_MS = 140;
const DRAG_LAYOUT_PROGRESS_DELTA = 0.004;
const IDLE_LAYOUT_PROGRESS_DELTA = 0.01;
const INITIAL_VIEW = {
  yaw: 0,
  pitch: 0.08,
  zoom: 1,
};
const VIEW_BOUNDS = {
  yaw: [-0.62, 0.62] as const,
  pitch: [-0.03, 0.18] as const,
  zoom: [0.92, 1.48] as const,
};
const DRAG_SENSITIVITY = {
  yaw: 2.35,
  pitch: 1.35,
};
const WHEEL_ZOOM_SENSITIVITY = 0.0011;
const IDLE_MOTION = {
  yaw: 0.035,
  pitch: 0.012,
  zoom: 0.018,
  modelYaw: 0.032,
  modelLift: 0.035,
};

interface UseFeaturedPretextSceneArgs {
  article: FeaturedDemoConfig;
  copyLayerRef: RefObject<HTMLDivElement | null>;
  sceneLayerRef: RefObject<HTMLDivElement | null>;
  scrubFillRef: RefObject<HTMLDivElement | null>;
  statusChipRef: RefObject<HTMLDivElement | null>;
}

interface OrbitState {
  dragging: boolean;
  yaw: number;
  pitch: number;
  zoom: number;
  targetYaw: number;
  targetPitch: number;
  targetZoom: number;
  startX: number;
  startY: number;
  startYaw: number;
  startPitch: number;
  activePointerId: number | null;
}

export function useFeaturedPretextScene({
  article,
  copyLayerRef,
  sceneLayerRef,
  scrubFillRef,
  statusChipRef,
}: UseFeaturedPretextSceneArgs) {
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
    const visibleRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    const maskCanvas = document.createElement("canvas");
    const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
    const maskRenderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    const maskOverrideMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    const maskCamera = camera.clone();
    const clock = new THREE.Clock();
    const orbit: OrbitState = {
      dragging: false,
      yaw: INITIAL_VIEW.yaw,
      pitch: INITIAL_VIEW.pitch,
      zoom: INITIAL_VIEW.zoom,
      targetYaw: INITIAL_VIEW.yaw,
      targetPitch: INITIAL_VIEW.pitch,
      targetZoom: INITIAL_VIEW.zoom,
      startX: 0,
      startY: 0,
      startYaw: INITIAL_VIEW.yaw,
      startPitch: INITIAL_VIEW.pitch,
      activePointerId: null,
    };

    let modelRoot: THREE.Group | null = null;
    let modelHomePosition = new THREE.Vector3();
    const modelScaleMultiplier = article.sceneTuning?.scale ?? 1;
    const baseModelYaw = article.sceneTuning?.modelYaw ?? 0;
    let fitState: { target: THREE.Vector3; baseDistance: number } | null = null;
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let lastLayoutKey = "";
    let lastLayoutAt = -Infinity;
    let lastLaidOutProgress: number | null = null;
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
      const scale = (7.8 / maxDim) * modelScaleMultiplier;

      root.scale.setScalar(scale);
      root.updateWorldMatrix(true, true);

      const scaledBox = new THREE.Box3().setFromObject(root);
      const scaledSize = scaledBox.getSize(new THREE.Vector3());
      const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

      root.position.sub(scaledCenter);
      root.position.y -= scaledSize.y * 0.04;

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
      const fitHeightDistance = (size.y * 0.82) / Math.tan(halfFov);
      const fitWidthDistance = (size.x * 0.72) / (Math.tan(halfFov) * (width / height));
      const baseDistance = Math.max(fitHeightDistance, fitWidthDistance, 7.2);

      return {
        target: center.clone().setY(center.y + size.y * 0.02 + FRAME_Y_OFFSET),
        baseDistance,
      };
    }

    function handleResize() {
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
      maskCamera.copy(camera);
      visibleRenderer.setPixelRatio(getRendererPixelRatio(viewportWidth));
      visibleRenderer.setSize(viewportWidth, viewportHeight);
      fitState = modelRoot ? computeFitState(modelRoot, camera, viewportWidth, viewportHeight) : fitState;
      lastLayoutKey = "";
      lastLayoutAt = -Infinity;
      lastLaidOutProgress = null;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.button !== 0) return;

      orbit.dragging = true;
      orbit.activePointerId = event.pointerId;
      orbit.startX = event.clientX;
      orbit.startY = event.clientY;
      orbit.startYaw = orbit.targetYaw;
      orbit.startPitch = orbit.targetPitch;
      sceneRoot.parentElement?.classList.add("is-dragging");
      sceneRoot.setPointerCapture(event.pointerId);
      event.preventDefault();
    }

    function handlePointerMove(event: PointerEvent) {
      if (!orbit.dragging || orbit.activePointerId !== event.pointerId) return;

      const dx = (event.clientX - orbit.startX) / Math.max(viewportWidth, 1);
      const dy = (event.clientY - orbit.startY) / Math.max(viewportHeight, 1);

      orbit.targetYaw = clamp(
        orbit.startYaw + dx * DRAG_SENSITIVITY.yaw,
        VIEW_BOUNDS.yaw[0],
        VIEW_BOUNDS.yaw[1]
      );
      orbit.targetPitch = clamp(
        orbit.startPitch - dy * DRAG_SENSITIVITY.pitch,
        VIEW_BOUNDS.pitch[0],
        VIEW_BOUNDS.pitch[1]
      );
      event.preventDefault();
    }

    function handlePointerUp(event: PointerEvent) {
      if (orbit.activePointerId !== event.pointerId) return;

      orbit.dragging = false;
      orbit.activePointerId = null;
      sceneRoot.parentElement?.classList.remove("is-dragging");
      if (sceneRoot.hasPointerCapture(event.pointerId)) {
        sceneRoot.releasePointerCapture(event.pointerId);
      }
    }

    function handleWheel(event: WheelEvent) {
      orbit.targetZoom = clamp(
        orbit.targetZoom + event.deltaY * WHEEL_ZOOM_SENSITIVITY,
        VIEW_BOUNDS.zoom[0],
        VIEW_BOUNDS.zoom[1]
      );
      event.preventDefault();
    }

    function renderMask() {
      const previousOverrideMaterial = scene.overrideMaterial;

      scene.overrideMaterial = maskOverrideMaterial;
      maskRenderer.render(scene, maskCamera);
      scene.overrideMaterial = previousOverrideMaterial;
      maskContext2d.clearRect(0, 0, MASK_SIZE.width, MASK_SIZE.height);
      maskContext2d.drawImage(maskRenderer.domElement, 0, 0, MASK_SIZE.width, MASK_SIZE.height);
      return maskContext2d.getImageData(0, 0, MASK_SIZE.width, MASK_SIZE.height);
    }

    function getViewProgress() {
      return clamp(
        (orbit.yaw - VIEW_BOUNDS.yaw[0]) / (VIEW_BOUNDS.yaw[1] - VIEW_BOUNDS.yaw[0]),
        0,
        1
      );
    }

    function getLayoutSignal() {
      const yaw = (orbit.yaw - VIEW_BOUNDS.yaw[0]) / (VIEW_BOUNDS.yaw[1] - VIEW_BOUNDS.yaw[0]);
      const pitch = (orbit.pitch - VIEW_BOUNDS.pitch[0]) / (VIEW_BOUNDS.pitch[1] - VIEW_BOUNDS.pitch[0]);
      const zoom = (orbit.zoom - VIEW_BOUNDS.zoom[0]) / (VIEW_BOUNDS.zoom[1] - VIEW_BOUNDS.zoom[0]);

      return yaw * 0.5 + pitch * 0.25 + zoom * 0.25;
    }

    function getLayoutPoseKey() {
      return `${orbit.yaw.toFixed(3)}:${orbit.pitch.toFixed(3)}:${orbit.zoom.toFixed(3)}`;
    }

    function shouldRefreshLayout(layoutSignal: number) {
      const now = performance.now();
      const interval = orbit.dragging ? DRAG_LAYOUT_INTERVAL_MS : IDLE_LAYOUT_INTERVAL_MS;
      const deltaThreshold = orbit.dragging
        ? DRAG_LAYOUT_PROGRESS_DELTA
        : IDLE_LAYOUT_PROGRESS_DELTA;

      if (now - lastLayoutAt < interval) return false;

      if (lastLaidOutProgress === null) {
        lastLayoutAt = now;
        lastLaidOutProgress = layoutSignal;
        return true;
      }

      if (Math.abs(layoutSignal - lastLaidOutProgress) < deltaThreshold) return false;

      lastLayoutAt = now;
      lastLaidOutProgress = layoutSignal;
      return true;
    }

    function layoutCopy(mask: ImageData, poseKey: string) {
      const layoutKey = getLayoutCacheKey(viewportWidth, viewportHeight, poseKey);
      if (layoutKey === lastLayoutKey) return;
      lastLayoutKey = layoutKey;

      const { mainLines } = getLinePlacements(preparedBlocks, mask, viewportWidth, viewportHeight);
      syncLinePool(mainLines.length);

      for (let index = 0; index < mainLines.length; index += 1) {
        const line = mainLines[index];
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

    function updatePose(elapsed: number) {
      if (!fitState) return;

      const idleWeight = orbit.dragging ? 0.18 : 1;
      const yaw =
        orbit.yaw + Math.sin(elapsed * 0.48) * IDLE_MOTION.yaw * idleWeight;
      const pitch = clamp(
        orbit.pitch + Math.sin(elapsed * 0.42 + 0.7) * IDLE_MOTION.pitch * idleWeight,
        VIEW_BOUNDS.pitch[0],
        VIEW_BOUNDS.pitch[1]
      );
      const zoom = clamp(
        orbit.zoom + Math.sin(elapsed * 0.34 + 1.1) * IDLE_MOTION.zoom * idleWeight,
        VIEW_BOUNDS.zoom[0],
        VIEW_BOUNDS.zoom[1]
      );
      const target = fitState.target.clone();

      const distance = fitState.baseDistance * zoom;
      const cosPitch = Math.cos(pitch);
      const position = new THREE.Vector3(
        Math.sin(yaw) * distance * cosPitch,
        Math.sin(pitch) * distance + target.y,
        Math.cos(yaw) * distance * cosPitch
      );

      if (modelRoot) {
        modelRoot.rotation.y =
          baseModelYaw + Math.sin(elapsed * 0.56) * IDLE_MOTION.modelYaw * idleWeight;
        modelRoot.position.y =
          modelHomePosition.y + Math.sin(elapsed * 0.68 + 0.4) * IDLE_MOTION.modelLift * idleWeight;
      }

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
      if (modelRoot === null || fitState === null) return;

      const dt = clock.getDelta();
      const easing = clamp(dt * 8.0, 0.05, 0.16);

      orbit.yaw += (orbit.targetYaw - orbit.yaw) * easing;
      orbit.pitch += (orbit.targetPitch - orbit.pitch) * easing;
      orbit.zoom += (orbit.targetZoom - orbit.zoom) * easing;

      scrubRoot.style.width = "100%";
      scrubRoot.style.transform = `scaleX(${getViewProgress()})`;

      updatePose(clock.elapsedTime);
      renderScene();
      if (shouldRefreshLayout(getLayoutSignal())) {
        layoutCopy(renderMask(), getLayoutPoseKey());
      }
    }

    async function loadModel() {
      try {
        statusRoot.textContent = "Loading model…";
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(article.modelSrc);
        if (disposed) return;

        modelRoot = gltf.scene;
        normalizeModel(modelRoot);
        modelHomePosition = modelRoot.position.clone();
        scene.add(modelRoot);

        fitState = computeFitState(modelRoot, camera, viewportWidth, viewportHeight);
        lastLayoutAt = -Infinity;
        lastLaidOutProgress = null;
        statusRoot.textContent = "Drag to rotate · scroll to zoom";
      } catch (error) {
        statusRoot.textContent = "Model load failed";
        console.error(error);
      }
    }

    visibleRenderer.setPixelRatio(getRendererPixelRatio(viewportWidth));
    visibleRenderer.setSize(viewportWidth, viewportHeight);
    visibleRenderer.outputColorSpace = THREE.SRGBColorSpace;
    sceneRoot.appendChild(visibleRenderer.domElement);

    maskRenderer.setSize(MASK_SIZE.width, MASK_SIZE.height, false);
    maskRenderer.setClearColor(0x000000, 1);
    maskRenderer.toneMapping = THREE.NoToneMapping;
    maskRenderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    maskCanvas.width = MASK_SIZE.width;
    maskCanvas.height = MASK_SIZE.height;

    // Keep scene background transparent so CSS stars/nebula show through the canvas
    visibleRenderer.setClearColor(0x000000, 0);

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
    sceneRoot.addEventListener("pointerdown", handlePointerDown);
    sceneRoot.addEventListener("pointermove", handlePointerMove);
    sceneRoot.addEventListener("pointerup", handlePointerUp);
    sceneRoot.addEventListener("pointercancel", handlePointerUp);
    sceneRoot.addEventListener("wheel", handleWheel, { passive: false });
    rafId = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      sceneRoot.removeEventListener("pointerdown", handlePointerDown);
      sceneRoot.removeEventListener("pointermove", handlePointerMove);
      sceneRoot.removeEventListener("pointerup", handlePointerUp);
      sceneRoot.removeEventListener("pointercancel", handlePointerUp);
      sceneRoot.removeEventListener("wheel", handleWheel);
      sceneRoot.parentElement?.classList.remove("is-dragging");
      syncLinePool(0);
      disposeModel(modelRoot);
      visibleRenderer.dispose();
      maskRenderer.dispose();
      maskOverrideMaterial.dispose();
      scene.clear();
      visibleRenderer.domElement.remove();
    };
  }, [article, copyLayerRef, sceneLayerRef, scrubFillRef, statusChipRef]);
}
