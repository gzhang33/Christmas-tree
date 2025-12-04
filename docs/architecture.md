# Architecture Decision Document - Christmas-tree

**Author:** BMad Architecture Agent
**Date:** 2025-12-01
**Version:** 1.0
**Status:** Approved

---

## 1. Executive Summary

The **Christmas-tree** project is a high-performance 3D interactive web application that transforms a particle-based Christmas tree into a floating photo gallery. The architecture prioritizes **visual fidelity** and **smooth transitions** (60 FPS) by leveraging GPU-accelerated custom shaders for the core "Explosion to Memory" mechanic. To manage the complex interaction between the 3D scene and the UI, we adopt a **hybrid state management** approach using Zustand, while ensuring a premium user experience with Framer Motion and Tailwind CSS.

---

## 2. Project Initialization & Foundation

As a brownfield project, the foundation is already established. The following upgrades are required to meet the UX specifications:

**Base Stack:**
-   **Framework:** React 18+
-   **Language:** TypeScript 5.4+
-   **Build Tool:** Vite 5.4+
-   **3D Engine:** Three.js / React-Three-Fiber (R3F)

**Required Infrastructure Updates (First Implementation Story):**
1.  **Install Tailwind CSS:** To support the "Midnight Magic" design system and fix existing styling issues.
2.  **Install Zustand:** For global state management across 3D and DOM boundaries.
3.  **Install Framer Motion:** For cinematic UI transitions.
4.  **Refactor Directory:** Adopt the new feature-based structure.

---

## 3. Decision Summary Table

| Category | Decision | Version | Rationale |
| :--- | :--- | :--- | :--- |
| **Styling** | **Tailwind CSS** | v3.4+ | Required by UX spec; enables rapid UI development and fixes current broken inline styles. |
| **State Management** | **Zustand** | v4.5+ | Lightweight (1KB), transient updates (no re-renders), perfect for bridging R3F loop and React UI. |
| **UI Animation** | **Framer Motion** | v11+ | Declarative `AnimatePresence` handles complex mount/unmount transitions for "Immersion Mode". |
| **3D Particles** | **Custom GLSL Shaders** | N/A | CPU-based animation is too slow for 20k+ particles. GPU offloading is mandatory for 60FPS. |
| **Performance** | **r3f-perf** | Latest | Essential for monitoring draw calls and FPS during the "Explosion" phase. |
| **Assets** | **Texture Atlas / Array** | N/A | Efficiently map multiple user photos to thousands of particles without draw call explosion. |

---

## 4. Project Structure

```text
src/
├── assets/                 # Static assets (textures, audio)
├── components/
│   ├── canvas/             # R3F 3D Components (WebGL context)
│   │   ├── TreeParticles.tsx
│   │   ├── PhotoCloud.tsx
│   │   └── Scene.tsx
│   ├── ui/                 # DOM UI Components (Tailwind + Framer)
│   │   ├── Controls.tsx
│   │   ├── Lightbox.tsx
│   │   └── Overlay.tsx
│   └── effects/            # Post-processing wrappers
├── config/                 # Static configuration
│   ├── colors.ts           # Colors, particle distributions
│   └── assets.ts           # Asset paths constants
├── hooks/                  # Custom Hooks
│   ├── useStore.ts         # Zustand store
│   └── useResponsive.ts    # 3D viewport logic
├── shaders/                # GLSL Code
│   ├── particle.vert       # Vertex shader (Bezier interpolation)
│   └── particle.frag       # Fragment shader
├── utils/                  # Pure functions
│   ├── math.ts
│   └── texture-atlas.ts    # Photo packing logic
├── types/                  # TypeScript definitions
└── App.tsx                 # Entry point (Canvas + UI composition)
```

---

## 5. Novel Pattern Designs

### Pattern: GPU State Machine Interpolation

**Problem:** Smoothly transitioning 20,000+ particles from a tree shape to scattered floating photos without CPU bottlenecks.

**Solution:**
A vertex-shader-driven animation system controlled by a single uniform.

