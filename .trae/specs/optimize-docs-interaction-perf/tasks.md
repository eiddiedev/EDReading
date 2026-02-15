# Tasks

- [ ] Task 1: Optimize Documentation
  - [ ] SubTask 1.1: Update `README.md` with detailed project structure and troubleshooting info.

- [ ] Task 2: Implement Haptic Feedback
  - [x] SubTask 2.1: Create `hooks/useHaptic.ts` with `triggerHaptic` function.
  - [x] SubTask 2.2: Integrate `useHaptic` into `components/Navigation/BottomTab.tsx`.
  - [x] SubTask 2.3: Integrate `useHaptic` into `app/(dashboard)/reader/[id]/page.tsx` (Back button).

- [ ] Task 3: Performance Optimization
  - [x] SubTask 3.1: Enable `compress: true` in `next.config.mjs`.
  - [x] SubTask 3.2: Refactor `app/(dashboard)/reader/[id]/page.tsx` to use `next/dynamic` for `EpubReader`.
