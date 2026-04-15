import type { FeaturedDemoConfig } from "@/types";

export const FEATURED_DEMO_ARTICLES: FeaturedDemoConfig[] = [
  {
    id: "water-blue-demo",
    title: "The Shape of Attention",
    titleZh: "注意力的形状",
    body: `We rarely notice the geometry of attention until something interrupts the flatness of a page. A model turning in the center of the scene changes the path the eye wants to travel, and the text begins to behave less like a block and more like a current flowing around an object.

In reading, this matters more than decoration. When words respond to form, the page starts to feel alive. The body of the article no longer ignores the image beside it, and the image is no longer a poster pasted behind the story. They become part of the same composition, each changing the pressure and rhythm of the other.

This demo treats typography as a responsive surface. Every time the camera moves, the silhouette of the model shifts. The text then recalculates itself row by row, making room where the object occupies space and rejoining where the space opens again. The result is not simply wrapped text. It is a reading field continuously negotiated between language, motion, and volume.

That negotiation is useful for an application like EDReading. The project is already about careful reading, pacing, and visual focus. A featured-article surface can take those same goals and express them more physically: the learner does not only read around emphasis, but around presence.

The central model in this first draft is deliberately treated as a live obstacle rather than a background ornament. Dragging with the left mouse button changes the viewing angle. Scrolling brings the camera closer or further away. On touch devices, a single finger rotates the view and a two-finger gesture zooms the scene. In every case, the words reshape themselves according to the actual contour produced in that moment.

Later, new articles and models can be added without changing the rendering pipeline. The article text can remain authored content. The model can remain your own asset. What matters is that both are allowed to meet in real time, so the layout feels composed instead of merely arranged.

When this works well, the page creates a slightly unusual kind of calm. The text still remains readable, but its edges acknowledge that something meaningful occupies the center. The model gains gravity, and the article gains a visual tempo. That is the purpose of this demo: not to prove that 3D is possible, but to prove that motion, shape, and reading can share the same surface without collapsing into noise.`,
    modelSrc: "/models/shuilanlan.glb",
    theme: {
      accent: "#3b82f6",
      glow: "rgba(59, 130, 246, 0.24)",
    },
    cameraPreset: {
      initialPosition: [0, 0.22, 5.8],
      target: [0, 0.18, 0],
      minDistance: 3.8,
      maxDistance: 8.2,
      minPolarAngle: 0.95,
      maxPolarAngle: 2.15,
      minAzimuthAngle: -0.95,
      maxAzimuthAngle: 0.95,
    },
  },
];
