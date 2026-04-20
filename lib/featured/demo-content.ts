import type { FeaturedDemoConfig } from "@/types";

/**
 * 编辑说明：
 * 1. 文章正文、摘要、标题都集中维护在这里。
 * 2. 每篇文章的 3D 模型路径由 `modelSrc` 指定，对应文件请放到 `public/models/landmarks/`。
 * 3. 你后续只需要替换文案和同名 `.glb` 文件，不需要修改页面组件。
 */
export const FEATURED_DEMO_ARTICLES: FeaturedDemoConfig[] = [
  {
    id: "great-wall",
    slug: "great-wall-of-china",
    title: "The Great Wall of China",
    titleZh: "中国长城",
    summary: "A reading feature about scale, defense, and the long human effort embedded in a mountain frontier.",
    topic: "Fortification",
    difficulty: "B2",
    estimatedMinutes: 6,
    body: `The Great Wall is often imagined as a single, uninterrupted line running across northern China. In reality, it is a vast system of walls, passes, watchtowers, and defensive corridors built and rebuilt across many centuries. Its scale is impressive not simply because it is long, but because it adapts to ridges, deserts, valleys, and political needs that changed over time.

What survives today reflects both military logic and environmental negotiation. Builders worked with the landscape instead of erasing it. On steep mountains, the wall rises in sudden steps. In flatter regions, it spreads more calmly, tying together towers and gates that once controlled movement, warning signals, and supply routes.

The monument also carries a quieter message about labour. Stone, tamped earth, brick, and timber had to be moved, shaped, and assembled under harsh conditions. The wall therefore records not only imperial ambition, but also the endurance of workers whose effort made distant strategy physically real.

For modern visitors, the Great Wall can feel cinematic from afar and intensely human at close range. Each stair, parapet, and lookout platform brings the body back into the story. The structure becomes easier to understand when it is treated not as an abstract wonder, but as architecture designed for movement, vigilance, and survival.`,
    keyPoints: [
      "The Great Wall is a changing system rather than one uniform structure.",
      "Its form responds directly to terrain and strategic need.",
      "The site also reveals the human labour behind imperial construction.",
    ],
    vocabularyFocus: ["fortification", "corridors", "parapet", "vigilance", "endurance"],
    questions: [
      "Why does the article reject the idea of the wall as one continuous line?",
      "How does the terrain shape the architecture of the wall?",
      "What human story becomes visible when the monument is viewed up close?",
    ],
    modelSrc: "/models/landmarks/great-wall.glb",
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
    summary: "A mountain citadel where stonework, altitude, and ritual planning create a city that still feels improbable.",
    topic: "Mountain City",
    difficulty: "B2",
    estimatedMinutes: 5,
    body: `Machu Picchu occupies one of the most dramatic settings in world architecture. Built high in the Andes, the site seems to appear out of mist and steep green slopes rather than to sit on ordinary ground. That setting is not accidental decoration. The city is inseparable from its mountain environment, and much of its power comes from the way planning responds to altitude, weather, and sacred geography.

The stonework remains one of its most admired qualities. Blocks were shaped with remarkable precision, allowing walls to hold together without heavy mortar. Terraces stabilized the land, supported cultivation, and turned difficult slopes into usable civic space. The result is a settlement that feels disciplined without becoming rigid.

Machu Picchu is often presented as a lost city, yet that phrase can simplify more than it explains. The site was part of a larger imperial and cultural world. Its meaning lies not only in mystery, but in engineering skill, ceremonial order, and the sophisticated relationship between architecture and landscape.

Seen today, the citadel offers a lesson in restraint. The buildings do not dominate the mountains; they align with them. That balance helps explain why the place feels at once monumental and fragile, designed with conviction yet aware of the terrain that makes it possible.`,
    keyPoints: [
      "Machu Picchu is powerful because city planning and mountain setting are tightly fused.",
      "Its precision stonework and terraces reveal advanced engineering choices.",
      "The site is more than a mystery narrative; it belongs to a larger cultural system.",
    ],
    vocabularyFocus: ["citadel", "terraces", "ceremonial", "restraint", "precision"],
    questions: [
      "How does the article describe the relationship between the city and the mountains?",
      "What practical roles did the terraces perform?",
      "Why does the writer push back against the phrase lost city?",
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
    id: "petra",
    slug: "petra",
    title: "Petra",
    titleZh: "佩特拉",
    summary: "An exploration of carved facades, desert routes, and a city whose architecture was cut directly from stone.",
    topic: "Rock-Cut City",
    difficulty: "B2",
    estimatedMinutes: 5,
    body: `Petra does not rise from quarried blocks assembled into walls. Instead, much of its most memorable architecture was carved into the rock itself. This reversal changes the way the city is perceived. A facade in Petra is not merely attached to a mountain face; it is the mountain face, shaped into thresholds, columns, and chambers through subtraction rather than construction.

Its fame is often concentrated in the Treasury, yet Petra was also a wider urban and trading landscape. Located near important caravan routes, it connected movement, commerce, and environmental knowledge. Water management was especially important in such a dry region, and the city's survival depended on systems that collected, stored, and directed scarce resources.

The visual drama of Petra comes partly from concealment. Approaching through narrow rock passages creates suspense before the architecture opens into view. This sequence gives the city a theatrical quality, but it also highlights how space can be curated by geology itself.

Petra therefore rewards more than admiration for a famous facade. It invites attention to craft, trade, and infrastructure. The city remains compelling because it transforms harsh terrain into an inhabited design language without pretending the desert is easy.`,
    keyPoints: [
      "Petra's architecture is carved from rock, not assembled in front of it.",
      "Its urban life depended on trade routes and sophisticated water systems.",
      "The approach to Petra uses concealment and reveal as part of the experience.",
    ],
    vocabularyFocus: ["facade", "subtraction", "caravan", "scarce", "geology"],
    questions: [
      "Why does the article say Petra changes the usual idea of construction?",
      "What made water management so important to the city?",
      "How does the approach to Petra shape the visitor's experience?",
    ],
    modelSrc: "/models/landmarks/petra-treasury.glb",
    theme: {
      accent: "#b45309",
      glow: "rgba(180, 83, 9, 0.18)",
      surface: "from-amber-100 via-white to-orange-50",
    },
    cameraPreset: {
      initialPosition: [-0.06, -0.04, 6.15],
      target: [0, -0.08, 0],
      minDistance: 4.8,
      maxDistance: 9.1,
      minPolarAngle: 0.97,
      maxPolarAngle: 2.1,
      minAzimuthAngle: -0.92,
      maxAzimuthAngle: 0.92,
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
    body: `The Colosseum is one of the clearest examples of architecture built around organised spectacle. Its elliptical form, layered seating, and complex entrances were designed to move large crowds efficiently while directing attention toward a central performance space. Even in ruin, the building still communicates the confidence of a city that wanted power to be seen collectively.

Engineering played a crucial role in that effect. Vaults, arches, and circulation routes helped thousands of spectators enter, sit, and leave with surprising order. The structure was not only large; it was operationally intelligent. The building managed bodies, sightlines, and social hierarchy at the same time.

Modern viewers often approach the Colosseum as a romantic ruin, softened by time and tourism. Yet its original function was more difficult. It hosted public entertainment shaped by imperial politics and social control. Admiring the architecture therefore means confronting both technical achievement and the moral complexity of what that achievement supported.

That tension is part of the monument's lasting significance. The Colosseum is compelling not because it is easy to celebrate, but because it reveals how architecture can combine beauty, efficiency, and domination in the same form.`,
    keyPoints: [
      "The Colosseum was designed as an efficient machine for public spectacle.",
      "Its circulation system organized sightlines, crowds, and social rank.",
      "The monument also raises ethical questions about the uses of great architecture.",
    ],
    vocabularyFocus: ["elliptical", "circulation", "spectators", "hierarchy", "domination"],
    questions: [
      "What makes the building more than simply a large arena?",
      "How did architecture help manage spectators inside the Colosseum?",
      "Why does the article describe the monument as morally complex?",
    ],
    modelSrc: "/models/landmarks/colosseum.glb",
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
  },
  {
    id: "angkor-wat",
    slug: "angkor-wat",
    title: "Angkor Wat",
    titleZh: "吴哥窟",
    summary: "A temple complex where scale, symmetry, and cosmology are translated into stone and water.",
    topic: "Temple Complex",
    difficulty: "B2",
    estimatedMinutes: 6,
    body: `Angkor Wat is often admired first for its silhouette: towers rising in sequence above a broad horizontal base, reflected in surrounding water. That image is powerful, but the monument becomes even more compelling when understood as a planned cosmological landscape. Causeways, galleries, courtyards, and bas-reliefs all contribute to a larger symbolic order rather than standing as isolated decorations.

The temple's scale is inseparable from its system of movement. Visitors are drawn forward through long axial routes, then slowed by thresholds, stairs, and enclosed passages. Architecture here is not static scenery. It guides tempo, anticipation, and perception.

Stone carving deepens that effect. The walls preserve extensive narrative reliefs whose detail rewards close reading after the larger form has already impressed the eye. This combination of monumental planning and intimate surface work gives Angkor Wat unusual range. It can be understood from a distance as a whole and from nearby as a field of stories.

Today the site also raises questions about preservation, tourism, and environmental change. Its endurance is remarkable, but that endurance should not be mistaken for invulnerability. Angkor Wat remains great partly because it still asks contemporary visitors to balance admiration with care.`,
    keyPoints: [
      "Angkor Wat works as a symbolic landscape, not just a single temple image.",
      "Its architecture carefully controls movement and tempo.",
      "Monumental form and intricate narrative carving coexist throughout the site.",
    ],
    vocabularyFocus: ["cosmological", "axial", "thresholds", "bas-reliefs", "preservation"],
    questions: [
      "Why does the article describe Angkor Wat as a landscape as well as a building?",
      "How does the temple guide the visitor's pace?",
      "What tension does the modern site create between admiration and care?",
    ],
    modelSrc: "/models/landmarks/angkor-wat.glb",
    theme: {
      accent: "#7c2d12",
      glow: "rgba(124, 45, 18, 0.18)",
      surface: "from-orange-100 via-white to-yellow-50",
    },
    cameraPreset: {
      initialPosition: [-0.04, -0.05, 6.25],
      target: [0, -0.08, 0],
      minDistance: 4.85,
      maxDistance: 9.2,
      minPolarAngle: 0.98,
      maxPolarAngle: 2.1,
      minAzimuthAngle: -0.9,
      maxAzimuthAngle: 0.9,
    },
  },
  {
    id: "taj-mahal",
    slug: "taj-mahal",
    title: "The Taj Mahal",
    titleZh: "泰姬陵",
    summary: "An essay on symmetry, grief, and the disciplined elegance of one of the world's most studied mausoleums.",
    topic: "Mausoleum",
    difficulty: "B2",
    estimatedMinutes: 5,
    body: `The Taj Mahal is frequently described through beauty alone, yet its emotional and architectural power depends on discipline rather than ornament in isolation. Symmetry shapes the entire complex. Gardens, reflecting pools, gateways, and the mausoleum itself work together to produce balance that feels serene rather than cold.

Material choice is central to that experience. White marble changes character with light, moving from soft dawn colour to intense midday brightness and muted evening tone. Inlay work and carved details reward slower looking, but they never overwhelm the total composition. The building remains calm even when richly finished.

The monument is also inseparable from mourning. Built as a funerary complex, it transforms personal loss into a public architectural statement. That origin matters because it changes how elegance is read. The precision is not merely decorative; it gives grief a durable, ceremonial order.

This helps explain why the Taj Mahal continues to feel distinct even among famous landmarks. It is neither simply grand nor simply delicate. Its achievement lies in making emotional weight appear weightless through geometry, material, and extraordinary control of proportion.`,
    keyPoints: [
      "The Taj Mahal's beauty depends on strict overall balance.",
      "Changing light is part of how the marble architecture is experienced.",
      "The monument's emotional meaning comes from its funerary purpose.",
    ],
    vocabularyFocus: ["symmetry", "mausoleum", "inlay", "ceremonial", "proportion"],
    questions: [
      "Why does the article say the building is disciplined rather than merely ornamental?",
      "How does light affect the experience of the marble surfaces?",
      "What does the funerary origin add to the architecture's meaning?",
    ],
    modelSrc: "/models/landmarks/taj-mahal.glb",
    theme: {
      accent: "#0f766e",
      glow: "rgba(15, 118, 110, 0.16)",
      surface: "from-cyan-100 via-white to-teal-50",
    },
    cameraPreset: {
      initialPosition: [0.02, -0.04, 6.18],
      target: [0, -0.08, 0],
      minDistance: 4.8,
      maxDistance: 9.05,
      minPolarAngle: 0.96,
      maxPolarAngle: 2.12,
      minAzimuthAngle: -0.9,
      maxAzimuthAngle: 0.9,
    },
  },
  {
    id: "mont-saint-michel",
    slug: "mont-saint-michel",
    title: "Mont-Saint-Michel",
    titleZh: "圣米歇尔山",
    summary: "A tidal island where monastery, fortification, and settlement compress into one unforgettable vertical composition.",
    topic: "Island Abbey",
    difficulty: "B2",
    estimatedMinutes: 5,
    body: `Mont-Saint-Michel appears almost unreal because its architecture rises directly from an island that changes character with the tide. At one moment it seems attached to the mainland by exposed flats; at another it appears dramatically separate. This unstable setting is part of the monument's identity, shaping both access and imagination.

The built form intensifies that effect through vertical layering. Streets, walls, houses, and the abbey stack upward in compressed sequence, making the site read like a lesson in density. Few places show so clearly how religious, defensive, and civic functions can occupy the same narrow footprint.

Walking through Mont-Saint-Michel means experiencing constant shifts of scale. Tight passages suddenly open to views across water and sky. Heavy stone gives way to light and wind at the summit. These transitions make the island feel larger in experience than in area.

Its continued popularity poses an obvious challenge: how can a fragile, symbolic place remain accessible without being flattened by crowds? Mont-Saint-Michel endures because it is both an image and a real settlement. Preserving that dual identity is part of the work of valuing it.`,
    keyPoints: [
      "Tide is not background scenery at Mont-Saint-Michel; it defines the site.",
      "The island compresses religious, defensive, and civic functions into one form.",
      "Preservation depends on protecting both the image and the lived place.",
    ],
    vocabularyFocus: ["tidal", "compressed", "footprint", "summit", "fragile"],
    questions: [
      "How does the tide affect the meaning of the site?",
      "Why does the architecture feel larger than the island's actual area?",
      "What preservation challenge does tourism create here?",
    ],
    modelSrc: "/models/landmarks/mont-saint-michel.glb",
    theme: {
      accent: "#1d4ed8",
      glow: "rgba(29, 78, 216, 0.16)",
      surface: "from-sky-100 via-white to-blue-50",
    },
    cameraPreset: {
      initialPosition: [0.05, -0.02, 6.22],
      target: [0, -0.06, 0],
      minDistance: 4.85,
      maxDistance: 9.15,
      minPolarAngle: 0.94,
      maxPolarAngle: 2.1,
      minAzimuthAngle: -0.96,
      maxAzimuthAngle: 0.96,
    },
  },
  {
    id: "acropolis",
    slug: "acropolis-of-athens",
    title: "The Acropolis of Athens",
    titleZh: "雅典卫城",
    summary: "An elevated ensemble of temples and civic memory overlooking the city that grew beneath it.",
    topic: "Sacred Hill",
    difficulty: "B2",
    estimatedMinutes: 5,
    body: `The Acropolis is not simply a hill with ancient ruins on top. It is a deliberately staged high ground where architecture, politics, religion, and visibility were brought together. Rising above Athens, the site made certain values legible from afar while also creating a ceremonial destination within the city.

The Parthenon remains its most famous structure, but the wider ensemble matters. Gateways, temples, and terrain all shape the experience of approach. Movement upward is part of the architecture's meaning, preparing the visitor through ascent, framing, and changing perspective.

Time is especially visible at the Acropolis. Damage, restoration, and reinterpretation have all left marks on the site. It therefore stands not as a frozen classical ideal, but as a place repeatedly used to define cultural identity across different eras.

That long afterlife is one reason the Acropolis still matters so much. It is an archaeological site, a national symbol, and a global reference point all at once. Reading it well means recognising both the ancient achievement and the later histories that keep reusing it.`,
    keyPoints: [
      "The Acropolis combines elevation, ceremony, and visibility in one planned setting.",
      "Approach and ascent are part of the site's architectural meaning.",
      "Its significance includes both ancient building and later historical reuse.",
    ],
    vocabularyFocus: ["ensemble", "ceremonial", "ascent", "reinterpretation", "archaeological"],
    questions: [
      "Why does the article say the Acropolis is more than ruins on a hill?",
      "How does movement toward the site shape its meaning?",
      "What later histories remain visible at the Acropolis?",
    ],
    modelSrc: "/models/landmarks/acropolis.glb",
    theme: {
      accent: "#7c3aed",
      glow: "rgba(124, 58, 237, 0.16)",
      surface: "from-violet-100 via-white to-indigo-50",
    },
    cameraPreset: {
      initialPosition: [-0.08, -0.04, 6.12],
      target: [0, -0.08, 0],
      minDistance: 4.8,
      maxDistance: 9,
      minPolarAngle: 0.97,
      maxPolarAngle: 2.12,
      minAzimuthAngle: -0.94,
      maxAzimuthAngle: 0.94,
    },
  },
  {
    id: "alhambra",
    slug: "alhambra",
    title: "The Alhambra",
    titleZh: "阿尔罕布拉宫",
    summary: "A palace and fortress complex where light, water, and ornament shape a refined architectural atmosphere.",
    topic: "Palace Complex",
    difficulty: "B2",
    estimatedMinutes: 5,
    body: `The Alhambra is remarkable not because it overwhelms the visitor with scale, but because it demonstrates how atmosphere can become architecture. Courtyards, arcades, inscriptions, water channels, and filtered light work together to produce an environment of calm precision. The effect is immersive without being heavy.

Its ornament deserves close attention because it is structural to the experience rather than secondary decoration. Pattern, carved stucco, tile, and calligraphy build surfaces that feel intellectually ordered as well as sensuous. Repetition does not flatten the space; it gives rhythm to looking.

Water is another essential design material at the Alhambra. Pools reflect buildings, channels guide the eye, and sound softens transitions between rooms and gardens. These choices create a palace complex that depends as much on perception as on walls.

The Alhambra also embodies layered history. Built and transformed across different political periods, it cannot be reduced to one simple identity. That complexity strengthens the site. It remains compelling because beauty here is inseparable from memory, adaptation, and historical change.`,
    keyPoints: [
      "The Alhambra shows how atmosphere can be designed with great precision.",
      "Ornament, light, and water are central rather than optional elements.",
      "Its beauty is deepened by a long, layered historical life.",
    ],
    vocabularyFocus: ["arcades", "calligraphy", "sensuous", "perception", "layered"],
    questions: [
      "Why does the article say atmosphere itself becomes architecture here?",
      "What role does water play in the design experience?",
      "How does layered history affect the meaning of the Alhambra?",
    ],
    modelSrc: "/models/landmarks/alhambra.glb",
    theme: {
      accent: "#be185d",
      glow: "rgba(190, 24, 93, 0.16)",
      surface: "from-rose-100 via-white to-pink-50",
    },
    cameraPreset: {
      initialPosition: [0.06, -0.03, 6.16],
      target: [0, -0.08, 0],
      minDistance: 4.82,
      maxDistance: 9.08,
      minPolarAngle: 0.95,
      maxPolarAngle: 2.11,
      minAzimuthAngle: -0.94,
      maxAzimuthAngle: 0.94,
    },
  },
  {
    id: "chichen-itza",
    slug: "chichen-itza",
    title: "Chichen Itza",
    titleZh: "奇琴伊察",
    summary: "A Mesoamerican ceremonial center where astronomy, authority, and stone geometry meet in public form.",
    topic: "Ceremonial Center",
    difficulty: "B2",
    estimatedMinutes: 5,
    body: `Chichen Itza is often reduced to one image: the stepped pyramid known as El Castillo. That structure is indeed striking, but the wider site matters because it reveals an urban and ceremonial landscape shaped by calculation, ritual, and political authority. Architecture here organized collective attention on a civic scale.

Geometry is one of the site's most memorable qualities. Terraces, stairs, and strict profiles create clear visual order, while alignments have long encouraged discussion about astronomical observation and symbolic timing. Even for visitors without specialist knowledge, the architecture communicates intention with unusual force.

The site also reminds us that public monuments can perform many kinds of power at once. Ceremonial meaning, social gathering, and the display of control were not separate categories. They were fused in buildings designed to be seen, approached, and remembered.

Today Chichen Itza stands within broader conversations about conservation, tourism, and the interpretation of Indigenous histories. Its importance lies not only in age or fame, but in the disciplined clarity with which built form can shape public imagination across centuries.`,
    keyPoints: [
      "Chichen Itza is a broader ceremonial landscape, not just one pyramid.",
      "Its geometry communicates authority and intention with great clarity.",
      "Modern interpretation must connect conservation with Indigenous history.",
    ],
    vocabularyFocus: ["ceremonial", "profiles", "alignments", "Indigenous", "conservation"],
    questions: [
      "Why is the site more than the image of one pyramid?",
      "How does geometry contribute to the power of the architecture?",
      "What present-day responsibilities does the article connect to the site?",
    ],
    modelSrc: "/models/landmarks/chichen-itza.glb",
    theme: {
      accent: "#15803d",
      glow: "rgba(21, 128, 61, 0.16)",
      surface: "from-green-100 via-white to-emerald-50",
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
];

export function getFeaturedArticleBySlug(slug: string) {
  return FEATURED_DEMO_ARTICLES.find((article) => article.slug === slug);
}

export const FEATURED_MODEL_SRCS = Array.from(
  new Set(FEATURED_DEMO_ARTICLES.map((article) => article.modelSrc))
);
