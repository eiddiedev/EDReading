# AI Context Enhancement Spec

## Why
Currently, the project relies on implicit knowledge or scattered documentation (README) which is optimized for humans, not AI. AI agents perform better when provided with explicit architectural rules, coding conventions, and high-level context that links different parts of the system together.

## What Changes
- **Add `AI_CONTEXT.md`**: A dedicated file serving as the "system prompt" for any AI working on this repo. It will contain:
    - Tech stack enforcement (e.g., "Use Zustand, not Context").
    - Data flow summaries.
    - Project-specific constraints (e.g., "Supabase RLS is active").
- **Add `CONTRIBUTING.md`**: Formalize development setup and coding standards (e.g., naming conventions, folder structure rules).
- **Enhance Type Definitions**: Add JSDoc/TSDoc to `types/index.ts` to provide semantic meaning to data structures, not just shape.
- **Document API Routes**: Add header comments to `app/api/**/route.ts` files describing their input/output contracts.

## Impact
- **Affected specs**: None directly, but future specs will benefit from better AI generation.
- **Affected code**: 
    - New files: `AI_CONTEXT.md`, `CONTRIBUTING.md`.
    - Modified files: `types/index.ts`, `app/api/**/route.ts`.

## ADDED Requirements
### Requirement: AI Context File
The system SHALL contain an `AI_CONTEXT.md` file at the root.
- It MUST list the technology stack.
- It MUST describe the state management strategy (Zustand).
- It MUST describe the database interaction strategy (Supabase Client).

### Requirement: Enhanced Type Documentation
Key interfaces in `types/index.ts` SHALL have TSDoc comments explaining:
- The entity represented (e.g., "A vocabulary word stored in the local dictionary").
- The purpose of specific fields (e.g., "Why do we have both `original` and `translation`?").

## MODIFIED Requirements
N/A
