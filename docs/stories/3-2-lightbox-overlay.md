# Story 3.2: Lightbox Overlay & Live Photo

**Epic:** 3 - Memory Interaction & Lightbox
**Status:** Review

## Description
As a User,
I want to click on a floating photo to seamlessly "zoom in" to it,
Maintaining the physical presence of the card (tilt, texture) by reusing the existing hover interactions,
And optionally seeing the "Live Photo" video play automatically,
So that the experience feels like physically examining a memory rather than opening a separate digital popup.

## Acceptance Criteria

### 1. Immersive Zoom (Camera & Scale)
- **Given** I am in the "Exploded" state.
- **When** I click on a photo.
- **Then** the Camera should smoothly pan/dolly to center that specific photo (using a custom Camera Controller).
- **And** the Photo itself should scale up (e.g., to fill more of the screen) relative to its neighbors.
- **And** the Photo must **NOT** disappear (update `PolaroidPhoto.tsx` to remain visible).
- **And** the background should NOT be covered by a gray overlay (remove `LightboxPlane` mask).
- **And** different depth of field should be applied to blur the background.

### 2. Live Photo Playback
- **Given** a photo has an associated video.
- **When** it enters the "Zoomed" (Active) state.
- **Then** the video should auto-play seamlessly (replacing the image texture).
- **And** NO "Play" button should be visible (auto-play).
- **And** when zooming out, the video pauses/stops.

### 3. Interaction Extension (Reusing Hover)
- **Given** a photo is "Zoomed" (Active).
- **Then** the "Magnetic Hover" physics (3D Tilt based on mouse position) defined in Story 3.1 must remain active.
- **And** I can still tilt the photo by moving the mouse.
- **And** I can click the empty background/Zoomed-Out area to Close/Reset.

### 4. Continuous Navigation
- **Given** I am zoomed into Photo A.
- **When** I click on Photo B (visible in background).
- **Then** Camera should smoothly transition from A to B.
- **And** Photo A scales down, Photo B scales up.

## Tasks / Subtasks

- [x] **Refactor Architecture (Remove LightboxPlane)**
  - [x] Delete `src/components/canvas/LightboxPlane.tsx`.
  - [x] Remove `LightboxPlane` from `Experience.tsx`.
  - [x] Remove separate "overlay" state logic (or re-purpose `activePhoto` for zoom target).

- [x] **Enhance PolaroidPhoto (The "Active" State)**
  - [x] Update `PolaroidPhoto.tsx` to **Stay Visible** when active (Remove early return `if (isThisActive) return null`).
  - [x] Update `useFrame` logic: If `active`, interpolate Scale to `ZOOM_SCALE` (e.g., 2.5x).
  - [x] **Reuse Hover Logic:** Ensure tilt/rotation physics continue to work in Active state.
  - [x] Implement Video Texture swapping for Active state (`useVideoTexture` conditionally).

- [x] **Implement Camera Controller**
  - [x] Create `src/components/canvas/CameraController.tsx`.
  - [x] Logic: If `activePhotoId` is set, disable `OrbitControls` (or override).
  - [x] Animate Camera Position to `PhotoPosition + Offset` (Vector math).
  - [x] LookAt `PhotoPosition`.

- [x] **Polishing**
  - [x] Adjust Depth of Field (Focus on active photo).
  - [x] Fix "Disappearing" bug: Ensure z-indexing/render order handles the zoomed photo correctly.
  - [x] Verify "Multi-Select" logic (Clicking B while A is active).

## Dev Agent Record

### Completion Notes
**Completed:** 2025-12-06
**Definition of Done:** AI Review

### Completion Notes List
- Pivoted Lightbox approach to "Immersive Zoom" per User Feedback (2025-12-06).
- Removed `LightboxPlane.tsx` and refactored `Experience.tsx` to use `CameraController`.
- Implemented `CameraController` for smooth camera transitions to active photos.
- Updated `PolaroidPhoto` to scale up (2.5x) and play video (if available) when active.
- Added responsive HTML Close Button to `PolaroidPhoto`.
- Fixed Disappearing Bug by ensuring `PolaroidPhoto` renders in active state.
- Addressed Review Findings related to Overlay Mask, Play Button, and Disappearing Bug.
- **Note:** Keyboard Navigation (Previous Review Item) descoped from this pivot iteration to focus on visual transition and new immersive mechanics.

### File List
- modified: src/components/canvas/Experience.tsx
- modified: src/components/canvas/PolaroidPhoto.tsx
- created: src/components/canvas/CameraController.tsx
- deleted: src/components/canvas/LightboxPlane.tsx

### Debug Log
- 2025-12-06: Initialized Tasks based on Acceptance Criteria.
- 2025-12-06: Completed implementation of Lightbox and Live Photo features.
- 2025-12-06: Refactored implementation to support "Immersive Zoom" (Pivot).

## Technical Implementation Notes

### State Management
- Update `useStore` to handle `activePhotoId`.
- When `activePhotoId` is set, `Experience` triggers the Lightbox mode.

### Hybrid Animation Strategy
- **Transition:** Camera moves to the photo logic.

### Video Handling
- Use `useVideoTexture` via `VideoHandler` helper in `PolaroidPhoto`.

### Assets
- Refer to `src/config/assets.ts`:
  ```typescript
  export type Memory = {
    id: string;
    image: string;
    video: string | null; // check this
  };
  ```

## Design System
- **Overlay:** Use standard "Midnight Magic" styles (Glassmorphism) for the Close button.
- **Dimming:** Fullscreen HTML `div` with `backdrop-filter: blur(10px)` and semi-transparent black overlay, OR a 3D Plane behind the photo. HTML overlay is usually easier for accessibility + blur.

