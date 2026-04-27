# EDReading 代码优化方案

## 一、总览

基于对代码库的全面审计，从**性能、打包体积、代码质量**三个维度梳理出以下优化项。每个条目包含具体文件路径、问题描述、优化方案和预估工作量。

| 优先级 | 数量 | 影响范围 |
|--------|------|----------|
| P1 性能 | 5 项 | 核心阅读体验、交互响应 |
| P2 体积 | 4 项 | 首屏加载、非必要依赖 |
| P3 质量 | 5 项 | 可维护性、多端一致性 |

---

## 二、P1 — 性能优化

### 2.1 拆分 ImmersiveReader.tsx（1179 行）

**文件**: `components/ImmersiveReader.tsx`

**问题**:
- 27 个 `useState`，任何状态变化触发全量重渲染
- `renderContent()` 未用 `useMemo` 包裹，每次渲染重新遍历整篇文章内容生成 JSX
- 渲染循环内每个 `<span>` 都创建新的内联箭头函数 `onClick={(e) => { handleWordClick(word, start) }}`
- 句子分析 UI（流式加载骨架屏 + 结果渲染）在同一组件内重复了 3 次（流式预览 924-1004 行、单词结果 1015-1061 行、句子结果 1062-1141 行）
- `selectionchange` 事件在长文章上高频触发，600ms 防抖不足以消除卡顿

**方案**:

1. **提取 `renderContent` 为独立组件 `<ArticleContent>`**，用 `React.memo` 包裹，仅在 `content`、`wordLevels`、`phraseMatchMap`、`highlightedWord` 变化时重渲染。

2. **提取句子分析 UI 为共享组件 `<SentenceAnalysisResult>`**，接收 `streamText` / `result` 两个 props，内部处理流式预览和最终结果两种状态。该组件同时替换 EpubReader.tsx 和 AnalysisModal.tsx 中的重复代码。

3. **提取底部抽屉为 `<AnalysisBottomSheet>`**，将 `isSheetOpen`、`selectedText`、分析状态等封装在内，减少父组件状态数量。

4. **将内联 onClick 改为 data 属性 + 事件委托**：
   ```tsx
   // 之前：每个 span 一个箭头函数
   <span onClick={(e) => { handleWordClick(word, start) }}>{word}</span>

   // 之后：通过 data 属性 + 父容器统一监听
   <span data-word={word} data-start={start}>{word}</span>
   // 父容器用一个 useCallback 处理所有点击
   ```

5. **目标**: 组件行数从 1179 降至 ~400 行，拆分为 4-5 个独立文件。

**预估工作量**: 2-3 天

---

### 2.2 提取重复的句子分析渲染组件

**影响文件**:
- `components/ImmersiveReader.tsx`（流式预览 + 单词结果 + 句子结果，3 处）
- `components/EpubReader.tsx`（流式预览 + 句子结果，2 处）
- `components/AnalysisModal.tsx`（独立弹窗版本）

**问题**: 翻译展示、SVO 结构标签（S:/V:/O: 三色 badge）、重点词汇列表、重要短语列表的 JSX 结构在 5 处几乎是逐行复制。

**方案**:
```tsx
// components/SentenceAnalysisResult.tsx
interface Props {
  streamText?: string;        // 流式文本（展示实时预览）
  result?: SentenceAnalysis;  // 最终结果
  isLoading: boolean;
}

export const SentenceAnalysisResult = React.memo(function SentenceAnalysisResult({
  streamText,
  result,
  isLoading,
}: Props) {
  const preview = getSentenceAnalysisPreview(streamText || "");
  const data = result || preview;

  if (isLoading && !data) return <Skeleton />;
  if (!data) return null;

  return (
    <div className="space-y-5">
      {data.translation && <TranslationBlock text={data.translation} />}
      {data.structure && <GrammarBlock structure={data.structure} explanation={data.grammarExplanation} />}
      {data.vocabulary?.length > 0 && <VocabularyList words={data.vocabulary} />}
      {data.importantPhrases?.length > 0 && <PhraseList phrases={data.importantPhrases} />}
    </div>
  );
});
```

**预估工作量**: 1 天

---

### 2.3 为高频渲染组件添加 React.memo

**问题**: 全项目 `React.memo` 使用次数为 0。

**需要 memo 的组件**:

| 组件 | 文件 | 原因 |
|------|------|------|
| `ArticleCard` | `components/ArticleCard.tsx` (193 行) | 在 library 页的 `.map()` 中渲染，父组件频繁状态变化 |
| `DictionaryModal` | `components/DictionaryModal.tsx` (426 行) | 父组件 ImmersiveReader 高频重渲染 |
| `WordCardModal` | `components/WordCardModal.tsx` (312 行) | 同上 |
| `SimpleDictionaryModal` | `components/SimpleDictionaryModal.tsx` | EpubReader 中同理 |