**Components:**
1.  **Attributes:**
    -   `positionStart` (vec3): The particle's position in the Tree.
    -   `positionEnd` (vec3): The particle's target position in the Photo Cloud.
    -   `controlPoint` (vec3): A calculated point for the Bezier curve (Start + Explosion Vector).
    -   `uvOffset` & `uvScale` (vec2): Mapping to the specific photo in the Texture Atlas.
2.  **Uniforms:**
    -   `uProgress` (float): 0.0 (Tree) -> 1.0 (Photos). Driven by React state (damped).
    -   `uTime` (float): For floating noise.
3.  **Logic (Vertex Shader):**
    -   Use **Quadratic Bezier** interpolation based on `uProgress` to create an arc trajectory (Explosion -> Drift).
    -   Mix vertex color (Tree) and Texture sample (Photo) based on `uProgress`.

### Pattern: Hybrid Interaction (LOD Switching)

**Problem:** GPU particles are fast but hard to interact with individually (e.g., clicking a specific photo).

**Solution:**
1.  **Background:** The "Photo Cloud" is a single `Points` object rendering all photos.
2.  **Interaction:** When a user clicks a "particle" (detected via Raycaster on the Points object):
    -   Retrieve the photo ID from the particle index.
    -   **Hide** that specific particle (set alpha to 0 in attribute).
    -   **Spawn** a high-fidelity `Mesh` (Plane) at that exact position.
    -   Animate the Mesh to the center (Lightbox mode).
3.  **Return:** When closing Lightbox, animate Mesh back, destroy it, and restore particle alpha.

---

## 6. Implementation Patterns

### Component Responsibility
*   **Strict Separation:** 3D components (`components/canvas`) must **never** contain DOM elements. UI components (`components/ui`) must **never** contain R3F hooks.
*   **Communication:** Use the `useStore` hook.
    *   UI: `useStore.setState({ isExploded: true })`
    *   3D: `const isExploded = useStore(state => state.isExploded)`

### Responsive 3D
*   **Do not use** `window.innerWidth`.
*   **Use** `useThree().viewport`.
*   **Scale Factor:** Define a `responsiveScale` in `useResponsive` hook that adjusts particle sizes and camera distances based on `viewport.width`.

### Asset Management
*   **No Hardcoding:** `src/assets/image.png` is forbidden in components.
*   **Registry:** Use `src/config/assets.ts`:
    ```typescript
    export const ASSETS = {
      textures: {
        particle: '/textures/particle.png',
      },
      audio: {
        bgm: '/audio/jingle-bells.mp3',
      }
    }
    ```

---

## 7. Functional Requirement Mapping

| FR Category | Architecture Solution |
| :--- | :--- |
| **Visuals (FR1-7)** | `TreeParticles.tsx` with Custom ShaderMaterial. `EffectComposer` for Bloom/Vignette. |
| **Interaction (FR8-14)** | `useStore` triggers `isExploded`. `useFrame` interpolates `uProgress` uniform. |
| **Photos (FR15-21)** | **Hybrid Interaction Pattern**. Texture Atlas for rendering, separate Mesh for Lightbox. |
| **Controls (FR22-27)** | `Controls.tsx` (Tailwind) updates `useStore`. `localStorage` middleware in Zustand. |
| **Camera (FR28-31)** | `OrbitControls` with dynamic `minDistance`/`maxDistance` based on state. |
| **Responsive (FR32-36)** | `useResponsive` hook adjusts `uPointSize` uniform and Camera FOV. |
| **A11y (FR37-41)** | `Controls.tsx` uses semantic HTML buttons. `prefers-reduced-motion` disables explosion force. |

---

## 8. Next Steps

1.  **Scaffold:** Run the project restructuring script.
2.  **Dependencies:** `npm install zustand framer-motion -D tailwindcss postcss autoprefixer`.
3.  **Init:** `npx tailwindcss init -p`.
4.  **Shader Dev:** Create the basic `particle.vert` and `particle.frag`.

This architecture provides a robust, high-performance foundation for the Christmas-tree application, ensuring the "Wow" factor is achieved through technical excellence.
