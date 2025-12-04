# Story 2.5: Ornament Refinement & Fixes

**Status:** drafted

## Story

**As a** User,
**I want** the ornaments on the Christmas tree to be clearly visible, correctly textured, and positioned only on the tree branches,
**So that** the tree looks decorated and festive, without ornaments floating in the magic halo or looking like glitches.

## Context

Split from Story 2.4. While the core visual engine is polished, the specific rendering and placement of "Ornament" particles (Gifts, Balls, etc.) need dedicated refinement. Specifically, they need to use proper sprite textures (not just colored dots), be sized appropriately for visibility, and be strictly constrained to the tree volume (avoiding the new "Halo" area).

## Acceptance Criteria

1.  **Visuals (Textures):** Ornaments must render using high-quality PNG sprites from `public/sprites/` (not SVG imports or generated placeholders).
2.  **Visuals (Size):** Ornaments must be large enough to be clearly identifiable (e.g., distinct from the smaller "magic dust" or "glow" particles).
3.  **Placement (Constraint):** Ornaments must **ONLY** appear within the volume of the Christmas tree cone. They must **NEVER** appear in the outer "Magic Halo" ring.
4.  **Placement (Distribution):** Ornament positions should be randomized within the tree volume to look natural (avoiding obvious spiral or grid patterns).

## Tasks

- [ ] **Resource Loading**
    - [ ] Switch texture loading to use `public/sprites/*.png` (gift-box, ornament-ball, etc.).
    - [ ] Ensure `TreeParticles.tsx` correctly maps these textures to the sprite atlas.
- [ ] **Ornament Configuration**
    - [ ] Increase `sizeMult` for ornaments to ensure visibility (target ~24.0 or visually appropriate).
    - [ ] Verify `aType` or `vType` logic ensures ornaments use the sprite shader path.
- [ ] **Positioning Logic**
    - [ ] Refactor `ornamentData` generation in `TreeParticles.tsx`.
    - [ ] Implement strict bounds checking: `position` must be inside the Tree Cone.
    - [ ] Explicitly exclude the "Halo" radius range from ornament generation.
    - [ ] Implement random distribution (remove any legacy spiral logic if present).

## Dev Notes

- **Constraint:** The "Magic Halo" (implemented in Story 2.4) occupies a specific radius range outside the tree. Ornaments must strictly have `radius < tree_max_radius`.
- **Assets:** Use the files in `public/sprites/`. If missing, use `generate_image` to create placeholders or ask the user.

## Dev Agent Record

### Agent Model Used
- Gemini 2.0 Flash