**方案**:
```tsx
// ArticleCard.tsx — 只在这些 props 变化时才重渲染
export const ArticleCard = React.memo(function ArticleCard({ article, onDelete, onToggleRead, onAdd, onAdminDelete, onClick }: Props) {
  // ...
});
```

**预估工作量**: 0.5 天

---

### 2.4 修复 Audio 内存泄漏

**影响文件**:
- `components/DictionaryModal.tsx` 第 76、84 行
- `components/notebook/ReviewSession.tsx` 第 77 行

**问题**: `new Audio(url).play()` 未在组件卸载时暂停和释放。

**方案**:
```tsx
useEffect(() => {
  const audio = new Audio(url);
  audio.play().catch(() => {});
  return () => {
    audio.pause();
    audio.src = "";
  };
}, [url]);
```

**预估工作量**: 0.5 天

---

### 2.5 去掉 library 页的 1 秒轮询

**文件**: `app/(dashboard)/library/page.tsx` 第 198 行

**问题**:
```ts
const timer = setInterval(updateGeneratingIds, 1000); // 每秒读 localStorage
```
持续轮询 `localStorage.getItem("generating_article_ids")`，浪费主线程资源。

**方案**: 利用 Zustand store 事件驱动。在 `createArticleSlice` 的 `addArticle` 中直接更新 `generatingIds` 状态，页面通过 store 订阅获取，无需轮询。

**预估工作量**: 0.5 天

---

## 三、P2 — 打包体积优化

### 3.1 Three.js / @react-three 动态导入

**影响文件**: `features/featured/article/FeaturedArticleExperience.tsx` 及所有导入 three.js 的文件

**问题**: `three`（~600KB）、`@react-three/fiber`、`@react-three/drei` 仅用于精选文章 3D 页面，但目前只要导入链存在就会被打包。

**方案**:
```tsx
// app/(featured)/featured/[slug]/page.tsx
import dynamic from "next/dynamic";

const FeaturedArticleExperience = dynamic(
  () => import("@/features/featured/article/FeaturedArticleExperience"),
  { ssr: false, loading: () => <FeaturedArticleLoadingSkeleton /> }
);
```

`pretext-engine.ts` 和 `useFeaturedPretextScene.ts` 作为 `FeaturedArticleExperience` 的内部依赖会自动跟随动态导入，无需额外处理。

**预估工作量**: 0.5 天

---

### 3.2 compromise NLP 按需导入

**文件**: `lib/dictionary.ts` 第 298 行附近

**问题**: `compromise`（~200KB）在模块顶层导入，即使从未使用句子分析功能的页面也会加载。

**方案**:
```ts
// 之前：顶层静态导入
import nlp from "compromise";

// 之后：函数内动态导入
async function analyzeSentence(text: string) {
  const nlp = (await import("compromise")).default;
  // ...
}
```
或者首屏跳过 NLP，完全依赖 AI 接口，仅在 AI 不可用时才加载 compromise 作为兜底。

**预估工作量**: 0.5 天

---

### 3.3 WordCardModal 懒加载

**文件**: `components/WordCardModal.tsx`

**问题**: `html2canvas`（~1.5MB）仅用于 WordCardModal 的生词卡片导出功能，但组件不是懒加载的。

**方案**:
```tsx
// 在 ImmersiveReader.tsx 中
const WordCardModal = dynamic(() => import("./WordCardModal").then(m => m.WordCardModal));
```

**预估工作量**: 0.5 天

---

### 3.4 framer-motion 替代方案评估

**现状**: `framer-motion`（dist 目录 ~5.3MB）被 19 个文件导入，包括 `template.tsx` 中的页面过渡动画。

**方案**（渐进式）:
1. 简单的 fade/slide 动画改用 CSS `@starting-style` + `transition`（2024+ 浏览器已广泛支持）
2. 复杂的拖拽、弹簧动画（底部抽屉）保留 framer-motion
3. 将 `template.tsx` 中的页面过渡改为 CSS animation

**预期收益**: 在非 3D 页面减少 ~30KB JS 解析开销。

**预估工作量**: 1 天（可选，收益中等）

---

## 四、P3 — 代码质量优化

### 4.1 提取共享工具函数，消除跨文件重复

**影响文件**:
- `app/actions.ts` 第 24-53 行
- `app/api/generate-ielts/route.ts` 第 72-101 行

**重复代码**: `shuffle`、`flattenWords`、`pickMandatoryKeywords` 三个函数完全重复。

