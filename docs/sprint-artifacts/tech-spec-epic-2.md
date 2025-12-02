# Epic Technical Specification: Visual Engine Upgrade

Date: 2025-12-02
Author: Gianni
Epic ID: 2
Status: Draft

---

## Overview

This epic focuses on upgrading the core 3D experience to meet the "Midnight Magic" aesthetic and implementing the specific physics-driven transitions defined in the UX spec. The primary goal is to transform the static particle tree into a dynamic, physics-based entity that can explode into a cloud of floating photos. This involves implementing custom GLSL shaders for high-performance particle animation, a "GPU State Machine" for smooth transitions, and a texture atlas system for efficient photo rendering.

## Objectives and Scope

**In-Scope:**
*   **Infrastructure Prep:** Configuring `vitest` and fixing memory leaks (Story 2.0).
*   **Video Support:** Updating asset types to support video URLs (Story 2.0).
*   **Theme & Asset Configuration:** Centralizing theme colors and asset paths (Story 2.1 - *Completed*).
*   **Custom Shader Implementation:** Developing `particle.vert` and `particle.frag` to handle Bezier curve interpolation and texture mixing.
*   **Explosion Physics:** Implementing the "GPU State Machine" pattern where particle movement is driven by a `uProgress` uniform and a calculated explosion vector.
*   **Morphing Effect:** Implementing the visual transition from "glowing dot" to "Polaroid photo" using scale and texture cross-fading in the shader.
*   **Performance Optimization:** Ensuring the particle system maintains 60 FPS during the explosion animation using `InstancedMesh` or `Points` with custom shaders.

**Out-of-Scope:**
*   **Advanced Interaction:** Magnetic hover and Lightbox overlay logic (Epic 3).
*   **UI Controls:** The UI control panel itself (Epic 1).
*   **Complex Audio:** Audio integration is a "nice to have" but not the core focus of this technical epic.

## System Architecture Alignment

This epic implements the "Visual Engine Upgrade" and "Novel Pattern Designs" sections of the Architecture Decision Document.
*   **3D Particles:** Moves away from CPU-based animation to **Custom GLSL Shaders** to handle 20k+ particles efficiently.
*   **Pattern: GPU State Machine:** Adopts the proposed vertex shader logic where `uProgress` drives the transition from `positionStart` (Tree) to `positionEnd` (Photo Cloud) via a Bezier curve.
*   **Assets:** Implements the **Texture Atlas** approach to render multiple unique photos within a single draw call.

## Detailed Design

### Services and Modules

| Module | Path | Responsibility | Owner |
| :--- | :--- | :--- | :--- |
| **Particle Shader** | `src/shaders/particle.vert`, `src/shaders/particle.frag` | Handles vertex positioning (Bezier), scaling, and fragment coloring/texturing. | Graphics Dev |
| **Tree Component** | `src/components/canvas/TreeParticles.tsx` | Renders the particle system, manages geometry attributes, and updates shader uniforms (`uProgress`, `uTime`). | Graphics Dev |
| **Config Module** | `src/config/assets.ts` | Defines paths for textures and the texture atlas configuration. | Frontend Dev |
| **Utils** | `src/utils/math.ts` | Helper functions for calculating explosion vectors and Bezier control points. | Graphics Dev |
| **Test Infra** | `src/store/useStore.test.ts` | Unit tests for global state logic. | Lead Dev |

### Data Models and Contracts

**Shader Uniforms:**

```glsl
uniform float uTime;       // Global time for floating noise
uniform float uProgress;   // 0.0 (Tree) -> 1.0 (Photos)
uniform vec3 uColor;       // Base tree color (from Theme)
uniform sampler2D uAtlas;  // Texture atlas containing all photos
```

**Geometry Attributes:**

```typescript
const attributes = {
  position: Float32Array,      // Current position (unused in shader if using start/end, but needed for three.js)
  aPositionStart: Float32Array, // Tree shape position
  aPositionEnd: Float32Array,   // Scattered photo position
  aControlPoint: Float32Array,  // Bezier control point
  aUvOffset: Float32Array,      // UV offset for specific photo in atlas
  aUvScale: Float32Array,       // UV scale for specific photo
  aRandom: Float32Array         // Random seed for noise/rotation
};
```

### APIs and Interfaces

*   **`TreeParticles` Props:**
    *   `count: number` - Number of particles (from Store).
    *   `theme: string` - Current theme ID (from Store).
    *   `isExploded: boolean` - Target state (from Store).

### Workflows and Sequencing

