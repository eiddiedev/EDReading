"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { ContourSampler } from "@/components/featured/ContourSampler";
import { FEATURED_MODEL_SRCS } from "@/lib/featured/demo-content";
import type { ContourFrame, FeaturedCameraPreset } from "@/types";

interface FeaturedSceneCanvasProps {
  accentColor: string;
  cameraPreset: FeaturedCameraPreset;
  enableSampling: boolean;
  modelSrc: string;
  sampleScale: number;
  textBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rowHeight: number;
  resetVersion: number;
  showModel: boolean;
  onContourFrame: (frame: ContourFrame) => void;
}

class SceneErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode; sceneKey: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode; sceneKey: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: { sceneKey: string }) {
    if (previousProps.sceneKey !== this.props.sceneKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function DemoModel({ modelSrc, accentColor }: { modelSrc: string; accentColor: string }) {
  const gltf = useGLTF(modelSrc);
  const { camera, size: canvasSize } = useThree();
  const tint = useMemo(() => new THREE.Color(accentColor), [accentColor]);
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const modelSize = box.getSize(new THREE.Vector3());
    const perspectiveCamera =
      camera instanceof THREE.PerspectiveCamera ? camera : new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    const distance = perspectiveCamera.position.length();
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(perspectiveCamera.fov / 2)) * distance;
    const visibleWidth = visibleHeight * (canvasSize.width / Math.max(canvasSize.height, 1));
    const fitHeight = (visibleHeight * 0.72) / Math.max(modelSize.y, 1);
    const fitWidth = (visibleWidth * 0.42) / Math.max(modelSize.x, 1);
    const fitDepth = 3.2 / Math.max(modelSize.z, 1);
    const scale = Math.min(fitHeight, fitWidth, fitDepth);

    clone.position.set(-center.x, -center.y, -center.z);
    clone.scale.setScalar(scale);

    return clone;
  }, [camera, canvasSize.height, canvasSize.width, gltf.scene]);

  useMemo(() => {
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.forEach((entry) => {
        if (!(entry instanceof THREE.MeshStandardMaterial)) return;
        entry.roughness = Math.min(entry.roughness ?? 0.72, 0.82);
        entry.metalness = Math.max(entry.metalness ?? 0.12, 0.08);
        entry.emissive = tint.clone().multiplyScalar(0.18);
      });
    });
  }, [scene, tint]);

  return (
    <group position={[0, 0.12, 0]}>
      <primitive object={scene} />
    </group>
  );
}

function CameraReset({
  cameraPreset,
  resetVersion,
}: {
  cameraPreset: FeaturedCameraPreset;
  resetVersion: number;
}) {
  const { camera, invalidate } = useThree();

  useEffect(() => {
    camera.position.set(...cameraPreset.initialPosition);
    camera.lookAt(...cameraPreset.target);
    invalidate();
  }, [camera, cameraPreset, invalidate, resetVersion]);

  return null;
}

function SceneContents({
  accentColor,
  cameraPreset,
  enableSampling,
  modelSrc,
  onContourFrame,
  rowHeight,
  resetVersion,
  sampleScale,
  showModel,
  textBox,
}: FeaturedSceneCanvasProps) {
  const [isInteracting, setIsInteracting] = useState(false);

  return (
    <>
      <CameraReset cameraPreset={cameraPreset} resetVersion={resetVersion} />
      <ambientLight intensity={1.05} />
      <directionalLight
        intensity={1.7}
        position={[5, 8, 6]}
      />
      <spotLight
        color={accentColor}
        intensity={16}
        angle={0.32}
        penumbra={0.8}
        position={[-3, 4, 3]}
      />
      {showModel ? (
        <Suspense fallback={null}>
          <DemoModel accentColor={accentColor} modelSrc={modelSrc} />
        </Suspense>
      ) : null}
      <OrbitControls
        key={resetVersion}
        dampingFactor={0.08}
        enablePan={false}
        enableZoom
        enableDamping
        makeDefault
        onStart={() => setIsInteracting(true)}
        onEnd={() => setIsInteracting(false)}
        minDistance={cameraPreset.minDistance}
        maxDistance={cameraPreset.maxDistance}
        minPolarAngle={cameraPreset.minPolarAngle}
        maxPolarAngle={cameraPreset.maxPolarAngle}
        minAzimuthAngle={cameraPreset.minAzimuthAngle}
        maxAzimuthAngle={cameraPreset.maxAzimuthAngle}
        target={cameraPreset.target}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_ROTATE,
        }}
      />
      <ContourSampler
        enabled={enableSampling && showModel}
        onFrame={onContourFrame}
        rowHeight={rowHeight}
        sampleIntervalMs={isInteracting ? 320 : 140}
        sampleScale={isInteracting ? Math.max(0.18, sampleScale * 0.58) : sampleScale}
        textBox={textBox}
      />
    </>
  );
}

function CanvasFallback({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-[2rem] border border-slate-200/80 bg-slate-950/90 px-6 text-center text-sm text-slate-300 shadow-2xl dark:border-slate-800">
      {message}
    </div>
  );
}

function isWebGLAvailable() {
  if (typeof document === "undefined") return false;

  const canvas = document.createElement("canvas");
  return Boolean(
    canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
  );
}

export function FeaturedSceneCanvas(props: FeaturedSceneCanvasProps) {
  const [webglAvailable, setWebglAvailable] = useState(true);

  useEffect(() => {
    setWebglAvailable(isWebGLAvailable());
  }, []);

  if (!webglAvailable) {
    return <CanvasFallback message="当前设备不支持 WebGL，已保留文字排版演示。" />;
  }

  return (
    <SceneErrorBoundary
      fallback={<CanvasFallback message="3D 模型加载失败，文字演示仍可继续阅读。" />}
      sceneKey={`${props.modelSrc}-${props.showModel}`}
    >
      <Canvas
        camera={{
          fov: 36,
          near: 0.1,
          far: 100,
          position: props.cameraPreset.initialPosition,
        }}
        className="absolute inset-0 h-full w-full touch-none"
        dpr={[1, 1.2]}
        frameloop="demand"
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
      >
        <SceneContents {...props} />
      </Canvas>
    </SceneErrorBoundary>
  );
}

FEATURED_MODEL_SRCS.forEach((modelSrc) => {
  useGLTF.preload(modelSrc);
});
