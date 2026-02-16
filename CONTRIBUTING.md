# EDReading 贡献指南

## 快速开始

### 前置要求
- Node.js (推荐最新的 LTS 版本)
- npm

### 安装
1.  克隆仓库。
2.  安装依赖：
    ```bash
    npm install
    ```

### 环境配置
在根目录下创建一个 `.env.local` 文件。你需要配置以下密钥：
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **AI 提供商**: `OPENAI_API_KEY` (或兼容的提供商)

### 开发
运行开发服务器：
```bash
npm run dev
```
在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

## 代码结构
- **页面**: 位于 `app/` 目录下。
- **组件**: 位于 `components/` 目录下。遵循原子设计原则（宽松执行）。
- **状态**: 全局状态请查看 `lib/stores/`。

## 编码标准
- **命名**: 组件使用 PascalCase（大驼峰），函数/变量使用 camelCase（小驼峰）。
- **提交信息**: 使用语义化提交消息（例如：`feat: add vocabulary review`, `fix: header layout`）。
- **格式化**: 代码应保持格式化（已配置 Prettier/ESLint）。

## 部署
本项目设计为部署在 Vercel 或任何兼容 Next.js 的托管平台上。
