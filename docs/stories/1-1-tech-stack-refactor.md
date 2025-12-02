# Story 1.1: Tech Stack & Directory Refactor

Status: done

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
- [x] Initialize Tailwind: `npx tailwindcss init -p` (AC: 2)
- [x] Configure `tailwind.config.js` with content paths (AC: 2)
- [x] Add Tailwind directives to `index.css` (AC: 2)
- [x] Create directory structure: `src/components/canvas`, `src/components/ui`, `src/hooks`, `src/store`, `src/config`, `src/shaders`, `src/utils`, `src/types` (AC: 3)
- [x] Move `TreeParticles.tsx` to `src/components/canvas/` (AC: 4)
- [x] Move `Controls.tsx` to `src/components/ui/` (AC: 4)
- [x] Update imports in moved files to resolve paths (AC: 4)
- [x] Update `App.tsx` imports (AC: 4)
- [x] Verify application builds and runs without errors (AC: 1, 2, 3, 4)

## Dev Notes

- **Architecture Patterns:**
  - Adopt the strict separation of concerns: `components/canvas` for R3F/WebGL components and `components/ui` for DOM/React components.
  - See [Source: docs/architecture.md#4-project-structure] for the definitive directory layout.

- **Project Structure Notes:**
  - This story establishes the foundation. Ensure all new folders are created even if empty (use `.gitkeep` if needed, though not strictly required for local dev).
  - `src/assets` should be used for static assets, but code references should go through `src/config/assets.ts` (to be created in future stories).

### References

- [Source: docs/architecture.md#4-project-structure] - Directory structure definition.
- [Source: docs/epics.md#story-11-tech-stack--directory-refactor] - Epic requirements.

## Dev Agent Record

### Context Reference

- [Context File](./1-1-tech-stack-refactor.context.xml)

### Agent Model Used

Gemini-2.0-Flash-Thinking-Exp

### Debug Log References

### Completion Notes List
- Refactored project structure to match architecture spec.
- Installed Tailwind CSS (v4), Zustand, Framer Motion.
- Moved components to `src/components/canvas` and `src/components/ui`.
- Updated imports.
- Verified build success.

### File List

- package.json
- package-lock.json
- tailwind.config.js
- postcss.config.js
- src/index.css
- src/App.tsx
- src/components/canvas/Experience.tsx
- src/components/canvas/TreeParticles.tsx
- src/components/ui/Controls.tsx

## Change Log

- 2025-12-01: Senior Developer Review notes appended. Status updated to done.

## Senior Developer Review (AI)

### Reviewer
Antigravity

### Date
2025-12-01

### Outcome
**Approve**
The story has been successfully implemented. The project structure has been refactored, dependencies installed, and Tailwind CSS configured as requested. The application builds and runs correctly.

### Summary
The refactoring lays a solid foundation for the project. The directory structure aligns with the architecture, and the tech stack is correctly set up.

### Key Findings
- **High Severity**: None.
- **Medium Severity**: None.
- **Low Severity**: None.

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
| :--- | :--- | :--- | :--- |
| 1 | Dependencies installed | **IMPLEMENTED** | `package.json` lines 12-22, 24-34 |
| 2 | Tailwind initialized | **IMPLEMENTED** | `tailwind.config.js`, `src/index.css` |
| 3 | Directory structure matches | **IMPLEMENTED** | `src/components/canvas`, `src/components/ui`, etc. verified |
| 4 | Files moved and imports updated | **IMPLEMENTED** | `src/App.tsx` imports, file locations verified |

**Summary:** 4 of 4 acceptance criteria fully implemented.

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
| :--- | :--- | :--- | :--- |
| Install dependencies | [x] | **VERIFIED COMPLETE** | `package.json` |
| Initialize Tailwind | [x] | **VERIFIED COMPLETE** | `tailwind.config.js` |
| Configure tailwind.config.js | [x] | **VERIFIED COMPLETE** | `tailwind.config.js` |
| Add Tailwind directives | [x] | **VERIFIED COMPLETE** | `src/index.css` |
| Create directory structure | [x] | **VERIFIED COMPLETE** | Directory listing |
| Move TreeParticles.tsx | [x] | **VERIFIED COMPLETE** | `src/components/canvas/TreeParticles.tsx` |
| Move Controls.tsx | [x] | **VERIFIED COMPLETE** | `src/components/ui/Controls.tsx` |
| Update imports | [x] | **VERIFIED COMPLETE** | `src/App.tsx` |
| Update App.tsx imports | [x] | **VERIFIED COMPLETE** | `src/App.tsx` |
| Verify application builds | [x] | **VERIFIED COMPLETE** | User reports running dev server |

**Summary:** 10 of 10 completed tasks verified.

### Test Coverage and Gaps
- No specific tests were required for this infrastructure story.
- Build verification serves as the primary test.

### Architectural Alignment
- Fully aligned with `docs/architecture.md`.
- Directory structure matches the specification.

### Security Notes
- No new security risks introduced. Standard dependency installation.

### Best-Practices and References
- Tailwind v4 usage is noted.
- Project structure follows React best practices.

### Action Items
**Code Changes Required:**
- None.

**Advisory Notes:**
- Note: Ensure future components follow the established directory structure.
