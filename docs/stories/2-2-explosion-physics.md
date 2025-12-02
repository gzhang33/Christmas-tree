# Story 2.2: Explosion Physics & Shader Upgrade

Status: drafted

## Story

As a User,
I want the tree to explode with a specific "radial force" and "damping" effect,
so that it feels like a release of energy rather than just linear movement.

## Acceptance Criteria

1. **Given** the `TreeParticles` component, **When** I click the tree (triggering `isExploded`), **Then** the particles should move using the "GPU State Machine" pattern [Source: docs/architecture.md#5-novel-pattern-designs].
2. **And** the movement should follow a Bezier curve (Start -> Explosion Vector -> Float Position) [Source: docs/epics.md#story-22-explosion-physics--shader-upgrade].
3. **And** the animation should be driven by a `uProgress` uniform (0 to 1) interpolated by `useFrame`.
4. **And** performance should remain >30fps during explosion (FR1, FR9).

## Tasks / Subtasks

- [x] Create Shader Files (AC: 1, 2)
  - [x] Create `src/shaders` directory
  - [x] Implement `src/shaders/particle.vert` with Quadratic Bezier logic
  - [x] Implement `src/shaders/particle.frag` with basic color support
- [x] Refactor `TreeParticles.tsx` for GPU State Machine (AC: 1, 3)
  - [x] Generate `positionStart` (current tree pos), `positionEnd` (random float pos), `controlPoint` (explosion vector) attributes
  - [x] Replace `PointsMaterial` with `ShaderMaterial` using new uniforms (`uProgress`, `uTime`)
  - [x] Update `useFrame` to animate `uProgress` based on `isExploded` state
- [x] Implement Physics Logic (AC: 2)
  - [x] Calculate `controlPoint` based on radial explosion force
  - [x] Calculate `positionEnd` for floating state (random distribution)
- [x] Performance Optimization (AC: 4)
  - [x] Ensure attribute generation happens only once (useMemo)
  - [ ] Verify FPS during transition using `r3f-perf`
- [ ] Verify Build and Lint
  - [ ] Run type check

## Dev Notes

- **Architecture Patterns:**
  - **GPU State Machine Interpolation:** Use a vertex shader driven by `uProgress` to handle the transition. Avoid CPU-side position updates for 20k+ particles [Source: docs/architecture.md#5-novel-pattern-designs].
  - **Shader Management:** Store shaders in `src/shaders/` as per structure [Source: docs/architecture.md#4-project-structure].

- **Testing Standards:**
  - Verify performance stays above 30fps during the explosion animation.
  - Visually verify the "damping" effect (fast start, slow end).

### Project Structure Notes

- **New Directory:** `src/shaders/`
- **New Files:** `particle.vert`, `particle.frag`
- **Modified File:** `src/components/canvas/TreeParticles.tsx`

### Learnings from Previous Story

**From Story 2-1-theme-config (Status: done)**

- **Component Size Warning:** `TreeParticles.tsx` is becoming large (>900 lines). Consider extracting shader logic or attribute generation into custom hooks (e.g., `useExplosionAttributes`, `useParticleShader`) to maintain readability.
- **Performance:** Continue using `useEffect` for reactive updates where possible, but note that `ShaderMaterial` uniforms are best updated in `useFrame`.
- **Theme Integration:** Ensure the new `ShaderMaterial` continues to support the dynamic theme colors implemented in Story 2.1.

[Source: stories/2-1-theme-config.md#Dev-Agent-Record]

### References

- [Source: docs/epics.md#story-22-explosion-physics--shader-upgrade] - Epic Requirements
- [Source: docs/architecture.md#5-novel-pattern-designs] - GPU State Machine Pattern
- [Source: docs/ux-design-specification.md#22-novel-ux-patterns] - Explosion Physics Description

## Dev Agent Record

### Context Reference

- [Context File](./2-2-explosion-physics.context.xml)

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
