# Epic Technical Specification: Architecture & UI Modernization

Date: 2025-12-02
Author: Gianni
Epic ID: 1
Status: Draft

---

## Overview

This epic focuses on establishing the robust technical foundation required by the Architecture Spec by refactoring the existing "brownfield" demo code. The primary goal is to modernize the technology stack by migrating state management to **Zustand**, styling to **Tailwind CSS**, and implementing a clean, feature-based directory structure. This work prepares the codebase for the advanced visual and interactive features planned in subsequent epics.

## Objectives and Scope

**In-Scope:**
*   **Dependency Installation:** Installing and configuring `zustand`, `framer-motion`, `tailwindcss`, `postcss`, and `autoprefixer`.
*   **Directory Restructuring:** Reorganizing the project into `components/canvas`, `components/ui`, `store`, `config`, `hooks`, and `utils` as per the Architecture Spec.
*   **Global State Implementation:** Creating a centralized Zustand store (`useStore`) to manage application state (theme, particle count, explosion state) and implementing LocalStorage persistence.
*   **UI Refactoring:** Rewriting the `Controls.tsx` component using Tailwind CSS to match the "Midnight Magic" design system.
*   **Interaction Implementation:** Implementing the "Immersion Mode" where UI controls fade out upon explosion using Framer Motion.
*   **Accessibility:** Ensuring all UI controls have appropriate ARIA labels.

**Out-of-Scope:**
*   **Advanced Particle Physics:** The complex GPU-based explosion physics and morphing effects are part of Epic 2.
*   **Photo Interaction:** The Lightbox overlay and magnetic hover effects are part of Epic 3.
*   **Asset Management:** Detailed texture atlas creation and asset loading logic are part of Epic 2.

## System Architecture Alignment

This epic directly implements the "Project Initialization & Foundation" section of the Architecture Decision Document.
*   **State Management:** Adopts **Zustand** as the single source of truth, replacing scattered `useState` hooks and prop drilling. This aligns with the "Hybrid State Management" decision.
*   **Styling:** Adopts **Tailwind CSS** for all DOM-based UI components, enforcing the "Midnight Magic" design system defined in the UX Spec.
*   **Animation:** Integrates **Framer Motion** to handle the declarative UI transitions (fade-in/out) required for the "Immersion Mode".
*   **Structure:** Enforces the strict separation between 3D (`components/canvas`) and UI (`components/ui`) components.

## Detailed Design

### Services and Modules

| Module | Path | Responsibility | Owner |
| :--- | :--- | :--- | :--- |
| **Store Module** | `src/store/useStore.ts` | Manages global application state (theme, config, interaction state) and persistence. | Frontend Lead |
| **Config Module** | `src/config/theme.ts` | Exports centralized design tokens (colors, spacing) and configuration constants. | Frontend Lead |
| **UI Module** | `src/components/ui/Controls.tsx` | Renders the user interface for customization, subscribing to the store for state. | Frontend Dev |
| **App Composition** | `src/App.tsx` | Composes the 3D Canvas and the UI Overlay, handling the layout structure. | Frontend Dev |

### Data Models and Contracts

**AppState Interface (Zustand Store):**

```typescript
interface AppState {
  // Configuration
  theme: string; // default: 'midnight'
  particleCount: number; // default: 5000
  
  // Interaction State
  isExploded: boolean; // default: false
  activePhotoId: string | null; // default: null
  
  // Actions
  setTheme: (theme: string) => void;
  setParticleCount: (count: number) => void;
  setIsExploded: (exploded: boolean) => void;
  setActivePhoto: (id: string | null) => void;
  reset: () => void;
}
```

### APIs and Interfaces

**Store Actions:**
*   `setTheme(theme: string)`: Updates the current color theme. Persists to LocalStorage.
*   `setParticleCount(count: number)`: Updates the target particle count. Triggers re-initialization of particles (handled in Epic 2, but state is set here).
*   `setIsExploded(exploded: boolean)`: Toggles the explosion state. Used by UI to trigger fade-out and by 3D scene to trigger animation.

### Workflows and Sequencing

1.  **Initialization:**
    *   App loads -> `useStore` initializes -> Reads from LocalStorage -> Sets initial state.
    *   `Controls` component mounts -> Subscribes to `theme`, `particleCount`, `isExploded`.

2.  **Theme Change:**
    *   User clicks theme button -> `setTheme('neon')` called -> Store updates `theme` -> `Controls` re-renders with new active state -> `TreeParticles` (via hook) receives new color config.

