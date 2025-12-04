# Story 2.2: Explosion Physics & Shader Upgrade

Status: ready-for-dev

## Story

As a User,
I want the tree to explode with a specific "radial force" and "damping" effect,
so that it feels like a release of energy rather than just linear movement.

## Acceptance Criteria

1. Clicking the tree triggers the explosion state (`isExploded = true`). [Source: docs/epics.md]
2. Particles transition from tree shape to floating photo cloud using a "GPU State Machine" pattern. [Source: docs/architecture.md]
3. Particle movement follows a Quadratic Bezier curve (Start -> Control Point -> End). [Source: docs/architecture.md]
4. Animation is driven by a `uProgress` uniform (0.0 to 1.0) interpolated over time. [Source: docs/architecture.md]
5. Performance remains >30 FPS during the explosion animation. [Source: docs/prd.md]
6. Explosion visual matches "Midnight Magic" aesthetic (high velocity, rapid damping). [Source: docs/ux-design-specification.md]

## Tasks / Subtasks

- [ ] Implement `particle.vert` shader with Bezier interpolation logic (AC: #2, #3)
  - [ ] Define attributes: `positionStart`, `positionEnd`, `controlPoint`
  - [ ] Define uniforms: `uProgress`, `uTime`
  - [ ] Implement quadratic bezier function
  - [ ] Test shader compilation
- [ ] Implement `particle.frag` shader foundation (AC: #6)
  - [ ] Basic color mixing based on progress
  - [ ] Ensure "Midnight Magic" colors are supported
- [ ] Update `TreeParticles.tsx` to use custom shader material (AC: #2)
  - [ ] Load `particle.vert` and `particle.frag`
  - [ ] Create `ShaderMaterial` with uniforms
  - [ ] Replace `PointsMaterial` with `ShaderMaterial`
- [ ] Implement "Explosion" trigger logic in `TreeParticles.tsx` (AC: #1, #4)
  - [ ] Connect `onClick` to `useStore.triggerExplosion`
  - [ ] Use `useFrame` to interpolate `uProgress` uniform when `isExploded` is true
  - [ ] Implement damping logic for smooth transition
- [ ] Generate particle attributes for physics (AC: #3)
  - [ ] Calculate `positionEnd` (random float position within bounds)
  - [ ] Calculate `controlPoint` (Start + Explosion Vector)
  - [ ] Pass attributes to geometry
- [ ] Verify performance with `r3f-perf` (AC: #5)
  - [ ] Check FPS during transition
  - [ ] Optimize attribute updates if needed

## Dev Notes

- **Architecture Pattern:** GPU State Machine Interpolation. All movement must happen in the vertex shader.
- **Math:** Quadratic Bezier Curve: `B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2`.
- **State Management:** Use `useStore` to track `isExploded`. The 3D component should react to this state change.
- **Performance:** Do NOT update particle positions on the CPU every frame. Only update the `uProgress` uniform.

### Project Structure Notes

- **Shaders:** Create `src/shaders/particle.vert` and `src/shaders/particle.frag`.
- **Components:** Modify `src/components/canvas/TreeParticles.tsx`.
- **Config:** Use `src/config/theme.ts` for any color uniforms.

### References

- [Source: docs/architecture.md#5-novel-pattern-designs] (GPU State Machine)
- [Source: docs/epics.md#story-22-explosion-physics--shader-upgrade] (Story Definition)
- [Source: docs/ux-design-specification.md#22-novel-ux-patterns] (Explosion Physics)

## Dev Agent Record

### Context Reference

- [Context File](docs/stories/2-2-explosion-physics.context.xml)

### Agent Model Used

Gemini 2.0 Flash

### Debug Log References

### Completion Notes List

### File List

### Learnings from Previous Story

**From Story 2-1-color-config (Status: done)**

- **New Config Files**: `src/config/theme.ts` and `src/config/assets.ts` are now available. Use them for colors and assets.
- **Performance Optimization**: In Story 2-1, we separated color updates from position generation using `useEffect`. Maintain this pattern to avoid unnecessary re-renders.
- **Component Size**: `TreeParticles.tsx` is getting large (>900 lines). Be careful when adding new logic. Consider extracting helper functions for attribute generation.
- **Theme System**: The theme system is now reactive. Ensure the new shader implementation supports dynamic theme changes (pass colors as uniforms).

[Source: stories/2-1-color-config.md#Dev-Agent-Record]

## Change Log

- 2025-12-04: Story drafted based on Epic 2 requirements.
