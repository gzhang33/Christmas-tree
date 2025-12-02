# Christmas-tree UX Design Specification

_Created on 2025-12-01 by Gianni_
_Generated using BMad Method - Create UX Design Workflow v1.0_

---

## Executive Summary

**Project Vision:**
A 3D interactive Christmas tree experience that transforms into a floating "Photo Wall" of memories. The project aims to create an emotional journey from the surprise of a particle explosion to the warmth of browsing cherished photos in a 3D space.

**Target Users:**
Friends, family, and loved ones who want to share and relive memories in a unique, interactive digital format.

---

## 1. Design System Foundation

### 1.1 Design System Choice

{{design_system_decision}}

---

## 2. Core User Experience

### 2.1 Defining Experience

The defining experience is the seamless, physics-driven transition from a festive Christmas tree shape into a drifting, weightless gallery of Polaroid photos. Users interact by clicking the tree to trigger the transformation, then exploring the floating memories.

### 2.2 Novel UX Patterns

**Pattern Name:** Particle Explosion to Memory Drift

**Phases:**
1.  **Explosion & Morphing (Surprise):**
    *   **Trigger:** Click on Christmas tree.
    *   **Physics:** High-velocity particle explosion with rapid damping to a floating, weightless state (no flying off-screen).
    *   **Visuals:** Particles morph from tree colors to Polaroid textures via cross-fade and scale-up.

2.  **Floating & Immersion:**
    *   **Dynamics:** Photos drift with slow 3D rotation (random X/Y/Z axes).
    *   **Visuals:** Double-sided Polaroid textures (no blank backs).
    *   **Camera:** Automatic "Dolly In" movement to immerse the user in the cloud of memories without losing the overall composition.

3.  **Interaction (Memories):**
    *   **Action:** Click on individual floating photos.
    *   **Feedback:** Selected photo smoothly expands to center (Lightbox mode). Background photos blur/dim.
    *   **Exit:** Click again or close to return photo to floating position.

**Micro-Interaction Journey:**

1.  **Anticipation (Hover):**
    *   *Action:* User hovers over the tree.
    *   *Feedback:* Particles slightly agitate or glow brighter. Cursor changes to pointer.
    *   *Goal:* Signal interactivity and build tension.

2.  **The Release (Click & Explode):**
    *   *Action:* User clicks.
    *   *Feedback:* Instant high-velocity radial explosion.
    *   *Nuance:* Sound effect (optional) of shattering glass or magical chime.

3.  **The Morph (Transition):**
    *   *Action:* Passive observation.
    *   *Feedback:* As velocity dampens (0.5s - 1.5s), particles *first* scale up to card size, *then* cross-fade to photo textures.
    *   *Goal:* Clear visual causality—the tree *becomes* the memories.

4.  **The Drift (Immersion):**
    *   *Action:* Passive observation / Camera dolly.
    *   *Feedback:* Camera moves slowly to center. Photos drift with "space dust" parallax effect for depth.

5.  **The Capture (Selection):**
    *   *Action:* User tries to click a moving photo.
    *   *Feedback (Magnetic Hover):* Hovered photo slows down rotation and slightly scales up (1.1x).
    *   *Goal:* Prevent frustration from "chasing" moving targets.

**Creative Enhancements (SCAMPER):**

*   **The "Time Rewind" (Reverse):**
    *   Instead of a hard reset, allow users to "implode" the memories back into the tree.
    *   *Trigger:* "Back" button or long-press in void.
    *   *Visual:* Photos spin rapidly, lose texture, morph back to colored particles, and suck back into the tree shape (implosion physics).

*   **Immersion Mode (Eliminate):**
    *   Upon explosion trigger, ALL non-diegetic UI (controls, sliders) must fade out (opacity: 0).
    *   *Goal:* 100% screen real estate for memories.
    *   *Recovery:* UI reappears only after the tree is fully re-assembled.

*   **Atmospheric Shift (Modify):**
    *   Sync post-processing with the phase.
    *   *Tree Phase:* Sharp, high contrast, "crisp winter night".
    *   *Memory Phase:* Softer focus, higher bloom, slightly warmer color grading, "dreamy nostalgia".

### 2.3 Core Experience Principles

*   **Speed (Variable Pacing):** The experience relies on the contrast between the *instant* energy of the explosion and the *timeless* drift of the memories.
*   **Guidance (Invisible Hand):** No tutorials. "Magnetic hover" and camera movements subtly guide attention.
*   **Flexibility (Curated Path):** Users are explorers, not editors. The path is fixed, but exploration is free.
*   **Feedback (Cinematic Response):** The environment itself responds (glow, scale, bloom) rather than UI elements.

---

## 3. Visual Foundation

### 3.1 Color System

### 3.1 Color System

**Theme: Midnight Magic**
A modern, high-contrast, and vibrant palette evoking a cyberpunk Christmas eve.

