# 📋 Project Checklist: 3D Christmas Tree & Photo Wall Optimization

**Instruction for Agent:** Please review the code against the following checklist. Mark tasks as completed `[x]` only after implementing the code and verifying the logic.

## 🎄 Part 1: Christmas Tree Scene (Initial State)

- [x] **[TREE-01] Idle Animation (Breathing Light)**
  - **Task:** Implement a rhythmic loop animation for the tree body.
  - **Logic:** Cycle duration 2-3 seconds.
  - **Effect:** Gentle scale up/down or opacity pulse to indicate "Standby" mode.
  - **Implementation:** Multi-layer breathing animation implemented in `particle.vert` shader (lines 104-115) with configurable frequencies (0.6Hz, 1.2Hz, 0.4Hz) and amplitudes (0.04, 0.03, 0.02). Uniforms set in `createParticleShaderMaterial` and updated in `useFrame` loop. Creates organic radial expansion effect combined with sway animation.

- [x] **[TREE-03] Particle Title ("Merry Christmas")**
  - **Task:** Refactor the left-top title to use a Particle System instead of static text.
  - **Animation:** Add gentle breathing/twinkling.
  - **Event:** On tree explosion, trigger particle dispersion (fade out) for the title simultaneously.
  - **Implementation:** Created `ParticleTitle.tsx` with canvas-based particle rendering, breathing animation, and dispersion effect.

- [x] **[TREE-04] Color Palette Enhancement**
  - **Task:** Update particle color mixing logic.
  - **Requirement:** Keep Pink/Gold base, but inject small percentages of **Warm Gold** and **Deep Red** particles.
  - **Goal:** Increase visual depth and festive atmosphere.
  - **Implementation:** Added `warmGold` (#FFB347) and `deepRed` (#8B0000) to STATIC_COLORS, injected 3-8% into particle colors.

- [x] **[TREE-05] 3D Base Model Optimization**
  - **Task:** Optimize existing particle gift styles to form the base.
  - **Strategy:** Reuse current project functionality; avoid recreating assets unless strictly necessary for performance.
  - **Goal:** Fix the "floating tree" visual issue.

- [x] **[TREE-06] Audio Control UI**
  - **Task:** Implement a dropdown menu or toggle for background music selection.
  - **Implementation:** Created `audio.ts` config with 5 music options, added `selectedAudioId` to store, implemented `BackgroundMusicPlayer.tsx` for playback, and added music selection UI with preview functionality in Controls panel.

- [ ] **[TREE-07] Gift Box Icon Polish**
  - **Task:** Optimize the rendering/material of the gift box UI element.

- [x] **[TREE-08] Performance Fix (Particle Count)**
  - **Task:** Debug `dat.GUI` (or current controls).
  - **Fix:** Prevent browser freeze/crash when adjusting the `Particle Count` slider.
  - **Implementation:** Increased debounce delay to 500ms, reduced max particle count from 100k to 50k, increased step to 2500.

  - [x] **[TREE-09] Integrate User 3D Models for Gifts**
  - **Task:** Load .glb files from `public/models` and use them for gift particles.
  - **Strategy:** Use `useGLTF` + `MeshSurfaceSampler` with auto-scaling to fit existing gift dimensions.
  - **Goal:** Replace procedural cubes with user-provided 3D assets while keeping particle effects.


## 💥 Part 2: Transition & Morphing

- [ ] **[TRANS-01] Camera Movement (Cinematic)**
  - **Task:** Trigger camera animation on "Explosion" event.
  - **Action:** Zoom out slightly or rotate camera while particles disperse.
  - **Goal:** Create an "Epic" transition feel.

- [ ] **[TRANS-02] Logic Fix (Tree Color)**
  - **Task:** Fix the state conflict between "Tree Color Change" and "Explosion Animation".
  - **Requirement:** Ensure particles disperse correctly even if the user has modified the tree color previously. The tree mesh must not disappear abruptly.

## 🖼️ Part 3: Photo Wall (Interaction & Physics)

- [ ] **[PHOTO-01] Hover Depth Effect (Z-Axis)**
  - **Task:** On mouse hover:
    1.  Target Photo: Move Z-index forward (Highlight).
    2.  Neighbor Photos: Move Z-index backward (Recede).
  - **Constraint:** Active photo must have `max-z-index` to prevent occlusion by snow/particles.

- [ ] **[PHOTO-02] Focus Mode Visuals (Blur)**
  - **Task:** On click (Active State):
    1.  Apply `Gaussian Blur` filter to the background layer (Snow, other photos).
    2.  Reduce background `Opacity` or `Brightness`.

- [ ] **[PHOTO-03] Anti-Clipping Physics (Repulsion)**
  - **Task:** Implement a simple force-directed graph or repulsion algorithm.
  - **Logic:** If the distance between two photos is less than **150 pixels**, they should repel each other.
  - **Testing Method:** Drag a photo to an overlapping position and check if they automatically separate.
  - **Goal:** Prevent photos from overlapping/clipping into each other at the bottom.

- [ ] **[PHOTO-04] Navigation Anchor (Fly-in/Fly-out)**
  - **Task:** Update click animation.
  - **Open:** Animate position from `Original_Pos` to `Center_Screen`.
  - **Close:** Animate position from `Center_Screen` back to `Original_Pos`.
  - **UI:** Render a semi-transparent dashed border at `Original_Pos` when the photo is open.

- [ ] **[PHOTO-05] 3D Thickness (Extrusion)**
  - **Task:** Modify Photo Geometry.
  - **Action:** Add Z-axis extrusion (thickness) and side shadows.
  - **Style:** Mimic physical Polaroid film texture.

- [ ] **[PHOTO-06] Mobile Gyroscope**
  - **Task:** Add `DeviceOrientation` event listener.
  - **Action:** Map device tilt (Beta/Gamma) to slight camera or photo container offset.