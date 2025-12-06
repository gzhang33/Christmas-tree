# Epic Technical Specification: Memory Interaction & Lightbox

Date: 2025-12-05
Author: Gianni
Epic ID: 3
Status: Contexted

---

## Overview

Epic 3 focuses on transforming the visual spectacle of the "Exploded" tree into a tangible, interactive "Memory Cloud". While Epic 2 handles the physics and rendering of the explosion, Epic 3 implements the user journey *within* that exploded state. This includes the "Magnetic Hover" effect that makes the particles feel responsive, the "Lightbox" overlay for viewing high-fidelity photo/video content, and the "Implosion" mechanism to return to the initial tree state. This epic bridges the gap between a passive visual demo and an interactive application.

## Objectives and Scope

**In-Scope:**
*   **Interactive Drifting:** Implementing the "Magnetic Hover" effect where photos slow down, scale up to 1.5x with smooth transition, and tilt dynamically based on mouse position to simulate realistic Polaroid card physics (FR16).
*   **Lightbox System:** A hybrid UI/3D system to display high-resolution content when a floating photo is clicked (FR17, FR18).
*   **Immersion & Focus:** Background dimming/blurring during Lightbox active state (FR19).
*   **Navigation:** "Return to Tree" functionality (Implosion physics) (FR13).
*   **Camera Dynamics:** Automatic "Dolly In" drift when idle in the cloud state (FR29).
*   **Accessibility:** Keyboard navigation (Tab/Enter) to cycle through and open floating photos (FR37, FR38).

**Out-of-Scope:**
*   User-uploaded content (photos are static assets/configured in code for now).
*   Social sharing or exporting functionalities.
*   VR/AR specific interactions.

## System Architecture Alignment

This epic heavily leverages the **Hybrid Interaction (LOD Switching)** pattern defined in the Architecture Document (Section 5).
*   **Raycasting:** We will use `three`'s Raycaster (via R3F events) on the `Points` object to detect hovers.
*   **State Management:** `useStore` (Zustand) will manage the `activePhotoId` and `isExploded` states, bridging the 3D scene and the React UI.
*   **Overlay Strategy:** The Lightbox will be implemented as a DOM overlay (Framer Motion) for accessibility and text rendering clarity, synchronized with a 3D focus effect.
*   **Shader Integration:** The "Implosion" will reuse the Epic 2 `particle.vert` logic by reversing the `uProgress` uniform driver.

## Detailed Design

### Services and Modules

| Module | Responsibility | Inputs | Outputs | Owner |
| :--- | :--- | :--- | :--- | :--- |
| `TreeParticles.tsx` | Handling raycast events (`onPointerOver`, `onClick`) on the Point Cloud. | Mouse Events, `activePhotoId` | `hover` state, `useStore` updates | R3F Canvas |
| `Lightbox.tsx` | UI Overlay for displaying specific memory content. | `activePhotoId`, `assets` config | DOM Rendering, Close Events | UI |
| `useStore` | Global state container. | `setActivePhoto`, `resetExplosion` | `activePhotoId`, `isExploded` | Core |
| `Controls.tsx` | Triggering the "Return" (Implosion) action. | User Input | `resetExplosion()` | UI |

### Data Models and Contracts

**Store Interface Updates:**
```typescript
interface State {
  // Existing
  isExploded: boolean;
  theme: string;
  
  // New for Epic 3
  activePhotoId: string | null; // ID of the currently open photo (or null)
  hoveredPhotoId: string | null; // ID of the currently hovered photo (for cursor FX)
}

interface Actions {
  setActivePhoto: (id: string | null) => void;
  setHoveredPhoto: (id: string | null) => void;
  triggerImplosion: () => void; // Reverses explosion
}
```

### APIs and Interfaces

**Interaction Events (Internal):**
*   `onPhotoClick(id: string)`: Sets `activePhotoId`. Triggers Lightbox open animation.
*   `onPhotoHover(id: string, mousePosition?: {x: number, y: number})`: Sets `hoveredPhotoId`. Triggers "Magnetic" effect: smooth scale to 1.5x, rotation slowdown, and 3D tilt based on mouse position to simulate realistic Polaroid card physics.
*   `onPhotoHoverMove(mousePosition: {x: number, y: number})`: Updates card tilt angles dynamically as mouse moves over the photo.
*   `onLightboxClose()`: Sets `activePhotoId` to null.

### Workflows and Sequencing

1.  **Explosion to Interactable:**
    *   User clicks Tree -> `isExploded = true`.
    *   Animation completes (`uProgress` -> 1.0).
    *   Raycaster interaction enabled on Cloud.
2.  **Viewing a Memory:**
    *   User hovers particle -> `hoveredPhotoId` set. Photo scales to 1.5x with smooth transition, rotation slows down, and card tilts dynamically based on mouse position (3D tilt effect).
    *   User moves mouse over photo -> Card tilt angles update in real-time to follow mouse movement, creating realistic Polaroid card physics.
    *   User clicks particle -> `activePhotoId` set.
    *   `Lightbox.tsx` detects `activePhotoId` -> Animate In (Fade + Scale).
    *   3D Scene applies "Blur/Dim" effect (Post-processing or Canvas opacity).
