# Story 2.2: Explosion Physics & Shader Upgrade

**Status:** drafted

## Story

**As a** User,
**I want** the tree to explode with a specific "radial force" and "damping" effect,
**So that** it feels like a release of energy rather than just linear movement.

## Acceptance Criteria

1.  **Given** the `TreeParticles` component, **When** I click the tree (triggering `isExploded`), **Then** the particles should move using the "GPU State Machine" pattern (Architecture Spec).
2.  **And** the movement should follow a Bezier curve (Start -> Explosion Vector -> Float Position).
3.  **And** the animation should be driven by a `uProgress` uniform (0 to 1).
4.  **And** performance should remain >30fps during explosion (FR1, FR9).
5.  **And** `particle.vert` and `particle.frag` shaders are implemented and used.

## Tasks / Subtasks

- [ ] **Shader Development**
    - [ ] Create `src/shaders/particle.vert` implementing Quadratic Bezier interpolation (Start -> Control -> End).
    - [ ] Create `src/shaders/particle.frag` handling basic color rendering (will be enhanced in 2.3).
- [ ] **Component Update (`TreeParticles.tsx`)**
    - [ ] Calculate `positionStart` (current tree positions).
    - [ ] Calculate `positionEnd` (random floating positions in a cloud).
    - [ ] Calculate `controlPoint` (Start + Explosion Vector) for the Bezier curve.
    - [ ] Pass these as attributes to the `ShaderMaterial`.
    - [ ] Pass uniforms: `uProgress`, `uTime`, `uColor` (base color).
    - [ ] Implement `useFrame` loop to interpolate `uProgress` based on `isExploded` state (using damping/lerp).
- [ ] **Integration & Verification**
    - [ ] Connect `useStore` `isExploded` state.
    - [ ] Verify explosion animation smoothness (>30fps).
    - [ ] Verify "Implosion" (returning to tree) works by reversing `uProgress`.

## Dev Notes

### Architecture Patterns

- **GPU State Machine**: Use vertex shader for position calculations to maintain performance with 20k+ particles.
- **Bezier Interpolation**: `P = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2` where P0=Start, P1=Control, P2=End.
- **Reference**: [Source: docs/architecture.md#5-novel-pattern-designs]

### Learnings from Previous Story (2-1)

- **From Story 2-1 (Status: done)**
    - **Color System**: `TreeParticles` generates `themeColors` (base, light, deep, dark) using `useMemo`. We must pass these colors to the shader.
    - **Suggestion**: Pass the calculated colors as a `color` attribute (vec3) to the shader so each particle keeps its assigned color theme.
    - **State**: `treeColor` is available in `useStore`.

### Technical Details

- **Uniforms**:
    - `uProgress`: float (0.0 = Tree, 1.0 = Photos)
    - `uTime`: float (for floating noise)
- **Attributes**:
    - `aPositionStart`: vec3
    - `aPositionEnd`: vec3
    - `aControlPoint`: vec3
    - `aColor`: vec3 (from Story 2.1 logic)

## Change Log

- 2025-12-02: Story drafted based on Epic 2 and Architecture Spec.

## Dev Agent Record

### Context Reference
- [Context File](2-2-explosion-physics.context.xml)