3.  **Explosion Trigger (Immersion Mode):**
    *   User clicks "Explode" (or Tree) -> `setIsExploded(true)` called.
    *   **UI Flow:** `Controls` component detects `isExploded === true` -> Framer Motion `<AnimatePresence>` triggers exit animation -> Controls fade out.
    *   **3D Flow:** `TreeParticles` detects `isExploded === true` -> Begins physics animation (Epic 2).

## Non-Functional Requirements

### Performance
*   **UI Response:** UI interactions (clicks, toggles) must respond within 100ms.
*   **Render Optimization:** Changing UI state (like hovering a button) must NOT cause the 3D Canvas to re-render. This is ensured by the separate component structure and Zustand's selective subscriptions.

### Security
*   N/A (Client-side application with no sensitive data).

### Reliability/Availability
*   **Persistence:** User preferences (theme, particle count) must be saved to `localStorage` and restored on page reload (FR26, FR27). If `localStorage` is unavailable, fall back to defaults gracefully.

### Observability
*   **Dev Tools:** Zustand DevTools middleware should be enabled in development mode for state debugging.

## Dependencies and Integrations

*   **`zustand` (^4.5.0):** Core state management library.
*   **`framer-motion` (^11.0.0):** For UI enter/exit animations.
*   **`tailwindcss` (^3.4.0):** Utility-first CSS framework.
*   **`postcss`, `autoprefixer`:** Required for Tailwind processing.
*   **`clsx`, `tailwind-merge`:** Utilities for dynamic class name construction.

## Acceptance Criteria (Authoritative)

1.  **Project Structure:** The codebase follows the `src/components/canvas`, `src/components/ui`, `src/store`, `src/config` structure. All existing files are moved to their appropriate new locations.
2.  **Tailwind Integration:** Tailwind CSS is installed, configured with the "Midnight Magic" color palette (Neon Pink `#D53F8C`, Electric Purple `#805AD5`, etc.), and working in the build.
3.  **Global State:** A `useStore` hook exists and successfully manages `theme`, `particleCount`, and `isExploded` state.
4.  **State Persistence:** Changing the theme or particle count persists across page reloads via LocalStorage.
5.  **UI Styling:** The `Controls` component is fully styled using Tailwind CSS, matching the "Midnight Magic" aesthetic (glassmorphism, neon accents).
6.  **Immersion Mode:** When `isExploded` is set to true, the `Controls` component smoothly fades out using Framer Motion.
7.  **Accessibility:** All interactive elements in `Controls` have valid `aria-label` attributes.
8.  **Clean Build:** The project builds (`npm run build`) without errors after refactoring.

## Traceability Mapping

| AC ID | Spec Section | Component | Test Idea |
| :--- | :--- | :--- | :--- |
| AC1 | Arch Spec Sec 4 | Project Root | Verify file tree structure matches spec. |
| AC2 | UX Spec Sec 3.1 | `tailwind.config.js` | Check config file for custom colors. |
| AC3 | Arch Spec Sec 3 | `src/store/useStore.ts` | Unit test store actions. |
| AC4 | PRD FR26, FR27 | `src/store/useStore.ts` | Manually reload page and check settings. |
| AC5 | UX Spec Sec 3 | `src/components/ui/Controls.tsx` | Visual inspection of UI against design. |
| AC6 | UX Spec Sec 2.2 | `src/components/ui/Controls.tsx` | Trigger explosion, verify UI fade out. |
| AC7 | PRD FR41 | `src/components/ui/Controls.tsx` | Inspect DOM for ARIA labels. |

## Risks, Assumptions, Open Questions

*   **Risk:** Breaking existing 3D rendering during file moves.
    *   *Mitigation:* Perform file moves carefully and update imports immediately. Verify the app runs after the structural refactor before starting the UI refactor.
*   **Risk:** CSS conflicts between old styles and Tailwind.
    *   *Mitigation:* Completely remove old CSS files (`App.css`, `index.css`) and replace `index.css` with Tailwind directives.
*   **Assumption:** The existing `TreeParticles` component can be easily adapted to read props/state instead of internal state for the initial refactor.

## Test Strategy Summary

*   **Manual Visual Testing:** Verify the "Midnight Magic" theme application and responsiveness of the UI.
*   **Interaction Testing:** Verify the "Immersion Mode" fade-out/fade-in transition works smoothly.
*   **Persistence Testing:** Change settings, reload the page, and verify settings are restored.
*   **Regression Testing:** Ensure the 3D tree still renders and rotates after the directory refactor.
