"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Center, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { ContourSampler } from "@/components/featured/ContourSampler";
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
  onContourFrame: (frame: ContourFrame) => void;
}

class SceneErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
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
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const tint = useMemo(() => new THREE.Color(accentColor), [accentColor]);

  useMemo(() => {
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.castShadow = true;
      child.receiveShadow = true;

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
    <group position={[0, 0.08, 0]}>
      <Center disableY>
        <primitive object={scene} scale={1.85} />
      </Center>
    </group>
  );
}

function SceneContents({
  accentColor,
  cameraPreset,
  enableSampling,
  modelSrc,
  onContourFrame,
  rowHeight,
  sampleScale,
  textBox,
}: FeaturedSceneCanvasProps) {
  return (
    <>
      <ambientLight intensity={1.15} />
      <directionalLight
        castShadow
        intensity={2.3}
        position={[5, 8, 6]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <spotLight
        color={accentColor}
        intensity={24}
        angle={0.32}
        penumbra={0.8}
        position={[-3, 4, 3]}
      />
      <Suspense fallback={null}>
        <DemoModel accentColor={accentColor} modelSrc={modelSrc} />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom
        makeDefault
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
        enabled={enableSampling}
        onFrame={onContourFrame}
        rowHeight={rowHeight}
        sampleScale={sampleScale}
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
    <SceneErrorBoundary fallback={<CanvasFallback message="3D 模型加载失败，文字演示仍可继续阅读。" />}>
      <Canvas
        camera={{
          fov: 32,
          near: 0.1,
          far: 100,
          position: props.cameraPreset.initialPosition,
        }}
        className="absolute inset-0 h-full w-full touch-none"
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        shadows
      >
        <SceneContents {...props} />
      </Canvas>
    </SceneErrorBoundary>
  );
}

useGLTF.preload("/models/shuilanlan.glb");
