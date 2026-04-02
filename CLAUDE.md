# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EDReading is an English reading comprehension app for IELTS learners. It provides EPUB reading, word lookup with AI dictionary, sentence analysis, and spaced repetition system (SRS) vocabulary review.

## Development Commands

```bash
npm run dev      # Start dev server with Turbopack
npm run build    # Production build
npm start        # Start production server
npm run lint     # Run ESLint
npm run lint:fix # Fix ESLint issues
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Frontend**: React 19, TypeScript, Tailwind CSS, Framer Motion
- **State Management**: Zustand with persist middleware (see `lib/store.ts`)
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **AI**: OpenAI or DeepSeek with local fallback via Compromise NLP

### Directory Structure
- `app/` - Next.js App Router pages and API routes
  - `(dashboard)/` - Main app pages (bookshelf, library, notebook, reader, settings)
  - `api/` - Route handlers (ai, analyze-selection, dictionary, chat, etc.)
- `components/` - React components (EpubReader, DictionaryModal, Navigation, etc.)
- `lib/` - Core utilities
  - `stores/` - Zustand slices (auth, article, review, settings)
  - `utils/srs.ts` - Spaced repetition algorithm
  - `supabase.ts` / `supabase-server.ts` - Client/server Supabase clients
- `types/index.ts` - Shared TypeScript interfaces (Article, VocabularyWord, etc.)

### Key Patterns

**Zustand Store Slices**: State is split into slices (`createAuthSlice`, `createArticleSlice`, `createReviewSlice`, `createSettingsSlice`, `createAnnouncementSlice`) and merged in `lib/store.ts`. Each slice follows the `StateCreator` pattern.

**Optimistic UI Updates**: Store actions update local state immediately, then sync to Supabase. On failure, revert the local change and show a toast error.

**SRS Algorithm**: `lib/utils/srs.ts` implements day-based review intervals [1, 2, 4, 7, 15, 30 days] with a 4 AM refresh boundary. Failed reviews reset to stage 0.

**AI Fallback**: API routes like `app/api/ai/route.ts` attempt LLM calls first, then fall back to local NLP (Compromise) if no API key or on error.

**Supabase Auth**: Client uses `@supabase/ssr` with cookie persistence. Server client handles session in route handlers. RLS is enabled on all tables.

### API Routes
- `POST /api/ai` - Unified AI endpoint (extract_phrases, analyze_sentence, lookup_word)
- `POST /api/analyze-selection` - Word/phrase/sentence analysis with caching
- `POST /api/dictionary/lookup` - Dictionary lookup
- `POST /api/chat` - AI conversation

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