**方案**: 在 `lib/utils.ts` 或新文件 `lib/vocab-utils.ts` 中定义一次，两处导入使用。

**预估工作量**: 0.5 天

---

### 4.2 统一词汇表字段映射

**影响文件**:
- `lib/stores/createReviewSlice.ts` 第 288-304 行
- `app/(dashboard)/notebook/page.tsx` 第 47-63 行
- `hooks/use-data-sync.ts` 第 87-98 行
- `features/featured/article/useFeaturedPretextScene.ts`

**问题**: Supabase `vocabulary` 表字段（`word_count` → `wordCount`、`created_at` → `createdAt` 等）映射逻辑在 4 处重复。

**方案**:
```ts
// lib/vocab-mapper.ts
export function mapVocabularyRow(row: Record<string, any>): VocabularyWord {
  return {
    id: String(row.id),
    word: row.word,
    phonetic: row.phonetic,
    definition: row.definition,
    example: row.example,
    exampleTranslation: row.example_translation,
    reviewCount: row.review_count ?? 0,
    correctCount: row.correct_count ?? 0,
    createdAt: row.created_at ?? new Date().toISOString(),
    // ...
  };
}
```

**预估工作量**: 0.5 天

---

### 4.3 修复 useArticles hook 的闭包陷阱

**文件**: `hooks/useArticles.ts`

**问题**: `fetchArticles` 的依赖数组包含 `articles`、`hasMore`、`page`（来自 store 订阅），导致每次这些值变化时 `fetchArticles` 引用改变，触发 `useEffect` 重新执行。作为 workaround，`restoreLocalArticles`（第 152 行）被迫使用 `useAppStore.getState()` 绕过闭包。

**方案**: 在 `fetchArticles` 内部直接通过 `useAppStore.getState()` 读取当前值，而不是通过闭包捕获。这样可以从依赖数组中移除 `articles`、`hasMore`、`page`。

**预估工作量**: 0.5 天

---

### 4.4 给 fire-and-forget 异步调用添加错误处理

**影响文件**:
- `lib/stores/createArticleSlice.ts`
- `lib/stores/createAuthSlice.ts`
- `lib/stores/createReviewSlice.ts`

**问题**: 大量 `void (async () => { ... })()` 模式，如果异步操作失败，Promise 拒绝未被捕获。

**方案**: 统一使用 `.catch()` 或添加全局 unhandled rejection 处理器：
```ts
// 之前
void (async () => {
  await supabase.from("articles").insert(...);
})();

// 之后
void (async () => {
  await supabase.from("articles").insert(...);
})().catch((err) => {
  console.error("Failed to sync article:", err);
});
```

**预估工作量**: 0.5 天

---

### 4.5 修复 AnalysisModal 响应式检测

**文件**: `components/AnalysisModal.tsx` 第 27 行

**问题**:
```ts
const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
```
这是模块级代码，只在首次解析时执行一次。窗口大小变化后值不变。

**方案**: 改用 `useState` + `resize` 事件监听，或使用 `useMediaQuery` hook。

**预估工作量**: 0.5 天

---

## 五、执行建议

### 推荐执行顺序

```
第 1 周：P1 性能
  ├─ Day 1-2: 拆分 ImmersiveReader.tsx (2.1)
  ├─ Day 3:   提取 SentenceAnalysisResult 组件 (2.2)
  ├─ Day 4:   添加 React.memo (2.3)
  └─ Day 4-5: 修复 Audio 泄漏 + 去掉轮询 (2.4, 2.5)

第 2 周：P2 体积 + P3 质量
  ├─ Day 1-2: 动态导入 3D / compromise / WordCardModal (3.1-3.3)
  ├─ Day 3:   提取共享工具 + 统一字段映射 (4.1, 4.2)
  ├─ Day 4:   修复 useArticles 闭包 + fire-and-forget (4.3, 4.4)
  └─ Day 5:   修复 AnalysisModal + framer-motion 评估 (4.5, 3.4)
```

### 每项完成后的验证方式

| 验证项 | 方法 |
|--------|------|
| 重渲染次数 | React DevTools Profiler，确认 `React.memo` 生效 |
| 打包体积 | `npm run build` 后分析 `.next/` 输出 |
| 内存泄漏 | Chrome DevTools Memory Profiler，快速点击 20 次后检查 Audio 实例数 |
| 功能回归 | 手动测试：点击查词、框选句子分析、EPUB 阅读、3D 精选文章页面 |

### 风险提示

- ImmersiveReader 拆分是最大改动，建议分步提交、每步可单独回滚
- Three.js 动态导入已在 `EpubReader` 中有先例（`next/dynamic`），模式成熟
- `compromise` 按需导入后，AI 接口不可用时才加载，离线场景需验证