## Senior Developer Review (AI)

### Reviewer: BMad
### Date: 2025-12-06
### Outcome: BLOCKED
**Justification:** Critical tasks marked as complete are missing from the codebase. Specifically, the keyboard navigation (Tab/Arrows) and touch interaction features required by Acceptance Criteria #3 are not implemented, despite being checked off in the Tasks list.

### Summary
The core specific functionality of the Lightbox (Opening, Video Playback, Closing) is implemented and working well. The visual transition and 3D implementations are solid. However, the accessibility and navigation features (Keyboard traversal, Drag to switch) are completely missing, which constitutes a failure to meet the Definition of Done as claimed in the story tasks.

### Key Findings
- **High Severity:** Task "Ensure focus management (Tab/Enter) works" is marked `[x]` but **NO implementation found**. `LightboxPlane.tsx` only listens for `Escape`.
- **High Severity:** AC #3 requirement "cycle focus" with Tab/Arrow keys is not met.
- **Medium Severity:** AC #3 requirement "drag horizontally... to switch" is not met.

### Acceptance Criteria Coverage
| AC# | Description | Status | Evidence |
| :--- | :--- | :--- | :--- |
| 1 | Lightbox Activation | **IMPLEMENTED** | `PolaroidPhoto.tsx`: 582 (Click), `LightboxPlane.tsx`: 157 (Anim) |
| 2 | Live Photo Playback | **IMPLEMENTED** | `LightboxPlane.tsx`: 197 (VideoPlayer), `assets.ts`: 40 |
| 3 | Lightbox UI & Navigation | **PARTIAL** | Close/ESC works. **Missing**: Tab/Arrow nav, Drag interaction. |
| 4 | Closing & Return | **IMPLEMENTED** | `LightboxPlane.tsx`: 140 (Reverse Anim) |

**Summary:** 3 of 4 ACs fully implemented. AC 3 is significantly incomplete.

### Task Completion Validation
| Task | Marked As | Verified As | Evidence |
| :--- | :--- | :--- | :--- |
| Implement State & Lightbox | [x] | **VERIFIED** | `useStore`, `LightboxPlane` exist |
| Implement Transition | [x] | **VERIFIED** | Animation logic in `LightboxPlane` |
| Implement Live Photo | [x] | **VERIFIED** | `VideoPlayer` component |
| Create HTML Overlay | [x] | **CHANGED** | Implemented as 3D Mesh (acceptable deviation) |
| Bind ESC key | [x] | **VERIFIED** | `LightboxPlane.tsx`: 118 |
| **Ensure focus management** | **[x]** | **FALSE** | **No code found for Tab/Enter navigation** |

### Architectural Alignment
- **Aligned:** Follows the "Hybrid Interaction" pattern using `useStore` and `activePhotoId`.
- **Note:** `PolaroidPhoto.tsx` optimization using refs is excellent.

### User Feedback & Optimization Requirements (2025-12-06)
The following requirements have been added by the Product Owner to strictly refine the Lightbox behavior:

1.  **Immersive Zoom (No Isolated Overlay):** Cancel the separate 2D/3D overlay approach. Instead, create a seamless "zoom-in" effect where the camera moves to center the specific photo particle, and the particle itself scales up (Polaroid close-up style). Crucially, **retain original hover effects** (tilt/stop rotation) during this state.
2.  **Transparent Backdrop:** Remove or hide the gray/dimming overlay mask. The background should remain visible (though potentially out of focus via DOF) to maintain immersion.
3.  **Remove Play Button:** Remove the explicit video play button icon from the photo UI. Video should play automatically or seamlessly without UI clutter.
4.  **Responsive Close Button:** The Close/Delete button must be responsive (hover states) and properly sized to avoid visual abruptness.
5.  **Multi-Photo Interaction:** Clicking another photo while one is zoomed should seamless transition: Close current -> Zoom new (or direct transition). The other photos must remain interactive (hoverable/clickable).
6.  **Fix Disappearing Bug:** Fix issue where photo particles disappear or fail to render after returning from the zoomed state.

### Action Items
**(CRITICAL - Must fix to Unblock)**
- [x] [High] **Refactor Lightbox Mechanism:** Replace `LightboxPlane` overlay with a Camera-Controls driven approach (animate target/zoom) to satisfy Requirement #1.
- [x] [High] **Remove Overlay Mask:** Ensure no gray backdrop is rendered (Req #2).
- [x] [Med] **Remove Play Button:** Remove play icon from `VideoPlayer` or texture overlays (Req #3).
- [x] [Med] **Fix Close Button:** Style the close button to be responsive and appropriately sized (Req #4).
- [x] [High] **Fix Disappearing Photo:** Debug `PolaroidPhoto` visibility logic ensuring it resets correctly on close (Req #6).
- [x] [High] **Implement Multi-Select Logic:** clicking a new photo while active should swap smoothly (Req #5).
- [ ] [High] Implement keyboard navigation (Tab/Arrow keys) to cycle through photos while Lightbox is open. (AC #3) [file: src/components/canvas/LightboxPlane.tsx]
- [ ] [Med] Implement horizontal drag gesture to switch to next/prev photo. (AC #3) [file: src/components/canvas/LightboxPlane.tsx]
- [x] [High] Update specific tasks in Story to reflect actual state if features are descoped, or implement them if required.

**(Advisory)**
- [ ] [Low] Consider extracting `VideoPlayer` to its own file if it grows.

