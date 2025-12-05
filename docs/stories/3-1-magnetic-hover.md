# Story 3.1: Magnetic Hover & Camera Drift

Status: review

## Story

As a User,
I want the photos to drift gently and respond to my mouse with a magnetic hover effect,
so that the memory cloud feels alive, immersive, and responsive to my interaction.

## Acceptance Criteria

1. **Magnetic Hover:** When hovering a floating photo, it must visually "react" with smooth transition: scale up to 1.5x, significantly slow down its rotation, and dynamically tilt in 3D space. [Source: docs/stories/tech-spec-epic-3.md#acceptance-criteria-authoritative]
2. **3D Tilt Interaction:** The photo card must tilt dynamically as the mouse moves over it, creating a natural physical interaction where tilt angles (X/Y) smoothly follow the mouse position relative to the card center. [Source: docs/stories/tech-spec-epic-3.md#acceptance-criteria-authoritative]
3. **Cursor Feedback:** The cursor uses the standard pointer when hovering a photo (no custom icon) to keep focus on the simulation. [Source: docs/stories/tech-spec-epic-3.md#acceptance-criteria-authoritative]
4. **Camera Drift:** When the user is inactive (no interaction), the camera slowly "Dollies In" towards the center of the cloud to create a sense of movement. [Source: docs/stories/tech-spec-epic-3.md#acceptance-criteria-authoritative]

## Tasks / Subtasks

- [x] Implement Camera Drift Logic (AC: 4)
  - [x] Update `Scene.tsx` or `Controls.tsx` to include an auto-forward camera movement when `isExploded` is true and user is idle.
  - [x] Ensure drift is subtle and pauses/resets on user interaction (orbiting).
- [x] Implement Magnetic Hover on PolaroidPhoto (AC: 1, 3)
  - [x] Create `useHover` logic in `PolaroidPhoto.tsx` using `onPointerOver`/`onPointerOut`.
  - [x] Animate scale to 1.5x on hover (spring physics recommended).
  - [x] Dampen/Slow rotation speed on hover.
  - [x] Verify standard cursor usage.
- [x] Implement 3D Tilt Interaction (AC: 2)
  - [x] Add `onPointerMove` handler to `PolaroidPhoto.tsx`.
  - [x] Calculate relative mouse position on the mesh UV/surface.
  - [x] Apply rotational tilt (X/Y axis) based on mouse offset (Parallax effect).
- [x] Verify Performance & Feel
  - [x] Ensure 60FPS during hover transitions.
  - [x] Verify tilt feels "physical" and not jittery.
  - [x] Test on varying screen sizes.

## Dev Notes

- **Architecture Patterns:**
  - **Hybrid Interaction**: We are interacting directly with the `PolaroidPhoto` React components (Instances/Meshes) generated in Story 2.3, not the raw Points cloud.
  - **Animation**: Use `framer-motion-3d` or `react-spring` (via R3F `useFrame` lerping) for smooth scale/tilt transitions. Avoid heavy re-renders.
  - **State**: Hover state should remain local to the component (or purely visual) where possible to avoid global state thrashing, unless needed for other logic (like "hoveredPhotoId" in store if architecturally required for sound/global effects). Tech spec mentions `hoveredPhotoId` in store - check if strictly needed or if local state suffices for visual-only effects.

### Project Structure Notes

- **Target Files**: `src/components/canvas/PolaroidPhoto.tsx`, `src/components/canvas/Scene.tsx` (for camera).
- **Alignment**: Follows established component structure.

### References

- [Source: docs/stories/tech-spec-epic-3.md](docs/stories/tech-spec-epic-3.md) - Full Epic 3 Spec.
- [Source: docs/architecture.md#5-novel-pattern-designs](docs/architecture.md) - Interaction patterns.

## Dev Agent Record

### Context Reference

- [Context File](./3-1-magnetic-hover.context.xml)

### Agent Model Used

Gemini 2.0 Flash

### Debug Log References

- 2025-12-05: Initial implementation plan - Camera drift using OrbitControls idle detection, Magnetic Hover with refs-based animation, 3D Tilt via pointer move events.

### Completion Notes List

- Implemented Camera Drift in `Experience.tsx`: Uses `useFrame` with idle detection (2s threshold). Camera slowly dollies forward when user is inactive. Pauses when user interacts with OrbitControls.
- Implemented Magnetic Hover in `PolaroidPhoto.tsx`: Scale smoothly transitions to 1.5x on hover using exponential lerp. Rotation speed reduced to 10% of normal (0.1 multiplier).
- Implemented 3D Tilt Interaction in `PolaroidPhoto.tsx`: Pointer move calculates normalized offset from card center, applies X/Y rotation tilt up to ±14° (~0.25 rad). Smooth interpolation prevents jitter.
- Performance: Used refs for all animation state to avoid React re-renders. Exponential lerp provides smooth 60fps transitions.
- Cursor: Standard pointer cursor used on hover (no custom icon per AC:3).

### File List

- modified: src/components/canvas/Experience.tsx (Camera Drift logic)
- modified: src/components/canvas/PolaroidPhoto.tsx (Hover/Tilt interaction)

## Dev Notes - Learnings from Previous Story

**From Story 2-3-morphing-effect (Status: done)**

- **Component Reuse**: `PolaroidPhoto.tsx` is already implemented with shared geometries. Re-use this component for the hover logic.
- **Performance**: Story 2.3 verified >30FPS. Maintain this by using `refs` for animation in `useFrame` rather than React state updates for every frame of the tilt.
- **Motion**: 2.3 implemented basic orbit/rotation. This story enhances it with interaction.
- **UI Lag**: 2.3 fixed UI lag with debounce. Ensure hover effects don't introduce new lag (e.g., don't update global store on every mouse move).

[Source: docs/stories/2-3-morphing-effect.md#Dev-Agent-Record]