1.  **Initialization:**
    *   `TreeParticles` generates `aPositionStart` (Spiral/Cone shape).
    *   `TreeParticles` generates `aPositionEnd` (Random sphere/cloud distribution).
    *   `TreeParticles` calculates `aControlPoint` (Vector from center through start position * force).
    *   Shader material is initialized with `uProgress = 0`.

2.  **Explosion Trigger:**
    *   `isExploded` becomes `true` (via Store).
    *   `useFrame` loop detects change and increments `uProgress` towards 1.0 using `MathUtils.damp` or `spring` physics.
    *   **Vertex Shader:** Interpolates position: `mix(start, end, progress)` (with Bezier curve).
    *   **Vertex Shader:** Scales point size: Small (Tree) -> Large (Photo).
    *   **Fragment Shader:** Mixes `uColor` -> `texture(uAtlas)` based on progress.

3.  **Implosion (Return):**
    *   `isExploded` becomes `false`.
    *   `uProgress` decrements towards 0.0.
    *   Physics reverse, particles return to tree shape.

## Non-Functional Requirements

### Performance
*   **Frame Rate:** Must maintain >30 FPS on mobile and >55 FPS on desktop during the explosion animation (NFR-P1).
*   **Draw Calls:** The entire particle system should be rendered in **1 draw call** (using `Points` or `InstancedMesh`).

### Security
*   N/A

### Reliability/Availability
*   **Texture Loading:** If the texture atlas fails to load, particles should fallback to displaying colored squares/dots rather than crashing (NFR-R1).

### Observability
*   **Performance Monitor:** The existing `r3f-perf` monitor should be used to verify FPS and draw call counts during development.

## Dependencies and Integrations

*   **`three`:** Core 3D library.
*   **`@react-three/fiber`:** React reconciler for Three.js.
*   **`@react-three/drei`:** Helpers (specifically `shaderMaterial` or `useTexture`).
*   **`glsl-random` (optional):** For shader noise functions.

## Acceptance Criteria (Authoritative)

1.  **Test Infrastructure:** `vitest` is configured and `useStore` has passing unit tests (Story 2.0).
2.  **Video Assets:** `assets.ts` exports video file paths and types support `videoUrl` (Story 2.0).
3.  **Memory Leak Fix:** `URL.createObjectURL` is properly revoked in `Controls.tsx` (Story 2.0).
4.  **Shader Implementation:** `particle.vert` and `particle.frag` are implemented and correctly handle the transition logic.
2.  **Explosion Physics:** Clicking the tree triggers a smooth, non-linear explosion animation where particles travel along curved paths (Bezier).
3.  **Morphing:** Particles visibly transform from small glowing dots to larger, textured rectangular "photos" as they explode.
4.  **Texture Atlas:** Each "photo" particle displays a distinct image from a provided texture atlas (or array), not just a single repeated texture.
5.  **Performance:** The explosion animation runs smoothly without significant frame drops on the target test device.
6.  **Reversibility:** The animation is fully reversible; toggling `isExploded` off returns particles to the exact tree shape.
7.  **Theme Integration:** The tree particles correctly use the color defined in the "Midnight Magic" theme config.

## Traceability Mapping

| AC ID | Spec Section | Component | Test Idea |
| :--- | :--- | :--- | :--- |
| AC0.1 | Retro 1 Action | `package.json` | Run `npm test`. |
| AC0.2 | Retro 1 Action | `src/config/assets.ts` | Check for video paths. |
| AC1 | Arch Spec Sec 5 | `src/shaders/*` | Visual verification of shader code. |
| AC2 | UX Spec Sec 2.2 | `TreeParticles.tsx` | Click tree, observe curved trajectory. |
| AC3 | UX Spec Sec 2.2 | `particle.frag` | Observe color-to-texture fade. |
| AC4 | Arch Spec Sec 5 | `src/config/assets.ts` | Verify different images appear. |
| AC5 | PRD NFR-P1 | `r3f-perf` | Check FPS counter during explosion. |
| AC6 | UX Spec Sec 2.2 | `TreeParticles.tsx` | Toggle state back and forth. |

## Risks, Assumptions, Open Questions

*   **Risk:** Texture Atlas resolution limits.
    *   *Mitigation:* Use a 2048x2048 atlas. If resolution is too low for close-ups, we rely on the "Hybrid Interaction" pattern (Epic 3) to swap in high-res meshes for the active photo.
*   **Assumption:** We have a set of dummy images to use for the texture atlas for development.
*   **Open Question:** Exact "damping" values for the physics. Will need tuning during implementation.

## Test Strategy Summary

*   **Visual Regression:** Compare the "Tree" state and "Cloud" state against design mocks.
*   **Performance Testing:** Stress test with 20,000 particles to ensure shader efficiency.
*   **Device Testing:** Verify the explosion effect works on a mobile device (touch input).
