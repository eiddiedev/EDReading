export interface FeaturedCameraPreset {
  initialPosition: [number, number, number];
  target: [number, number, number];
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  minAzimuthAngle: number;
  maxAzimuthAngle: number;
}

export interface FeaturedDemoConfig {
  id: string;
  slug: string;
  title: string;
  titleZh?: string;
  summary: string;
  topic: string;
  difficulty: string;
  estimatedMinutes: number;
  body: string;
  keyPoints: string[];
  vocabularyFocus: string[];
  questions: string[];
  modelSrc: string;
  theme: {
    accent: string;
    glow: string;
    surface: string;
  };
  cameraPreset: FeaturedCameraPreset;
}
