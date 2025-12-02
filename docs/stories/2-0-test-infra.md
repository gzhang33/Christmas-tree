# Story 2.0: Test Infrastructure & Video Prep

Status: drafted

## Story

As a Developer,
I want to set up the testing framework and prepare video assets,
so that the project is stable and supports the new video requirements.

## Acceptance Criteria

1. `vitest` and `@testing-library/react` are installed and configured.
2. Unit tests for `useStore` are implemented and passing.
3. `src/config/assets.ts` is updated to include video file paths (supporting the new video requirement).
4. The `URL.createObjectURL` memory leak in `src/components/ui/Controls.tsx` is identified and fixed.

## Tasks / Subtasks

- [ ] Install and configure testing dependencies (AC: 1)
  - [ ] Install `vitest`, `@testing-library/react`, `jsdom`
  - [ ] Configure `vite.config.ts` for testing
  - [ ] Add `test` script to `package.json`
- [ ] Create unit tests for Global Store (AC: 2)
  - [ ] Create `src/store/useStore.test.ts`
  - [ ] Test initial state
  - [ ] Test actions (`setTheme`, `setParticleCount`, `triggerExplosion`, `resetExplosion`)
- [ ] Update Asset Configuration (AC: 3)
  - [ ] Update `Asset` type definition to support `videoUrl`
  - [ ] Add video paths to `src/config/assets.ts`
- [ ] Fix Memory Leak in Controls (AC: 4)
  - [ ] Analyze `src/components/ui/Controls.tsx` for `URL.createObjectURL` usage
  - [ ] Implement `URL.revokeObjectURL` cleanup in `useEffect` or appropriate lifecycle method

## Dev Notes

- **Architecture Patterns:**
  - Use `vitest` for unit testing [Source: docs/architecture.md#8-next-steps].
  - Centralize asset config in `src/config/assets.ts` [Source: docs/architecture.md#6-implementation-patterns].

### Project Structure Notes

- New file: `src/store/useStore.test.ts`
- Modified file: `src/config/assets.ts`
- Modified file: `src/components/ui/Controls.tsx`
- Modified file: `package.json`
- Modified file: `vite.config.ts`

### Learnings from Previous Story

**From Story 1-3-ui-refactor (Status: done)**

- **Pending Action Item**: Monitor `URL.createObjectURL` usage for potential memory leaks. This is explicitly addressed in AC4 of this story.
- **Context**: `Controls.tsx` was just refactored to use Tailwind and `useStore`. Be careful to preserve these changes while fixing the memory leak.

[Source: stories/1-3-ui-refactor.md#Review-Follow-ups-AI]

### References

- [Source: docs/epics.md#story-20-test-infrastructure--video-prep] - Epic Requirements.
- [Source: docs/architecture.md#8-next-steps] - Testing setup recommendation.

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
