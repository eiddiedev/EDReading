# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EDReading is an English reading comprehension app for IELTS learners. It provides EPUB reading, word lookup with AI dictionary, sentence analysis, and spaced repetition system (SRS) vocabulary review.

## Development Commands

```bash
npm run dev      # Start dev server with Turbopack
npm run build    # Production build
npm start        # Start production server (binds 0.0.0.0:3000)
npm run lint     # Run ESLint
npm run lint:fix # Fix ESLint issues
npm audit        # Check dependency vulnerabilities (full tree)
npm audit --omit=dev  # Check production dependencies only
```

No test framework is configured yet.

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Frontend**: React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide React
- **3D Rendering**: Three.js via `@react-three/fiber` + `@react-three/drei`, with `@chenglou/pretext` for text-in-3D layout
- **State Management**: Zustand with persist middleware (see `lib/store.ts`)
- **Toasts**: `sonner` (SonnerToastProvider in dashboard layout)
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **AI**: OpenAI or DeepSeek with local fallback via Compromise NLP
- **Path alias**: `@/*` maps to `./*` (configured in tsconfig.json)

### Directory Structure
- `app/` - Next.js App Router pages and API routes
  - `(dashboard)/` - Main app pages (bookshelf, library, notebook, reader, settings, ai-hub, portal)
  - `(featured)/` - Featured article 3D reading experience (separate route group with own layout)
  - `api/` - Route handlers (ai, analyze-selection, dictionary, chat, extract-article, feeds, etc.)
- `features/` - Feature-based modules (self-contained feature code)
  - `featured/` - 3D featured article: types, content configs, 3D scene engine, article experience
- `components/` - Shared React components (EpubReader, DictionaryModal, Navigation, ImmersiveReader, etc.)
- `hooks/` - Custom React hooks (useHaptic, useArticles, use-data-sync)
- `lib/` - Core utilities
  - `stores/` - Zustand slices (auth, article, review, settings, announcement)
  - `featured/` - Featured article demo content (server-safe, no 3D imports)
  - `utils/` - Utility functions including `srs.ts` (spaced repetition), `cn()` helper
  - `supabase.ts` / `supabase-server.ts` / `supabase-admin.ts` - Supabase clients
  - `ai.ts` / `ai-processor.ts` / `ai-stream.ts` - AI call handling
  - `dictionary.ts` / `vocab-engine.ts` / `ielts-vocabulary.ts` - Word lookup and vocabulary management
  - `rate-limit.ts` - Server-side rate limiting for API routes
  - `safety.ts` - Content safety checks
- `types/index.ts` - Shared TypeScript interfaces (Article, VocabularyWord, etc.)
- `supabase/migrations/` - Database migration SQL files

### Key Patterns

**Feature Modules (`features/`)**: Self-contained features with their own types, content, and UI. The `featured/` module implements a 3D article reading experience using Three.js + `@chenglou/pretext` for text reflow around 3D model outlines. Import 3D dependencies only in client components (use `"use client"` directive). Keep server-safe code (types, content configs) separate from 3D rendering code.

**Zustand Store Slices**: State is split into slices (`createAuthSlice`, `createArticleSlice`, `createReviewSlice`, `createSettingsSlice`, `createAnnouncementSlice`) and merged in `lib/store.ts`. Each slice follows the `StateCreator` pattern. Types are defined in `lib/stores/types.ts`.

**Optimistic UI Updates**: Store actions update local state immediately, then sync to Supabase. On failure, revert the local change and show a toast error via `sonner`.

**SRS Algorithm**: `lib/utils/srs.ts` implements day-based review intervals [1, 2, 4, 7, 15, 30 days] with a 4 AM refresh boundary. Failed reviews reset to stage 0.

**AI Fallback**: API routes like `app/api/ai/route.ts` attempt LLM calls first, then fall back to local NLP (Compromise) if no API key or on error.

**Supabase Auth**: Client uses `@supabase/ssr` with cookie persistence. Server client handles session in route handlers. RLS is enabled on all tables. Cookie options are centralized in `lib/supabase-cookie-options.ts` for self-hosted server compatibility.

**Rate Limiting**: `lib/rate-limit.ts` provides per-user/IP rate limiting for API routes, enforced via Supabase.

### API Routes
- `POST /api/ai` - Unified AI endpoint (extract_phrases, analyze_sentence, lookup_word)
- `POST /api/ai-analyze` - AI-powered text analysis
- `POST /api/analyze-selection` - Word/phrase/sentence analysis with Supabase caching
- `POST /api/dictionary/lookup` - Dictionary lookup
- `POST /api/chat` - AI conversation
- `POST /api/extract-article` - Article content extraction (Readability)
- `GET /api/feeds` - RSS feed aggregation
- `POST /api/generate-ielts` - IELTS article generation
- `POST /api/import-article` - Article import
- `POST /api/batch-process-words` - Batch vocabulary processing
- `GET /api/community` - Community-shared articles

### Database Tables (see `supabase/migrations/`)
- `articles` - User articles with AI analysis
- `vocabulary` - User vocabulary with SRS fields
- `profiles` - User quotas and device tracking
- `announcements` - Global announcements
- `chat_messages` - Chat history

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Client auth
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side operations (never expose to client)
- `AI_API_KEY` or `DEEPSEEK_API_KEY` - AI provider (optional, falls back to local NLP)
- `AI_BASE_URL` / `AI_MODEL` - AI configuration (optional)

## Coding Notes

- Use Zustand for global state, not Redux or React Context
- All new components must support dark mode with `dark:` Tailwind modifiers
- Use `cn()` from `lib/utils` for conditional class merging
- Protect API keys in server-side route handlers, never expose to client
- SRS "logical day" boundary is 4:00 AM, not midnight
- Use `"use client"` directive for components that need browser APIs or 3D rendering
- 3D code (Three.js, @react-three/fiber, @chenglou/pretext) must only run on the client
- `sonner` is globally available for toast notifications (initialized in dashboard layout)
