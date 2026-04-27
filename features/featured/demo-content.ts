import type { FeaturedDemoConfig } from "@/features/featured/types";

/**
 * 编辑说明：
 * 1. 精选文章与 `public/models/landmarks/` 中的实际模型文件保持一一对应。
 * 2. 每篇文章的 3D 模型路径由 `modelSrc` 指定，模型名可以是拼音或英文。
 * 3. 如果替换模型文件名，请同步更新这里的 `modelSrc`。
 */
export const FEATURED_DEMO_ARTICLES: FeaturedDemoConfig[] = [
  {
    id: "great-wall",
    slug: "great-wall-of-china",
    title: "The Great Wall of China",
    titleZh: "中国长城",
    summary: "A reading feature about defense, terrain, and the enormous human effort embedded in a mountain frontier.",
    topic: "Fortification",
    difficulty: "B2",
    estimatedMinutes: 6,
    body: `The Great Wall is often imagined as one endless line, but it is better understood as a system. Walls, passes, watchtowers, and defensive corridors were built and rebuilt over long periods in response to changing political and military needs.

Its architecture gains meaning from the land it crosses. On steep ridges the structure climbs in sharp steps, while in flatter regions it stretches more calmly across open ground. The monument shows how strategy and geography can become inseparable.

The wall also records labour on an extraordinary scale. Stone, tamped earth, brick, and timber had to be moved and assembled under severe conditions. Imperial ambition survives here only because countless workers made distant plans physically real.

For modern readers, the Great Wall is useful not only as a symbol of China, but as an example of how infrastructure, landscape, and power can be read together. It feels monumental from afar and deeply human at close range.`,
    keyPoints: [
      "The Great Wall is a changing defensive system rather than one uniform structure.",
      "Its form responds directly to terrain and military strategy.",
      "The monument reveals the labour behind imperial construction.",
    ],
    vocabularyFocus: ["fortification", "corridors", "ridge", "infrastructure", "endurance"],
    questions: [
      "Why is the wall better described as a system than a single line?",
      "How does terrain shape the wall's architecture?",
      "What human story becomes visible when we look beyond the monument's scale?",
    ],
    modelSrc: "/models/landmarks/greatwall.glb",
    theme: {
      accent: "#9a3412",
      glow: "rgba(154, 52, 18, 0.18)",
      surface: "from-orange-100 via-white to-amber-50",
    },
    cameraPreset: {
      initialPosition: [0.04, -0.05, 6.2],
      target: [0, -0.08, 0],
      minDistance: 4.8,
      maxDistance: 9.4,
      minPolarAngle: 0.96,
      maxPolarAngle: 2.12,
      minAzimuthAngle: -1.02,
      maxAzimuthAngle: 1.02,
    },
  },
  {
    id: "machu-picchu",
    slug: "machu-picchu",
    title: "Machu Picchu",
    titleZh: "马丘比丘",
    summary: "A mountain citadel where stonework, altitude, and careful planning create a city that still feels improbable.",
    topic: "Mountain City",
    difficulty: "B2",
    estimatedMinutes: 5,
    body: `Machu Picchu occupies one of the most dramatic settings in world architecture. Built high in the Andes, it seems to emerge from mist and steep green slopes rather than to rest on ordinary ground.

Its stonework remains one of its most admired qualities. Blocks were shaped with great precision, allowing walls to hold together without heavy mortar. Terraces stabilized the land and turned difficult slopes into usable civic space.

The site is often described as a lost city, but that phrase can oversimplify it. Machu Picchu was part of a wider imperial world with its own political, agricultural, and ceremonial logic.

What makes the citadel memorable is its restraint. The buildings do not try to overpower the mountains. Instead, they align with the landscape so closely that architecture and environment feel almost fused.`,
    keyPoints: [
      "Machu Picchu combines city planning with an extreme mountain setting.",
      "Its terraces and stonework show advanced engineering choices.",
      "The site belongs to a broader cultural system, not just a mystery narrative.",
    ],
    vocabularyFocus: ["citadel", "terraces", "ceremonial", "restraint", "precision"],
    questions: [
      "How does the city relate to the mountain environment?",
      "What practical role did terraces play at Machu Picchu?",
      "Why is the phrase lost city not fully satisfying?",
    ],
    modelSrc: "/models/landmarks/machu-picchu.glb",
    theme: {
      accent: "#166534",
      glow: "rgba(22, 101, 52, 0.18)",
      surface: "from-emerald-100 via-white to-lime-50",
    },
    cameraPreset: {
      initialPosition: [0.08, -0.03, 6.1],
      target: [0, -0.06, 0],
      minDistance: 4.7,
      maxDistance: 9,
      minPolarAngle: 0.95,
      maxPolarAngle: 2.08,
      minAzimuthAngle: -1,
      maxAzimuthAngle: 1,
    },
  },
  {
    id: "tower-of-babel",
    slug: "tower-of-babel",
    title: "The Tower of Babel",
    titleZh: "巴别塔",
    summary: "A reading piece on ambition, language, and the enduring power of a structure that lives between myth and symbol.",
    topic: "Mythic Tower",
    difficulty: "B2",
    estimatedMinutes: 5,
    body: `The Tower of Babel is not important because historians can point to a single surviving building. Its power comes from the story attached to it: a tower built high enough to challenge the proper distance between human beings and the divine.

In many readings, the tower represents ambition without limit. The upward drive of the structure becomes a visual metaphor for pride, while the confusion of languages turns architecture into a warning about broken communication.

That symbolic force helps explain why Babel continues to appear in paintings, literature, and political commentary. It can stand for empire, technological overconfidence, or the fantasy that scale alone can guarantee unity.

As a reading subject, Babel reminds us that buildings are not only physical objects. Some of the most influential structures in culture are powerful because they organize imagination, memory, and moral reflection.`,
    keyPoints: [
      "Babel matters primarily as a symbolic structure rather than a surviving monument.",
      "The tower is often read as a warning about limitless ambition.",
      "Its story connects architecture with language and power.",
    ],
    vocabularyFocus: ["mythic", "ambition", "metaphor", "confusion", "unity"],
    questions: [
      "Why does Babel remain influential even without a clear physical original?",
      "How does vertical architecture become a moral symbol in the story?",
      "What modern concerns can Babel still represent today?",
    ],
    modelSrc: "/models/landmarks/babieta.glb",
    theme: {
      accent: "#7c2d12",
      glow: "rgba(124, 45, 18, 0.18)",
      surface: "from-amber-100 via-white to-orange-50",
    },
    cameraPreset: {
      initialPosition: [0.03, -0.04, 6.18],
      target: [0, -0.08, 0],
      minDistance: 4.8,
      maxDistance: 9.1,
      minPolarAngle: 0.95,
      maxPolarAngle: 2.08,
      minAzimuthAngle: -0.9,
      maxAzimuthAngle: 0.9,
    },
  },
  {
    id: "notre-dame",
    slug: "notre-dame-de-paris",
    title: "Notre-Dame de Paris",
    titleZh: "巴黎圣母院",
    summary: "An article about height, ritual, and the long cultural memory carried by one of Europe's most famous cathedrals.",
    topic: "Cathedral",
    difficulty: "B2",
    estimatedMinutes: 5,
    body: `Notre-Dame de Paris was designed not only as a place of worship, but also as a public statement of faith, craftsmanship, and urban identity. Its towers, vaults, and stained glass helped define how sacred architecture could shape a city.

Gothic cathedrals use height in a very deliberate way. Vertical lines pull the eye upward, while filtered light and structural rhythm create an atmosphere that feels solemn without becoming empty.

The cathedral's meaning has continued to evolve across centuries. It has been a religious site, a literary symbol, a tourist landmark, and more recently a reminder of how fragile cultural heritage can be.

To read Notre-Dame well is to notice both engineering and memory. Stone ribs, pointed arches, and great windows matter, but so do the emotions people project onto the building across time.`,
    keyPoints: [
      "Notre-Dame combines sacred function with strong civic symbolism.",
      "Gothic height and light shape the visitor's emotional experience.",
      "The cathedral's modern meaning includes preservation and shared memory.",
    ],
    vocabularyFocus: ["cathedral", "vaults", "solemn", "heritage", "civic"],
    questions: [
      "How does Notre-Dame function as more than a religious building?",
      "What role do height and light play in Gothic architecture?",
      "Why is the cathedral also a modern symbol of cultural memory?",
    ],
    modelSrc: "/models/landmarks/balishengmuyuan.glb",
    theme: {
      accent: "#1d4ed8",
      glow: "rgba(29, 78, 216, 0.16)",
      surface: "from-sky-100 via-white to-blue-50",
    },
    cameraPreset: {
      initialPosition: [0.02, -0.03, 6.14],
      target: [0, -0.08, 0],
      minDistance: 4.8,
      maxDistance: 9,
      minPolarAngle: 0.96,
      maxPolarAngle: 2.1,
      minAzimuthAngle: -0.94,
      maxAzimuthAngle: 0.94,
    },
  },
  {
    id: "hanging-gardens",
    slug: "hanging-gardens-of-babylon",
    title: "The Hanging Gardens of Babylon",
    titleZh: "空中花园",
    summary: "A reflection on one of antiquity's most famous wonders, where architecture and imagination meet in terraces of mythic greenery.",
    topic: "Ancient Wonder",
    difficulty: "B2",
    estimatedMinutes: 5,
    body: `The Hanging Gardens of Babylon occupy a special place in cultural history because they feel plausible and impossible at the same time. The image of elevated gardens rising above an ancient city continues to fascinate even though historical evidence remains uncertain.

What makes the story so durable is the combination of engineering and desire. Terraces, irrigation, and layered planting suggest a world in which architecture does not resist nature, but lifts and stages it.

In that sense, the gardens become more than a lost wonder. They represent a recurring human dream: to create an artificial paradise through design, technology, and careful control of the environment.

Whether or not the gardens existed exactly as later writers described them, they remain useful as a reading topic because they show how legend can shape architectural imagination for centuries.`,
    keyPoints: [
      "The Hanging Gardens are powerful because they sit between history and legend.",
      "Their imagined design joins architecture, water, and plant life.",
      "The story expresses a deep human desire to build paradise.",
    ],
    vocabularyFocus: ["terraces", "irrigation", "plausible", "artificial", "legend"],
    questions: [
      "Why do the gardens still fascinate people despite uncertain evidence?",
      "How does the idea of raised gardens combine nature with engineering?",
      "What larger human dream does the story represent?",
    ],
    modelSrc: "/models/landmarks/hanging gardens.glb",
    theme: {
      accent: "#15803d",
      glow: "rgba(21, 128, 61, 0.16)",
      surface: "from-green-100 via-white to-emerald-50",
    },
    cameraPreset: {
      initialPosition: [0.01, -0.04, 6.16],
      target: [0, -0.08, 0],
      minDistance: 4.82,
      maxDistance: 9.02,
      minPolarAngle: 0.96,
      maxPolarAngle: 2.1,
      minAzimuthAngle: -0.92,
      maxAzimuthAngle: 0.92,
    },
  },
  {
    id: "eiffel-tower",
    slug: "eiffel-tower",
    title: "The Eiffel Tower",
    titleZh: "埃菲尔铁塔",
    summary: "A study of iron, visibility, and how a once-controversial structure became the defining image of Paris.",
    topic: "Urban Landmark",
    difficulty: "B2",
    estimatedMinutes: 5,
    body: `The Eiffel Tower was originally built for the 1889 Exposition Universelle, and many critics considered it too industrial, too exposed, or simply too strange. Yet over time the tower became one of the most recognizable structures in the world.

Its visual power depends on clarity. The exposed iron frame does not hide how it stands. Instead, the structure turns engineering into spectacle and makes modern construction itself part of the aesthetic experience.

The tower also changed how cities could be seen. It offers a high vantage point, but it also transforms the skyline when viewed from below or from a distance. In both directions, it reorganizes urban perception.

The Eiffel Tower matters because it shows how public taste can change. A structure once mocked as temporary and ugly can become a symbol of elegance once culture learns how to read it differently.`,
    keyPoints: [
      "The Eiffel Tower turned exposed engineering into architectural beauty.",
      "Its meaning depends on visibility, scale, and urban perspective.",
      "The monument shows how public opinion about design can evolve.",
    ],
    vocabularyFocus: ["industrial", "exposed", "spectacle", "skyline", "vantage"],
    questions: [
      "Why was the Eiffel Tower controversial at first?",
      "How does the tower make engineering part of its visual appeal?",
      "What does the building teach us about changing public taste?",
    ],
    modelSrc: "/models/landmarks/ifeiertieta.glb",
    theme: {
      accent: "#6b7280",
      glow: "rgba(107, 114, 128, 0.16)",
      surface: "from-slate-100 via-white to-zinc-50",
    },
    cameraPreset: {
      initialPosition: [0.02, -0.02, 6.1],
      target: [0, -0.08, 0],
      minDistance: 4.7,
      maxDistance: 8.95,
      minPolarAngle: 0.92,
      maxPolarAngle: 2.08,
      minAzimuthAngle: -0.88,
      maxAzimuthAngle: 0.88,
    },
  },
  {
    id: "pyramids",
    slug: "great-pyramids-of-giza",
    title: "The Great Pyramids of Giza",
    titleZh: "吉萨金字塔",
    summary: "A reading feature about geometry, burial, and the extraordinary durability of one of the ancient world's defining forms.",
    topic: "Monumental Tomb",
    difficulty: "B2",
    estimatedMinutes: 5,
    body: `The pyramids of Giza remain astonishing because their geometry is so clear and their scale is so difficult to absorb. A pyramid looks simple from afar, yet that simplicity depends on immense organization, labour, and planning.

These structures were not abstract exercises in form. They were funerary monuments built to support ideas about kingship, death, and the afterlife. Their shape therefore carries symbolic as well as technical meaning.

The desert setting intensifies their impact. Against open land and bright light, the pyramids appear stable, severe, and almost beyond time. Few structures project permanence so effectively.

Modern visitors often focus on size alone, but the pyramids are equally worth studying as examples of disciplined geometry. Their power lies in how a reduced form can carry enormous cultural weight.`,
    keyPoints: [
      "The pyramids combine severe geometry with extraordinary scale.",
      "They were funerary monuments tied to political and spiritual beliefs.",
      "Their simplicity is the result of enormous organization and labour.",
    ],
    vocabularyFocus: ["geometry", "funerary", "afterlife", "permanence", "discipline"],
    questions: [
      "Why is the pyramid form more complex than it first appears?",
      "How does funerary purpose shape the meaning of these monuments?",
      "What role does the desert setting play in their visual effect?",
    ],
    modelSrc: "/models/landmarks/jinzita.glb",
    theme: {
      accent: "#b45309",
      glow: "rgba(180, 83, 9, 0.18)",
      surface: "from-yellow-100 via-white to-amber-50",
    },
    cameraPreset: {
      initialPosition: [0.01, -0.04, 6.12],
      target: [0, -0.08, 0],
      minDistance: 4.78,
      maxDistance: 9,
      minPolarAngle: 0.95,
      maxPolarAngle: 2.1,
      minAzimuthAngle: -0.9,
      maxAzimuthAngle: 0.9,
    },
  },
  {
    id: "colosseum",
    slug: "colosseum",
    title: "The Colosseum",
    titleZh: "罗马斗兽场",
    summary: "A study of spectacle, circulation, and the architecture of mass attendance in ancient Rome.",
    topic: "Arena",
    difficulty: "B2",
    estimatedMinutes: 5,
    body: `The Colosseum is one of the clearest examples of architecture built around organized spectacle. Its elliptical form, layered seating, and complex entrances were designed to move large crowds efficiently while directing attention toward a central performance space.

Engineering played a crucial role in that effect. Vaults, arches, and circulation routes helped thousands of spectators enter, sit, and leave with surprising order. The building was not only large; it was operationally intelligent.

At the same time, the monument is morally complex. It hosted entertainments tied to imperial power, discipline, and violence. Admiring the structure therefore requires more than romantic appreciation of ruins.

That tension is part of its importance. The Colosseum shows how architecture can combine beauty, efficiency, and domination in the same form.`,
    keyPoints: [
      "The Colosseum was designed as a machine for public spectacle.",
      "Its circulation system organized crowds with unusual efficiency.",
      "The monument also raises ethical questions about the uses of architecture.",
    ],
    vocabularyFocus: ["elliptical", "circulation", "spectators", "imperial", "domination"],
    questions: [
      "What makes the Colosseum more than simply a large arena?",
      "How did architecture help control the movement of spectators?",
      "Why is the building described as morally complex?",
    ],
    modelSrc: "/models/landmarks/luomadoushouchang.glb",
    theme: {
      accent: "#991b1b",
      glow: "rgba(153, 27, 27, 0.18)",
      surface: "from-rose-100 via-white to-red-50",
    },
    cameraPreset: {
      initialPosition: [0.1, -0.03, 6.05],
      target: [0, -0.06, 0],
      minDistance: 4.75,
      maxDistance: 8.95,
      minPolarAngle: 0.93,
      maxPolarAngle: 2.1,
      minAzimuthAngle: -0.95,
      maxAzimuthAngle: 0.95,
    },
    sceneTuning: {
      scale: 0.88,
      modelYaw: Math.PI,
    },
  },
  {
    id: "maya-temple",
    slug: "maya-temple",
    title: "A Maya Temple",
    titleZh: "玛雅神庙",
    summary: "An article about steps, ritual, and the way Mesoamerican temple forms turn height into public meaning.",
    topic: "Ceremonial Pyramid",
    difficulty: "B2",
    estimatedMinutes: 5,
    body: `Maya temple architecture often combines a stepped base, a strong profile, and a carefully elevated sacred zone. Even when we view a single structure rather than an entire city, the form suggests ceremony, procession, and authority.

The stairway is especially important. It does more than connect ground to summit. It stages movement in public view and turns ascent into part of the building's meaning.

These temples also reveal how geometry can organize belief. Sharp edges, repeated levels, and an elevated shrine create a structure that feels ordered, deliberate, and spiritually charged.

For readers, a Maya temple is a useful subject because it shows how architecture can guide collective attention without relying on interior size. The building's power comes from form, sequence, and symbolic height.`,
    keyPoints: [
      "Maya temple design links stepped geometry with ceremonial movement.",
      "Stairs and elevation help turn architecture into public ritual.",
      "The structure's power depends on clarity of form rather than interior volume.",
    ],
    vocabularyFocus: ["procession", "summit", "elevated", "profile", "ritual"],
    questions: [
      "Why is the stairway central to the meaning of a Maya temple?",
      "How does stepped geometry shape the visitor's perception?",
      "What kind of authority does this architecture project?",
    ],
    modelSrc: "/models/landmarks/maya temple .glb",
    theme: {
      accent: "#0f766e",
      glow: "rgba(15, 118, 110, 0.16)",
      surface: "from-teal-100 via-white to-emerald-50",
    },
    cameraPreset: {
      initialPosition: [-0.02, -0.05, 6.14],
      target: [0, -0.08, 0],
      minDistance: 4.8,
      maxDistance: 9,
      minPolarAngle: 0.96,
      maxPolarAngle: 2.1,
      minAzimuthAngle: -0.92,
      maxAzimuthAngle: 0.92,
    },
  },
  {
    id: "chinese-pagoda",
    slug: "traditional-chinese-pagoda",
    title: "The Epang Palace",
    titleZh: "阿房宫",
    summary: "A reading feature on imperial ambition, imagined grandeur, and the cultural memory of the Epang Palace.",
    topic: "Epang Palace",
    difficulty: "B2",
    estimatedMinutes: 5,
    body: `The Epang Palace is one of the most famous palace sites associated with Qin imperial power. Although later writers often imagined it as an enormous and dazzling complex, archaeology reminds us that its history is more complicated than legend alone.

In traditional accounts, the palace became a symbol of ambition on a vast scale. Its name evokes raised terraces, broad halls, and the desire to turn political authority into visible architectural force.

The site is also remembered through literature. Du Mu's "Epang Palace Rhapsody" turned the palace into a moral image: splendid buildings could not protect a dynasty if power forgot restraint.

For learners, the Epang Palace is helpful because it shows how architecture can become cultural memory. Even when the physical remains are uncertain, a place can survive through history, poetry, and public imagination.`,
    keyPoints: [
      "The Epang Palace is linked to Qin imperial ambition and centralized power.",
      "Its later image combines historical evidence, legend, and literary imagination.",
      "The palace became a warning about excess, authority, and political collapse.",
    ],
    vocabularyFocus: ["imperial", "ambition", "terrace", "restraint", "rhapsody"],
    questions: [
      "Why did the Epang Palace become a symbol of imperial ambition?",
      "How can literature change the way later readers remember a building?",
      "What warning does the story of the palace offer about power and excess?",
    ],
    modelSrc: "/models/landmarks/traditional chinese pagoda 3d model.glb",
    theme: {
      accent: "#7c3aed",
      glow: "rgba(124, 58, 237, 0.16)",
      surface: "from-violet-100 via-white to-fuchsia-50",
    },
    cameraPreset: {
      initialPosition: [0.03, -0.03, 6.08],
      target: [0, -0.08, 0],
      minDistance: 4.72,
      maxDistance: 8.9,
      minPolarAngle: 0.93,
      maxPolarAngle: 2.08,
      minAzimuthAngle: -0.9,
      maxAzimuthAngle: 0.9,
    },
  },
];

export function getFeaturedArticleBySlug(slug: string) {
  return FEATURED_DEMO_ARTICLES.find((article) => article.slug === slug);
}

export const FEATURED_MODEL_SRCS = Array.from(
  new Set(FEATURED_DEMO_ARTICLES.map((article) => article.modelSrc))
);
