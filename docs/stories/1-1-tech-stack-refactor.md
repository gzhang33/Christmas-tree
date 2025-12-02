# Story 1.1: Tech Stack & Directory Refactor

Status: review

## Story

As a Developer,
I want to install the required dependencies and restructure the project,
so that the codebase aligns with the approved Architecture Spec.

## Acceptance Criteria

1. `zustand`, `framer-motion`, `tailwindcss`, `postcss`, `autoprefixer` are installed.
2. Tailwind is initialized with `tailwind.config.js`.
3. The directory structure matches the Architecture Spec (`components/canvas`, `components/ui`, `hooks`, `store`, `config`).
4. Existing files are moved to their new locations (even if not yet refactored).

## Tasks / Subtasks

- [x] Install dependencies: `npm install zustand framer-motion` and `npm install -D tailwindcss postcss autoprefixer` (AC: 1)
- [x] Initialize Tail wind: `npx tailwindcss init -p` (AC: 2)
- [x] Configure `tailwind.config.js` with content paths (AC: 2)
- [x] Add Tailwind directives to `index.css` (AC: 2)
- [x] Create directory structure: `src/components/canvas`, `src/components/ui`, `src/hooks`, `src/store`, `src/config`, `src/shaders`, `src/utils`, `src/types` (AC: 3)
- [x] Move `TreeParticles.tsx` to `src/components/canvas/` (AC: 4)
- [x] Move `Controls.tsx` to `src/components/ui/` (AC: 4)
- [x] Update imports in moved files to resolve paths (AC: 4)
- [x] Update `App.tsx` imports (AC: 4)
- [x] Verify application builds and runs without errors (AC: 1, 2, 3, 4)

### Review Follow-ups (AI)

- Note: Ensure `URL.createObjectURL` usage in `App.tsx` is addressed in Story 2.0 to prevent memory leaks.

## Dev Notes