*   **Primary:** `#D53F8C` (Neon Pink) - Used for primary actions, key highlights, and the "explosion" effect.
*   **Secondary:** `#805AD5` (Electric Purple) - Used for secondary actions, gradients, and deep shadows.
*   **Accent:** `#38B2AC` (Teal) - Used for success states, links, and "tech" elements.
*   **Background:** `#1A202C` (Dark Slate) - Deep, rich background to make the neon colors pop.
*   **Surface:** `#2D3748` - Slightly lighter dark for cards and panels.
*   **Semantic Colors:**
    *   Success: `#38B2AC` (Teal)
    *   Warning: `#ECC94B` (Amber)
    *   Error: `#E53E3E` (Red)

### 3.2 Typography System

**Font Family:** `Inter` (Google Fonts) - Clean, modern, and highly legible.
*   **Headings:** Bold (700), Tight tracking.
*   **Body:** Regular (400), Relaxed line height (1.6).
*   **Monospace:** `JetBrains Mono` or `Fira Code` for any technical/code elements (optional).

### 3.3 Spacing & Layout

*   **Base Unit:** 4px
*   **Grid:** 8px soft grid.
*   **Layout:**
    *   **Desktop:** Centered content with ample negative space.
    *   **Mobile:** Full-width cards with 16px padding.
*   **Corner Radius:** 12px (Modern, slightly rounded but distinct).

**Interactive Visualizations:**

- Color Theme Explorer: [ux-color-themes.html](./ux-color-themes.html)


## 5. User Journey Flows

### 5.1 Critical User Paths

**Primary Flow: The Memory Reveal**

1.  **Start:** User sees spinning Christmas Tree. Controls visible at bottom.
2.  **Action:** User clicks anywhere on the tree.
3.  **Transition:**
    *   Controls fade out.
    *   Tree explodes outward.
    *   Particles morph into photos.
4.  **Browse:** User rotates view (drag) and hovers over photos (magnetic slow-down).
5.  **View:** User clicks a photo -> Lightbox opens.
6.  **Return:** User clicks "X" or background -> Lightbox closes.
7.  **Reset:** User clicks "Back" button -> Photos implode back into Tree. Controls reappear.

---

## 6. Component Library

### 6.1 Component Strategy

*   **Strategy:** Custom React components using Tailwind CSS.
*   **Key Components:**
    *   `FloatingControls`: Glassmorphism container for sliders/pickers.
    *   `PhotoCard`: 3D plane with double-sided texture.
    *   `LightboxModal`: 2D overlay with backdrop blur.
    *   `NeonButton`: Ghost button with glow effect on hover.

---

## 7. UX Pattern Decisions

### 7.1 Consistency Rules

*   **Animation:** All UI transitions (fade in/out) must match the physics easing of the 3D elements.
*   **Cursors:**
    *   Default: Auto.
    *   Hover Tree: Pointer (Clickable).
    *   Hover Photo: Zoom-in icon.
    *   Dragging: Grabbing hand.

---

## 8. Responsive Design & Accessibility

### 8.1 Responsive Strategy

*   **Mobile:**
    *   Tap to explode.
    *   Swipe to rotate camera.
    *   Pinch to zoom.
    *   Portrait mode: Adjust FOV to keep tree/photos in frame.
*   **Accessibility:**
    *   Keyboard navigation for photos (Tab to cycle, Enter to view).
    *   "Reduce Motion" preference support (disable explosion, use simple fade).

---

## 9. Implementation Guidance

### 9.1 Completion Summary

**Status:** Ready for Implementation
**Next Steps:**
1.  Update `Controls.tsx` to support "Midnight Magic" styling.
2.  Refactor `TreeParticles.tsx` to implement the 3-phase state machine (Tree -> Explode -> Float).
3.  Implement the "Morphing" shader logic.
4.  Add the "Lightbox" overlay component.

---

## Appendix

### Related Documents

- Product Requirements: `{{prd_file}}`
- Product Brief: `{{brief_file}}`
- Brainstorming: `{{brainstorm_file}}`

### Core Interactive Deliverables


<!-- Additional deliverables added here by other workflows -->

### Next Steps & Follow-Up Workflows

This UX Design Specification can serve as input to:

- **Wireframe Generation Workflow** - Create detailed wireframes from user flows
- **Figma Design Workflow** - Generate Figma files via MCP integration
- **Interactive Prototype Workflow** - Build clickable HTML prototypes
- **Component Showcase Workflow** - Create interactive component library
- **AI Frontend Prompt Workflow** - Generate prompts for v0, Lovable, Bolt, etc.
- **Solution Architecture Workflow** - Define technical architecture with UX context

### Version History

| Date     | Version | Changes                         | Author        |
| -------- | ------- | ------------------------------- | ------------- |
| 2025-12-01 | 1.0     | Initial UX Design Specification | Gianni |

---

_This UX Design Specification was created through collaborative design facilitation, not template generation. All decisions were made with user input and are documented with rationale._
