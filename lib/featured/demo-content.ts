import type { FeaturedDemoConfig } from "@/types";

export const FEATURED_DEMO_ARTICLES: FeaturedDemoConfig[] = [
  {
    id: "water-blue-demo",
    slug: "shape-of-attention",
    title: "The Shape of Attention",
    titleZh: "注意力的形状",
    summary: "A reading-surface experiment about how 3D presence can change pacing, focus, and visual rhythm.",
    topic: "Reading Design",
    difficulty: "B2",
    estimatedMinutes: 6,
    body: `We rarely notice the geometry of attention until something interrupts the flatness of a page. A model turning in the center of the scene changes the path the eye wants to travel, and the text begins to behave less like a block and more like a current flowing around an object.

In reading, this matters more than decoration. When words respond to form, the page starts to feel alive. The body of the article no longer ignores the image beside it, and the image is no longer a poster pasted behind the story. They become part of the same composition, each changing the pressure and rhythm of the other.

This demo treats typography as a responsive surface. Every time the camera moves, the silhouette of the model shifts. The text then recalculates itself row by row, making room where the object occupies space and rejoining where the space opens again. The result is not simply wrapped text. It is a reading field continuously negotiated between language, motion, and volume.

That negotiation is useful for an application like EDReading. The project is already about careful reading, pacing, and visual focus. A featured-article surface can take those same goals and express them more physically: the learner does not only read around emphasis, but around presence.

The central model in this first draft is deliberately treated as a live obstacle rather than a background ornament. Dragging with the left mouse button changes the viewing angle. Scrolling brings the camera closer or further away. On touch devices, a single finger rotates the view and a two-finger gesture zooms the scene. In every case, the words reshape themselves according to the actual contour produced in that moment.

Later, new articles and models can be added without changing the rendering pipeline. The article text can remain authored content. The model can remain your own asset. What matters is that both are allowed to meet in real time, so the layout feels composed instead of merely arranged.`,
    keyPoints: [
      "A moving 3D silhouette can become part of the reading layout, not just decoration.",
      "Typography feels more alive when it reacts to the object in front of it.",
      "The same pipeline can scale to many articles and models with config-only changes.",
    ],
    vocabularyFocus: ["geometry", "silhouette", "recalculate", "negotiated", "ornament"],
    questions: [
      "Why does the author think reactive typography matters more than decoration?",
      "How does the 3D model change the rhythm of reading?",
      "What product value does this interaction create for EDReading learners?",
    ],
    modelSrc: "/models/shuilanlan.glb",
    theme: {
      accent: "#3b82f6",
      glow: "rgba(59, 130, 246, 0.24)",
      surface: "from-sky-100 via-white to-cyan-50",
    },
    cameraPreset: {
      initialPosition: [0, -0.05, 6.3],
      target: [0, -0.08, 0],
      minDistance: 4.8,
      maxDistance: 9.2,
      minPolarAngle: 0.95,
      maxPolarAngle: 2.15,
      minAzimuthAngle: -0.95,
      maxAzimuthAngle: 0.95,
    },
  },
  {
    id: "urban-forest",
    slug: "cities-that-grow-greener",
    title: "Cities That Grow Greener",
    titleZh: "向绿色生长的城市",
    summary: "How compact urban planning, shaded streets, and small biodiversity projects reshape daily life.",
    topic: "Environment",
    difficulty: "B2",
    estimatedMinutes: 5,
    body: `For years, city greening was treated as a pleasant extra. Trees were planted where space happened to remain, and parks were celebrated as isolated gifts rather than connected systems. That approach is changing.

Urban planners now understand that greenery affects temperature, air quality, and even the way people move through neighbourhoods. A street lined with shade trees feels shorter. A pocket garden near a bus stop invites people to pause. A planted roof cools the building below while supporting insects that would otherwise disappear from the district.

The most effective projects are often modest. A city does not need a single giant park to feel healthier. It needs a network of smaller interventions that residents encounter every day. When green design becomes ordinary rather than exceptional, the benefits spread much further.`,
    keyPoints: [
      "City greenery works best as a connected system, not a decorative extra.",
      "Small-scale projects can improve comfort, biodiversity, and movement patterns.",
      "Ordinary daily contact with nature produces broader public value than isolated landmark projects.",
    ],
    vocabularyFocus: ["compact", "biodiversity", "district", "interventions", "residents"],
    questions: [
      "Why are small projects described as especially effective?",
      "How does greenery influence the way people experience a street?",
      "What is the difference between an isolated gift and a connected system?",
    ],
    modelSrc: "/models/shuilanlan.glb",
    theme: {
      accent: "#0f766e",
      glow: "rgba(15, 118, 110, 0.22)",
      surface: "from-emerald-100 via-white to-teal-50",
    },
    cameraPreset: {
      initialPosition: [0.1, 0.02, 6.1],
      target: [0, -0.05, 0],
      minDistance: 4.6,
      maxDistance: 8.8,
      minPolarAngle: 0.92,
      maxPolarAngle: 2.08,
      minAzimuthAngle: -1.1,
      maxAzimuthAngle: 1.1,
    },
  },
  {
    id: "sleep-lab",
    slug: "why-sleep-protects-memory",
    title: "Why Sleep Protects Memory",
    titleZh: "睡眠为何守护记忆",
    summary: "A concise explanation of how sleep consolidates learning instead of interrupting it.",
    topic: "Science",
    difficulty: "B2",
    estimatedMinutes: 5,
    body: `Students often imagine sleep as time lost. If they stay awake longer, they believe they can force more information into the mind. Research suggests the opposite. Sleep is not the enemy of learning but one of its most reliable partners.

During sleep, the brain appears to stabilise fragile traces formed during the day. Experiences that were recent and easily disrupted become more organised. Some are strengthened; others are quietly discarded. This sorting process helps the mind keep useful patterns without becoming overwhelmed by noise.

That is why revision spread across several days often outperforms a single exhausted session. Learning requires effort while we are awake, but it also requires recovery afterwards. Memory grows stronger when practice and rest work together.`,
    keyPoints: [
      "Sleep helps stabilise and organise newly formed memories.",
      "Useful information is strengthened while less important noise may be discarded.",
      "Spacing revision over time works better than one long, exhausted effort.",
    ],
    vocabularyFocus: ["consolidates", "fragile", "stabilise", "discarded", "revision"],
    questions: [
      "Why does the writer challenge the idea that sleep is time lost?",
      "What happens to recent experiences during sleep?",
      "How does the article connect rest with revision strategy?",
    ],
    modelSrc: "/models/shuilanlan.glb",
    theme: {
      accent: "#4338ca",
      glow: "rgba(67, 56, 202, 0.22)",
      surface: "from-indigo-100 via-white to-blue-50",
    },
    cameraPreset: {
      initialPosition: [-0.08, -0.04, 6.2],
      target: [0, -0.1, 0],
      minDistance: 4.9,
      maxDistance: 9,
      minPolarAngle: 0.98,
      maxPolarAngle: 2.16,
      minAzimuthAngle: -0.9,
      maxAzimuthAngle: 0.9,
    },
  },
  {
    id: "craft-economy",
    slug: "the-return-of-repair",
    title: "The Return of Repair",
    titleZh: "修补文化的回归",
    summary: "Why repair shops, reuse habits, and longer product lifecycles are becoming economically meaningful again.",
    topic: "Society",
    difficulty: "C1",
    estimatedMinutes: 5,
    body: `In many wealthy societies, convenience once defeated repair. It seemed easier to replace a broken object than to understand it. Cheap manufacturing and fast delivery made patience look old-fashioned.

That logic is weakening. As prices rise and environmental pressure grows, repair is becoming practical again. Local workshops are reappearing, online communities share guides, and some brands now advertise how easily their products can be opened, cleaned, or upgraded.

Repair changes more than household budgets. It changes the relationship between people and possessions. An object that can be fixed is no longer disposable by design. It becomes part of a slower economy in which durability, skill, and attention regain value.`,
    keyPoints: [
      "Repair becomes more attractive when replacement is no longer cheap or guilt-free.",
      "Skills, guides, and design choices all influence whether repair is realistic.",
      "Durability creates a different emotional and economic relationship with products.",
    ],
    vocabularyFocus: ["wealthy", "weakening", "upgraded", "durability", "disposable"],
    questions: [
      "Why did repair lose ground in the past?",
      "Which forces are making repair practical again?",
      "How does repair change the meaning of ownership?",
    ],
    modelSrc: "/models/shuilanlan.glb",
    theme: {
      accent: "#b45309",
      glow: "rgba(180, 83, 9, 0.2)",
      surface: "from-amber-100 via-white to-orange-50",
    },
    cameraPreset: {
      initialPosition: [0.06, -0.03, 6],
      target: [0, -0.06, 0],
      minDistance: 4.7,
      maxDistance: 8.9,
      minPolarAngle: 0.94,
      maxPolarAngle: 2.14,
      minAzimuthAngle: -1,
      maxAzimuthAngle: 1,
    },
  },
  {
    id: "museum-sound",
    slug: "how-museums-design-silence",
    title: "How Museums Design Silence",
    titleZh: "博物馆如何设计安静",
    summary: "A look at sound, pacing, and atmosphere in spaces built for attention and reflection.",
    topic: "Culture",
    difficulty: "B2",
    estimatedMinutes: 4,
    body: `Silence in a museum is rarely accidental. It is designed through materials, spacing, and expectation. Thick curtains absorb footsteps, walls create pauses, and visitors instinctively lower their voices because the room suggests that they should.

This atmosphere shapes how art is received. A painting seen in hurry can feel ordinary, yet the same painting in a calm room may reveal structure, contrast, or humour that was previously ignored. The design of the space slows the viewer long enough for perception to deepen.

In that sense, silence is not emptiness. It is a form of guidance. It tells people that careful attention is welcome here and that meaning may appear gradually rather than all at once.`,
    keyPoints: [
      "Museum silence is produced by design choices, not chance alone.",
      "A quiet environment can change how visitors perceive the same object.",
      "Silence acts as guidance by encouraging slower, deeper attention.",
    ],
    vocabularyFocus: ["atmosphere", "absorb", "instinctively", "perception", "gradually"],
    questions: [
      "What creates silence in a museum according to the writer?",
      "Why might a calm room change the way a painting is understood?",
      "How is silence presented as guidance rather than emptiness?",
    ],
    modelSrc: "/models/shuilanlan.glb",
    theme: {
      accent: "#7c3aed",
      glow: "rgba(124, 58, 237, 0.2)",
      surface: "from-violet-100 via-white to-fuchsia-50",
    },
    cameraPreset: {
      initialPosition: [-0.04, -0.02, 6.15],
      target: [0, -0.08, 0],
      minDistance: 4.8,
      maxDistance: 9.1,
      minPolarAngle: 1,
      maxPolarAngle: 2.12,
      minAzimuthAngle: -0.88,
      maxAzimuthAngle: 0.88,
    },
  },
  {
    id: "sea-farms",
    slug: "farming-the-open-ocean",
    title: "Farming the Open Ocean",
    titleZh: "走向外海的养殖业",
    summary: "How ocean farming is moving farther from the coast in search of cleaner water and lower ecological pressure.",
    topic: "Innovation",
    difficulty: "C1",
    estimatedMinutes: 6,
    body: `Traditional fish farms are often located close to shore, where logistics are easier and maintenance costs are lower. Yet coastal waters are crowded spaces. Tourism, shipping, and pollution all compete with aquaculture, making expansion difficult.

That is why some companies are moving cages farther into open water. Stronger currents can improve water quality and disperse waste more effectively. The challenge is that equipment must survive harsher weather, and operators need more advanced monitoring systems.

Open-ocean farming is therefore not a simple relocation. It is a technical shift. Success depends on engineering, forecasting, and regulation, as well as on careful judgement about which environments can support this kind of production responsibly.`,
    keyPoints: [
      "Coastal fish farms face spatial and environmental pressure.",
      "Open water may offer cleaner conditions but introduces new engineering challenges.",
      "Responsible expansion depends on more than moving cages farther out.",
    ],
    vocabularyFocus: ["aquaculture", "disperse", "harsher", "forecasting", "responsibly"],
    questions: [
      "Why are coastal fish farms becoming harder to expand?",
      "What advantages can open water provide?",
      "Why is this described as a technical shift rather than simple relocation?",
    ],
    modelSrc: "/models/shuilanlan.glb",
    theme: {
      accent: "#0369a1",
      glow: "rgba(3, 105, 161, 0.2)",
      surface: "from-cyan-100 via-white to-sky-50",
    },
    cameraPreset: {
      initialPosition: [0.12, 0.01, 6.25],
      target: [0, -0.05, 0],
      minDistance: 4.9,
      maxDistance: 9.25,
      minPolarAngle: 0.96,
      maxPolarAngle: 2.1,
      minAzimuthAngle: -1.05,
      maxAzimuthAngle: 1.05,
    },
  },
  {
    id: "study-routine",
    slug: "building-a-routine-that-lasts",
    title: "Building a Routine That Lasts",
    titleZh: "建立真正能坚持的学习习惯",
    summary: "A practical argument for smaller habits, visible cues, and realistic pacing in language study.",
    topic: "Learning",
    difficulty: "B1",
    estimatedMinutes: 4,
    body: `Many study plans fail because they are designed for a perfect version of the learner. They assume unlimited motivation, ideal concentration, and a schedule free from interruption. Real life rarely behaves so politely.

More durable routines are usually smaller than people expect. Ten focused minutes after breakfast may be more sustainable than one ambitious hour at night. A visible cue, such as an open notebook or prepared article list, reduces the energy needed to begin.

Consistency grows when the routine fits ordinary days rather than exceptional ones. The goal is not to feel intense for a week. It is to make starting so manageable that progress can continue for months.`,
    keyPoints: [
      "Routine design should match ordinary life, not idealised motivation.",
      "Small, repeatable study blocks often beat ambitious plans.",
      "Visible cues reduce friction and make starting easier.",
    ],
    vocabularyFocus: ["durable", "sustainable", "cue", "manageable", "consistency"],
    questions: [
      "Why do many study plans fail according to the article?",
      "How can visible cues improve consistency?",
      "What kind of routine is more likely to last for months?",
    ],
    modelSrc: "/models/shuilanlan.glb",
    theme: {
      accent: "#db2777",
      glow: "rgba(219, 39, 119, 0.2)",
      surface: "from-rose-100 via-white to-pink-50",
    },
    cameraPreset: {
      initialPosition: [0, -0.06, 6.15],
      target: [0, -0.08, 0],
      minDistance: 4.8,
      maxDistance: 8.95,
      minPolarAngle: 0.94,
      maxPolarAngle: 2.14,
      minAzimuthAngle: -0.92,
      maxAzimuthAngle: 0.92,
    },
  },
  {
    id: "food-memory",
    slug: "why-flavour-brings-back-memory",
    title: "Why Flavour Brings Back Memory",
    titleZh: "味道为何能唤回记忆",
    summary: "An accessible article on the emotional power of smell, flavour, and personal recall.",
    topic: "Psychology",
    difficulty: "B2",
    estimatedMinutes: 4,
    body: `A familiar flavour can make the past feel unexpectedly near. One mouthful of a childhood soup or one trace of a spice may restore a scene more quickly than a photograph can.

Scientists often explain this effect through the close relationship between smell, emotion, and memory. Odours are processed by brain systems strongly connected to feeling and recall, which may be why they seem to arrive with unusual intensity.

That intensity helps explain why food is rarely just nutritional. Meals become social markers, family habits, and private archives. A recipe can survive as a kind of memory technology, carrying place and emotion through time.`,
    keyPoints: [
      "Flavour can trigger vivid memories with unusual speed and emotion.",
      "Smell is closely linked to systems involved in feeling and recall.",
      "Food carries social and emotional meaning beyond nutrition.",
    ],
    vocabularyFocus: ["familiar", "odours", "intensity", "archives", "nutritional"],
    questions: [
      "Why can flavour sometimes revive memory faster than a photograph?",
      "How does the article connect smell with emotion?",
      "What does the phrase memory technology suggest about recipes?",
    ],
    modelSrc: "/models/shuilanlan.glb",
    theme: {
      accent: "#dc2626",
      glow: "rgba(220, 38, 38, 0.18)",
      surface: "from-red-100 via-white to-orange-50",
    },
    cameraPreset: {
      initialPosition: [0.08, -0.04, 6.1],
      target: [0, -0.06, 0],
      minDistance: 4.8,
      maxDistance: 8.85,
      minPolarAngle: 0.95,
      maxPolarAngle: 2.13,
      minAzimuthAngle: -0.98,
      maxAzimuthAngle: 0.98,
    },
  },
  {
    id: "night-transit",
    slug: "what-makes-night-transit-feel-safe",
    title: "What Makes Night Transit Feel Safe",
    titleZh: "夜间交通为何让人感到安全",
    summary: "A transport design piece about lighting, visibility, frequency, and public trust after dark.",
    topic: "Public Design",
    difficulty: "C1",
    estimatedMinutes: 5,
    body: `Transport planners often talk about efficiency, capacity, and speed. Passengers, however, also measure a system by a quieter standard: whether it feels safe when the city grows dark.

That feeling depends on many details. Bright but not harsh lighting matters. So does visibility between platforms, exits, and surrounding streets. Frequent services reduce waiting time, while clear signs reduce the fear of being stranded in the wrong place.

Safety, in this sense, is partly emotional infrastructure. A network earns trust when people can predict what will happen next and when the environment signals care rather than neglect.`,
    keyPoints: [
      "Night-time safety depends on design details as much as transport efficiency.",
      "Lighting, visibility, frequency, and wayfinding all shape public trust.",
      "Predictability helps turn transport into emotional infrastructure.",
    ],
    vocabularyFocus: ["capacity", "visibility", "stranded", "neglect", "predict"],
    questions: [
      "Why does the writer say safety is emotional infrastructure?",
      "Which details contribute to safer night travel?",
      "How does predictability build trust in a transport network?",
    ],
    modelSrc: "/models/shuilanlan.glb",
    theme: {
      accent: "#1d4ed8",
      glow: "rgba(29, 78, 216, 0.2)",
      surface: "from-blue-100 via-white to-indigo-50",
    },
    cameraPreset: {
      initialPosition: [-0.1, -0.02, 6.2],
      target: [0, -0.06, 0],
      minDistance: 4.85,
      maxDistance: 9,
      minPolarAngle: 0.97,
      maxPolarAngle: 2.09,
      minAzimuthAngle: -1,
      maxAzimuthAngle: 1,
    },
  },
  {
    id: "paper-future",
    slug: "why-paper-still-matters",
    title: "Why Paper Still Matters",
    titleZh: "纸张为何依然重要",
    summary: "A short reflection on why paper remains useful in an age of abundant screens.",
    topic: "Media",
    difficulty: "B1",
    estimatedMinutes: 4,
    body: `Screens are efficient, searchable, and portable. They allow one device to store a library. Yet paper continues to survive, not out of nostalgia alone, but because it offers a different rhythm of use.

Paper slows the reader in productive ways. It reveals less at once, invites annotation without menus, and makes progress physically visible. A stack of pages on a desk creates a sense of task and sequence that a hidden file often does not.

For many people, the future is therefore not paper or screen. It is paper and screen, used for different kinds of attention. The stronger medium is not always the faster one.`,
    keyPoints: [
      "Paper survives because it offers a different pace and physical presence.",
      "Annotation and visible progress can feel easier on paper.",
      "Different media support different forms of attention.",
    ],
    vocabularyFocus: ["portable", "nostalgia", "annotation", "sequence", "medium"],
    questions: [
      "Why does the author say paper survives for more than nostalgia?",
      "How does paper create a different rhythm of use?",
      "What conclusion does the writer reach about paper and screens?",
    ],
    modelSrc: "/models/shuilanlan.glb",
    theme: {
      accent: "#4d7c0f",
      glow: "rgba(77, 124, 15, 0.18)",
      surface: "from-lime-100 via-white to-green-50",
    },
    cameraPreset: {
      initialPosition: [0.04, -0.03, 6.05],
      target: [0, -0.06, 0],
      minDistance: 4.75,
      maxDistance: 8.8,
      minPolarAngle: 0.93,
      maxPolarAngle: 2.11,
      minAzimuthAngle: -0.95,
      maxAzimuthAngle: 0.95,
    },
  },
];

export function getFeaturedArticleBySlug(slug: string) {
  return FEATURED_DEMO_ARTICLES.find((article) => article.slug === slug);
}

export const FEATURED_MODEL_SRCS = Array.from(
  new Set(FEATURED_DEMO_ARTICLES.map((article) => article.modelSrc))
);