- **Architecture Patterns:**
  - Adopt the strict separation of concerns: `components/canvas` for R3F/WebGL components and `components/ui` for DOM/React components.
  - See [Source: docs/architecture.md#4-project-structure] for the definitive directory layout.

- **Project Structure Notes:**
  - This story establishes the foundation. Ensure all new folders are created even if empty (use `.gitkeep` if needed, though not strictly required for local dev).
  - Code in `src/assets` should be used for static assets, but all code references should go through `src/config/assets.ts` (to be created in future stories).

### References

- [Source: docs/architecture.md#4-project-structure] - Directory structure definition.
- [Source: docs/epics.md#story-11-tech-stack--directory-refactor] - Epic requirements.

## Dev Agent Record

### Context Reference

- [Context File](./1-1-tech-stack-refactor.context.xml)

### Agent Model Used

Gemini-2.0-Flash-Thinking-Exp

### Debug Log

**2025-12-02 Re-implementation after rollback:**
- Installed dependencies: `zustand@^5.0.9`, `framer-motion@^12.23.25`, `tailwindcss@^3.4.18`, `postcss@^8.5.6`, `autoprefixer@^10.4.22`
- Created directory structure under `src/`: `components/canvas`, `components/ui`, `hooks`, `store`, `config`, `shaders`, `utils`, `types`
- Moved all canvas components: `Experience.tsx`, `TreeParticles.tsx`, `MagicDust.tsx`, `Snow.tsx`, `PhotoCard.tsx`, `PerformanceMonitor.tsx` → `src/components/canvas/`
- Moved all UI components: `Controls.tsx`, `ErrorBoundary.tsx` → `src/components/ui/`
- Moved `App.tsx` → `src/App.tsx`
- Moved `types.ts` → `src/types.ts`
- Updated all import paths in affected files
- Updated `index.tsx` to import from `src/App.tsx`
- Created `src/index.css` with Tailwind directives
- Created `tailwind.config.js` with Midnight Magic theme colors
- Created `postcss.config.js`
- Initially attempted Tailwind v4 but encountered PostCSS compatibility issues
- Downgraded to Tailwind v3.4.18 for stable configuration
- Build successful: `npm run build` completed without errors

### Completion Notes

- ✅ All dependencies installed successfully
- ✅ Directory structure matches architecture specification
- ✅ All files moved to correct locations with updated imp要orts
- ✅ Tailwind CSS v3 configured with custom theme
- ✅ Build verification passed
- Note: Used Tailwind v3.4 instead of v4 due to PostCSS configuration compatibility

### File List

- `package.json` - Added zustand, framer-motion, tailwindcss, postcss, autoprefixer
- `package-lock.json` - Dependency lockfile updated
- `tailwind.config.js` - Tailwind configuration with content paths and Midnight Magic theme
- `postcss.config.js` - PostCSS configuration for Tailwind
- `index.tsx` - Updated import path to `src/App.tsx`
- `src/index.css` - Created with Tailwind directives
- `src/App.tsx` - Moved from root, updated imports
- `src/types.ts` - Moved from root
- `src/components/canvas/Experience.tsx` - Moved, import paths updated
- `src/components/canvas/TreeParticles.tsx` - Moved, import paths updated
- `src/components/canvas/MagicDust.tsx` - Moved
- `src/components/canvas/Snow.tsx` - Moved
- `src/components/canvas/PhotoCard.tsx` - Moved
- `src/components/canvas/PerformanceMonitor.tsx` - Moved
- `src/components/ui/Controls.tsx` - Moved, import paths updated
- `src/components/ui/ErrorBoundary.tsx` - Moved

## Change Log

- 2025-12-01: Initial implementation completed. Senior Developer Review: Approved.
- 2025-12-02: Post-rollback verification revealed all code reverted. Status: Changes Requested.
- 2025-12-02: Re-implementation completed. All acceptance criteria satisfied. Status: Ready for review.

## Senior Developer Review (AI)

### Reviewer: Antigravity
### Date: 2025-12-02
### Outcome: Approve

**Summary:**
The implementation successfully establishes the project's technical foundation. The directory structure aligns with the architecture, dependencies are correctly installed, and the build process is verified. The migration of components to their new locations was handled correctly with updated imports.

**Key Findings:**
- No significant issues found.
- All acceptance criteria are fully implemented.
- Build verification passed successfully.

**Acceptance Criteria Coverage:**

| AC# | Description | Status | Evidence |
| :--- | :--- | :--- | :--- |
| 1 | Dependencies installed | IMPLEMENTED | `package.json` |
| 2 | Tailwind initialized | IMPLEMENTED | `tailwind.config.js`, `src/index.css` |
| 3 | Directory structure | IMPLEMENTED | `src/components/canvas`, `src/store`, etc. |
| 4 | Files moved & imports updated | IMPLEMENTED | `src/App.tsx`, `src/components/canvas/TreeParticles.tsx` |

**Task Completion Validation:**

| Task | Marked As | Verified As | Evidence |
| :--- | :--- | :--- | :--- |
| Install dependencies | [x] | VERIFIED | `package.json` |
| Initialize Tailwind | [x] | VERIFIED | `tailwind.config.js` |
| Configure tailwind.config.js | [x] | VERIFIED | `tailwind.config.js` |
| Add Tailwind directives | [x] | VERIFIED | `src/index.css` |
| Create directory structure | [x] | VERIFIED | File system check |
| Move TreeParticles.tsx | [x] | VERIFIED | `src/components/canvas/TreeParticles.tsx` |
| Move Controls.tsx | [x] | VERIFIED | `src/components/ui/Controls.tsx` |
| Update imports | [x] | VERIFIED | `src/App.tsx` imports |
| Update App.tsx imports | [x] | VERIFIED | `src/App.tsx` imports |
| Verify build | [x] | VERIFIED | `npm run build` success |

**Action Items:**
- Note: Ensure `URL.createObjectURL` usage in `App.tsx` is addressed in Story 2.0 to prevent memory leaks.