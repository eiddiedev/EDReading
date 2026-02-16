# EDReading AI 上下文指南

本文档为在本项目中工作的 AI 代理提供高级上下文、架构决策和编码规范。

## 1. 项目概览
EDReading 是一个专注于英语阅读理解的学习应用。它允许用户导入文章（文本、RSS 等），利用 AI 分析文章（词汇、句法结构），并使用间隔重复系统（SRS）复习词汇。

## 2. 技术栈

### 核心框架
- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **UI 库**: React 19
- **样式**: Tailwind CSS

### 状态管理
- **客户端状态**: Zustand (`lib/stores/`)。**除非必要，否则不要使用 Redux 或 React Context 进行全局状态管理。**
- **服务端状态**: 尽可能使用 React Server Components (RSC) 进行初始数据获取。

### 后端与数据库
- **BaaS (后端即服务)**: Supabase (PostgreSQL, Auth, Realtime)。
- **数据库交互**:
  - 使用 `@supabase/supabase-js` 和 `@supabase/ssr`。
  - **RLS (行级安全策略)** 默认开启。始终处理用户认证上下文。

### AI 集成
- **提供商**: OpenAI / DeepSeek (可配置)。
- **端点**: `app/api/ai/*` 和 `app/api/generate-ielts`。
- **逻辑**: AI 逻辑通常应封装在 API 路由或 Server Actions 中，以保护 API Key。

### 关键库
- **UI 组件**: `lucide-react` (图标), `framer-motion` (动画), `sonner` (Toast 提示)。
- **阅读器**: `react-reader` (EPUB), `@mozilla/readability` (文章解析)。
- **工具类**: `compromise` (NLP), `idb` (IndexedDB 本地存储)。

## 3. 架构与数据流

### 数据流模式
1.  **用户操作**: 用户点击“分析”或“保存”。
2.  **状态更新**: Zustand store 更新乐观 UI (Optimistic UI)。
3.  **API 调用**: 发送请求到 Next.js API 路由 (`app/api/...`)。
4.  **后端逻辑**: API 路由调用 Supabase 或 AI 提供商。
5.  **数据库更新**: Supabase 更新 PostgreSQL。
6.  **响应**: API 返回数据，Zustand store 确认更新。

### 目录结构
- `app/`: Next.js App Router 页面和 API 端点。
- `components/`: React 组件。
  - `ui/`: 通用 UI 组件（按钮、输入框）。
  - `notebook/`, `settings/`: 特定功能组件。
- `lib/`: 工具库。
  - `stores/`: Zustand stores。
  - `utils/`: 辅助函数。
- `types/`: 共享 TypeScript 接口 (`index.ts`)。

## 4. 编码规范

### TypeScript
- **严格模式**: 已启用。避免使用 `any`。
- **接口**: 在 `types/index.ts` 中定义共享模型。
- **Props**: 组件 Props 使用 `interface Props` 定义。

### 样式
- **Tailwind**: 使用工具类。使用 `cn()` (来自 `lib/utils`) 处理条件类名。
- **暗色模式**: 所有新组件必须支持暗色模式（使用 `dark:` 修饰符）。

### AI 生成规则
- **响应格式**: AI 生成 JSON 时，确保严格的模式验证（通常手动处理或使用 `zod`）。
- **错误处理**: AI 路由必须优雅地处理超时和速率限制。
