# Optimization Spec

## Why
To improve the user experience, developer experience, and application performance based on recent feedback.
1. **Documentation**: The current README can be more detailed to help new developers and users understand the project structure and deployment better.
2. **Interaction**: Mobile users lack tactile feedback. Adding vibration (haptics) to navigation and key actions will improve the "native app" feel.
3. **Performance**: The application can be optimized for faster load times and smaller bundle sizes.

## What Changes

### Documentation
- Update `README.md` to include:
  - Detailed project structure explanation.
  - Troubleshooting section.
  - More explicit environment variable descriptions.

### Interaction (Haptics)
- Create a new hook `useHaptic` in `hooks/useHaptic.ts` that safely invokes `navigator.vibrate` (if available).
- Apply haptic feedback to:
  - Bottom Navigation Bar (`components/Navigation/BottomTab.tsx`).
  - Reader Page Back Button (`app/(dashboard)/reader/[id]/page.tsx`).

### Performance
- Enable compression in `next.config.mjs`.
- Implement dynamic import for `EpubReader` in `app/(dashboard)/reader/[id]/page.tsx` to reduce initial bundle size for non-EPUB readers.

## Impact
- **Affected Specs**: None directly, but improves overall quality.
- **Affected Code**:
  - `README.md`
  - `components/Navigation/BottomTab.tsx`
  - `app/(dashboard)/reader/[id]/page.tsx`
  - `next.config.mjs`
  - New file: `hooks/useHaptic.ts`

## ADDED Requirements

### Requirement: Haptic Feedback
The system SHALL provide haptic feedback (vibration) on supported devices when users interact with primary navigation elements.

#### Scenario: Navigation Click
- **WHEN** user taps a tab in the Bottom Navigation Bar
- **THEN** the device triggers a short vibration (e.g., 10-15ms)

#### Scenario: Back Action
- **WHEN** user taps the "Back" button in the Reader
- **THEN** the device triggers a short vibration

### Requirement: Performance Tuning
The system SHALL optimize the production build.
- **Compression**: Gzip/Brotli compression should be enabled.
- **Code Splitting**: Heavy components like `EpubReader` should be loaded lazily.
