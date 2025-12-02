# Story 2.0: Test Infrastructure & Video Prep

Status: backlog

## Story

As a Developer,
I want to set up the testing framework and prepare video assets,
so that the project is stable and supports the new video requirements.

## Acceptance Criteria

1. `vitest` and `@testing-library/react` are installed and configured.
2. `src/store/useStore.test.ts` is uncommented and contains passing unit tests for `useStore`.
3. `src/config/assets.ts` already includes video file paths in `MEMORIES` array (verified).
4. The `URL.createObjectURL` memory leak in `App.tsx` is fixed with proper cleanup using `URL.revokeObjectURL`.
5. A test script is added to `package.json` to run tests.

## Tasks / Subtasks

- [ ] Install testing dependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom` (AC: 1)
- [ ] Configure Vitest in `vite.config.ts` or create `vitest.config.ts` (AC: 1)
- [ ] Uncomment and update `src/store/useStore.test.ts` with proper imports and test setup (AC: 2)
- [ ] Verify `src/config/assets.ts` contains video paths in `MEMORIES` array (AC: 3)
- [ ] Fix memory leak in `App.tsx`:
  - [ ] Add cleanup effect to revoke object URLs when photos are removed or component unmounts (AC: 4)
  - [ ] Ensure `URL.revokeObjectURL` is called for all created object URLs (AC: 4)
- [ ] Add `test` script to `package.json` (AC: 5)
- [ ] Run tests to verify they pass (AC: 2, 5)

## Dev Notes

- **Architecture Patterns:**
  - Testing infrastructure is required before implementing complex physics logic (Story 2.2).
  - Video support is already partially implemented in `assets.ts` - this story verifies and documents it.
  - Memory leak fix prevents resource accumulation during photo uploads.

### Learnings from Previous Story

**From Story 2-1-theme-config (Status: done)**

- **Assets**: `MEMORIES` array in `assets.ts` already supports video paths with `{ id, image, video }` structure.
- **Context**: Video texture support was identified as a requirement during Epic 1 retrospective.

**From Epic 1 Retrospective**

- **Action Item**: Configure Vitest was identified as a critical preparation task for Epic 2.
- **Memory Leak**: `URL.createObjectURL` cleanup was flagged as a medium-priority technical debt item.

### References

- [Source: docs/epics.md#story-20-test-infrastructure--video-prep] - Epic Requirements
- [Source: docs/stories/epic-1-retro-2025-12-02.md#3-action-items] - Retrospective Action Items
- [Source: docs/architecture.md#6-implementation-patterns] - Asset Management Patterns

## Dev Agent Record

### Context Reference

- [Context File](./2-0-test-infra.context.xml)

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2025-12-02: Story drafted based on Epic 2 requirements and Epic 1 retrospective action items.


