# Story 2.3: Morphing Effect (Particle to Photo)

Status: drafted

## Story

As a User,
I want the particles to transform into photos,
So that I understand the connection between the tree and the memories.

## Acceptance Criteria

1. **Given** the explosion animation is active, **When** `uProgress` increases, **Then** particles should scale up to "card size" [Source: docs/epics.md#story-23-morphing-effect-particle-to-photo].
2. **And** the texture should cross-fade from "glow dot" to "photo texture" (FR10) [Source: docs/epics.md#story-23-morphing-effect-particle-to-photo].
3. **And** the particles should end up in a floating, drifting state (FR11) [Source: docs/epics.md#story-23-morphing-effect-particle-to-photo].
4. **And** performance should remain >30fps during morphing transition (FR1, FR9).

## Tasks / Subtasks

- [ ] Create Texture Atlas System (AC: 1, 2)
  - [ ] Load photo textures from `MEMORIES` array in `assets.ts`
  - [ ] Create texture atlas or texture array for GPU-efficient photo mapping
  - [ ] Generate `uvOffset` and `uvScale` attributes for each particle mapping to specific photo
- [ ] Update Shader for Texture Mixing (AC: 2)
  - [ ] Update `particle.frag` shader to support texture sampling from atlas
  - [ ] Implement `mix()` function to cross-fade from vertex color (glow dot) to photo texture based on `uProgress`
  - [ ] Ensure smooth transition (0.0 = tree color, 1.0 = photo texture)
- [ ] Implement Scale Animation (AC: 1)
  - [ ] Update vertex shader to scale particle size based on `uProgress`
  - [ ] Scale from small glow dot (0.55) to card size (target size TBD, e.g., 2.0-3.0)
  - [ ] Use smooth easing function for scale transition
- [ ] Implement Floating State (AC: 3)
  - [ ] Add floating drift animation using `uTime` uniform
  - [ ] Apply gentle rotation and position drift to particles when `uProgress` approaches 1.0
  - [ ] Ensure particles remain in view (no flying off-screen)
- [ ] Integrate with TreeParticles Component (AC: 1, 2, 3)
  - [ ] Update `TreeParticles.tsx` to use ShaderMaterial with texture atlas
  - [ ] Generate texture atlas attributes (`uvOffset`, `uvScale`) for each particle
  - [ ] Map particles to photos from `MEMORIES` array (distribute photos across particles)
  - [ ] Update uniforms to drive morphing animation
- [ ] Performance Optimization (AC: 4)
  - [ ] Ensure texture atlas generation happens only once (useMemo)
  - [ ] Verify FPS remains >30fps during morphing transition
  - [ ] Optimize texture loading (preload or lazy load)
- [ ] Verify Build and Lint
  - [ ] Run type check

## Dev Notes

- **Architecture Patterns:**
  - **GPU State Machine Interpolation:** Use shader-based texture mixing with `mix()` function to cross-fade from tree color to photo texture [Source: docs/architecture.md#5-novel-pattern-designs].
  - **Texture Atlas:** Use texture atlas or texture array for efficient GPU rendering of multiple photos [Source: docs/architecture.md#5-novel-pattern-designs].

- **Testing Standards:**
  - Verify performance stays above 30fps during the morphing animation.
  - Visually verify the cross-fade effect from glow dot to photo texture.
  - Verify particles enter floating, drifting state without flying off-screen.

### Project Structure Notes

- **Modified File:** `src/components/canvas/TreeParticles.tsx`
- **New/Updated Files:** `src/shaders/particle.vert.glsl`, `src/shaders/particle.frag.glsl` (or update existing shaders)
- **Reference:** `src/config/assets.ts` (MEMORIES array)

### Learnings from Previous Story

**From Story 2-2-explosion-physics (Status: backlog)**

- **Shader Integration:** Story 2.2 implements GPU State Machine with Bezier interpolation. Story 2.3 builds on this by adding texture mixing and scale animation to the same shader system.
- **Performance:** Continue using GPU-based rendering for all morphing effects to maintain >30fps performance.
- **Component Size:** `TreeParticles.tsx` is large. Consider extracting texture atlas generation into a custom hook (e.g., `useTextureAtlas`) to maintain readability.

### References

- [Source: docs/epics.md#story-23-morphing-effect-particle-to-photo] - Epic Requirements
- [Source: docs/architecture.md#5-novel-pattern-designs] - GPU State Machine Pattern
- [Source: docs/ux-design-specification.md#22-novel-ux-patterns] - Morphing Effect Description

## Dev Agent Record

### Context Reference

- [Context File](./2-3-morphing-effect.context.xml)

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

