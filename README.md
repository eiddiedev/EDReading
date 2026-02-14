# EDReading

EDReading 是一款面向雅思阅读场景的英语阅读与词汇记忆应用。它提供高质量的 EPUB 阅读体验、划词查义与句子语法/翻译分析、AI 词典/短语/语法能力，以及基于艾宾浩斯曲线的复习机制。

## 功能特性

- 资料库与书架：导入/管理文章与电子书，记录阅读进度
- EPUB 阅读器：基于 react-reader/epubjs，优化移动端点击取词与框选长句
- 划词查义：
  - 本地快速词库秒开（常见/雅思核心词），离线可用
  - AI 词典与短语解释（中文释义、音标、例句/翻译、标签）
- 句子分析：SVO/语法提示 + 中文翻译 + 关键词抽取（支持本地 NLP 兜底）
- 生词本与复习：Zustand 持久化 + 简洁 SRS 阶段推进
- 账号会话与云端：基于 Supabase 统一处理鉴权与数据，服务端缓存/落库 AI 词条
- PWA 元数据与主题：良好的移动端体验与主题适配

## 技术栈

- Web 框架：Next.js 14（App Router, Route Handlers）
- 前端：React 18、TypeScript、TailwindCSS、framer-motion、lucide-react
- 状态管理：Zustand（多 slice + persist）
- 内容解析/阅读：react-reader、epubjs、@mozilla/readability
- 后端服务：Supabase（身份、数据库、RLS、边缘执行）
- AI 接入：OpenAI 或 DeepSeek（服务端调用，带本地 NLP/词库兜底）
- 其他：idb、rss-parser、html2canvas 等

## 目录结构（节选）

```
app/
  (dashboard)/
    ai-hub/       # AI 工具集合
    bookshelf/    # 书架
    library/      # 资料库
    notebook/     # 生词/复习
    portal/       # 外链门户
    reader/[id]/  # 阅读器页
    settings/     # 设置
    layout.tsx    # 仪表盘布局（侧边栏/底栏/公告）
  api/
    ai/route.ts                 # 统一 AI 本地兜底接口
    analyze-selection/route.ts  # 查词/短语/句子分析（带 Supabase 缓存）
components/
  EpubReader.tsx           # EPUB 阅读器（移动端点击取词/长句分析入口）
  ImmersiveReader.tsx
  DictionaryModal.tsx 等
lib/
  store.ts                  # Zustand 根 store
  stores/*.ts               # 各功能 slice
  ai.ts                     # 前端调用 /api/ai 的便捷函数
  local-dictionary.ts       # 本地高频/学术词库（秒开）
  utils/srs.ts              # 复习间隔计算
  supabase.ts               # Supabase 客户端
  safety.ts                 # 内容安全检查
supabase/
  migrations/*.sql          # 数据表/索引/RLS/限流迁移脚本
public/                     # 图标与捐助二维码
```

## 快速开始

### 环境要求

- Node.js 18+
- Supabase 项目（用于鉴权与数据库）
- 可选 AI Key（OpenAI 或 DeepSeek，未配置将使用本地兜底）

### 安装依赖

```bash
npm install
```

### 配置环境变量

在项目根目录创建 `.env.local`：

```bash
# 必填：Supabase 公共端点与 anon key（客户端与中间件使用）
NEXT_PUBLIC_SUPABASE_URL=你的SupabaseURL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的SupabaseAnonKey

# 仅服务端使用：用于在服务端写入缓存词典（切勿前端暴露）
SUPABASE_SERVICE_ROLE_KEY=你的ServiceRoleKey

# 任选其一：AI 服务（未配置将走本地 NLP/词库兜底）
# OpenAI 方案
AI_API_KEY=sk-xxxx
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-3.5-turbo

# 或 DeepSeek 方案
# DEEPSEEK_API_KEY=sk-xxxx
# AI_BASE_URL=https://api.deepseek.com
# AI_MODEL=deepseek-chat
```

说明：
- 以 `NEXT_PUBLIC_` 开头的变量会在客户端可见；Service Role Key 仅在服务端 Route Handlers 使用，勿泄露。
- 未配置任意 AI Key 时，系统将使用 compromise 与本地词库提供兜底能力。

### 初始化数据库（Supabase）

- 打开 Supabase SQL Editor，将 `supabase/migrations` 以及根目录下的 `*.sql`（如 `fix_supabase_schema.sql`、`upgrade_articles_schema.sql` 等）按需执行，创建所需表、RLS、索引与限流策略。
- 若需启用查词缓存，请确保存在 `public_dictionary` 表（迁移脚本已包含定义）。

### 启动开发

```bash
npm run dev
```

访问：http://localhost:3000

### 构建与生产

```bash
npm run build
npm start
```

## 开发脚本

- `npm run dev`：启动本地开发服务
- `npm run build`：构建生产包
- `npm start`：启动生产服务
- `npm run lint`：运行 ESLint（构建阶段忽略错误）

## 环境变量说明

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`：客户端与 SSR 会话/数据访问
- `SUPABASE_SERVICE_ROLE_KEY`：服务端写库（如缓存词典），仅服务端使用
- `AI_API_KEY` 或 `DEEPSEEK_API_KEY`：大模型 API Key（至少其一）
- `AI_BASE_URL` / `AI_MODEL`：大模型网关与模型名（可选）

## 关键模块

- 会话与中间件：`app/(dashboard)/layout.tsx`、`middleware.ts`（自动刷新会话，异常时安全登出）
- 阅读器：`components/EpubReader.tsx`（移动端轻点取词、长句分析抽屉）
- AI 接口：`app/api/ai/route.ts`（本地兜底）、`app/api/analyze-selection/route.ts`（查词/短语/句子分析，带超时与缓存）
- 状态管理：`lib/store.ts` 与 `lib/stores/*`（Zustand 多 slice 合并与持久化）
- 复习算法：`lib/utils/srs.ts`（基于阶段间隔的下一次复习时间与掌握度）

## 安全与隐私

- 严禁在客户端暴露服务端密钥（如 Service Role Key）。
- 服务端 Route Handlers 中读取服务端专用变量，避免泄露。
- 未配置 AI Key 时，应用仍可运行但 AI 能力受限。

## 贡献与反馈

欢迎提交 Issue 或 PR 来帮助改进 EDReading。对于功能建议、Bug 反馈与文档补充，均非常欢迎。