3.  **Closing Memory:**
    *   User clicks "X" / Background -> `activePhotoId = null`.
    *   Lightbox Animates Out. 3D Scene restores.
4.  **Return to Tree:**
    *   User clicks "Back" -> `triggerImplosion()`.
    *   `isExploded = false`.
    *   `activePhotoId = null`.
    *   Animation: `uProgress` 1.0 -> 0.0.

## Non-Functional Requirements

### Performance
*   **Raycasting:** Raycasting against 20k points can be expensive. Use `threshold` parameter to make clicking easier without precise pixel hits. Optimize by only raycasting when `isExploded` is true.
*   **Transition Smoothness:** Lightbox open/close must be 60fps. Use CSS transforms/opacity (Framer Motion) rather than unmounting components excessively.

### Security
*   **Content Safety:** (Future proofing) Ensure generic photo placeholders are safe-for-work if using external URLs. Currently local assets.

### Reliability/Availability
*   **State Consistency:** Ensure `activePhotoId` is always cleared if the user triggers "Return to Tree" while a lightbox is open.

### Observability
*   **Interaction Logging:** (Optional) Log which photos are clicked most often for analytics.

## Dependencies and Integrations

*   **Framer Motion:** Used for the Lightbox overlay enter/exit animations.
*   **Zustand:** Central communication hub.
*   **Three.js Raycaster:** Core interaction engine.

## Acceptance Criteria (Authoritative)

1.  **Magnetic Hover:** When hovering a floating photo, it must visually "react" with smooth transition: scale up to 1.5x, slow down rotation, and dynamically tilt in 3D space based on mouse position to simulate realistic Polaroid card physics (FR16).
2.  **3D Tilt Interaction:** The photo card must tilt dynamically as the mouse moves over it, creating a natural physical interaction that mimics a real Polaroid photo responding to touch. The tilt angles (rotation X/Y) should smoothly follow mouse position relative to the card center.
3.  **Cursor Feedback:** Cursor uses standard pointer when hovering a photo (no custom icon to avoid distraction, allowing the natural tilt animation to be the focus).
4.  **Lightbox Open:** Clicking a photo opens the `Lightbox` component centered on screen with high-res content (FR17, FR18).
5.  **Background Focus:** Opening Lightbox dims or blurs the background 3D scene (FR19).
6.  **Closing:** Clicking "X", background, or pressing ESC closes the Lightbox (FR20, FR39).
7.  **Keyboard Nav:** Users can Tab through floating photos and press Enter to open them (FR37, FR38).
8.  **Return Animation:** Clicking "Back" reverses the explosion smoothly, returning particles to tree shape (FR13).
9.  **UI Coordination:** "Back" button is only visible when Exploded and no Lightbox is open.

## Traceability Mapping

| Acceptance Criteria | Spec Section | Component(s) | Test Idea |
| :--- | :--- | :--- | :--- |
| Magnetic Hover | Detailed Design - Workflows | `TreeParticles.tsx` / `PolaroidPhoto.tsx` (onPointerOver, onPointerMove) | Mock Raycaster hover, verify scale transition to 1.5x, rotation slowdown, and tilt angle updates based on mouse position |
| 3D Tilt Interaction | Detailed Design - Workflows | `PolaroidPhoto.tsx` (onPointerMove) | Verify card rotation X/Y angles smoothly follow mouse movement relative to card center |
| Lightbox Open | Detailed Design - Services | `Lightbox.tsx`, `useStore` | Set `activePhotoId`, verify Lightbox component renders |
| Background Focus | Detailed Design - Workflows | `App.tsx` / `Scene.tsx` | Verify Canvas/Container style change when `activePhotoId` is set |
| Keyboard Nav | Objectives - In-Scope | `Scene.tsx` / Hidden A11y DOM | Tab press moves focus, Enter triggers click handler |
| Return Animation | Detailed Design - Workflows | `Controls.tsx`, `TreeParticles` | Trigger `resetExplosion`, monitor `uProgress` uniform decreasing |

## Risks, Assumptions, Open Questions

*   **Risk:** Raycasting performance on mobile with high particle counts.
    *   *Mitigation:* Use a lower resolution "hit box" array or reduce raycast frequency (throttle).
*   **Assumption:** We have high-res versions of the photos available for the Lightbox, separate from the atlas textures.
*   **Question:** Should the camera auto-pan to the specific photo in 3D before opening the 2D lightbox?
    *   *Decision:* No, for MVP, just open the 2D overlay. Camera pan is complex to coordinate with the overlay.

## Test Strategy Summary

*   **Unit Tests:** Test `useStore` actions for setting/clearing `activePhotoId`.
*   **Interaction Tests:** Verify that clicking 'Back' clears any active Lightbox.
*   **Visual Verification:** Ensure hover effect is noticeable but not jittery. Check Lightbox Z-index covers the canvas properly.
*   **Mobile Testing:** Verify touch interactions work for "Hover" (Tap once) vs "open" (Tap again or Long press?). *Decision: Tap opens directly on mobile.*
