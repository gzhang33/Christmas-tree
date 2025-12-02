# Christmas-tree - Epic Breakdown

**Author:** Gianni
**Date:** 2025-12-01
**Project Level:** Brownfield / Refactor
**Target Scale:** Single-Page App

---

## Overview

This document provides the complete epic and story breakdown for Christmas-tree, decomposing the requirements from the [PRD](./PRD.md) into implementable stories.

**Strategy:** This is a **Brownfield** execution. The project already exists as a functional demo. The focus is on **Refactoring** the architecture (Zustand, Tailwind), **Upgrading** the visuals to the new UX spec, and **Extending** the interaction model (Lightbox).

**Living Document Notice:** This is the initial version. It will be updated after UX Design and Architecture workflows add interaction and technical details to stories.

## Epics Summary

- **Epic 1: Architecture & UI Modernization** - Refactor existing codebase to new stack (Zustand, Tailwind, Framer Motion) and directory structure.
- **Epic 2: Visual Engine Upgrade** - Upgrade 3D shaders and particles to match "Midnight Magic" theme and physics specs.
- **Epic 3: Memory Interaction & Lightbox** - Implement the new "Photo Cloud" interactions, magnetic hover, and Lightbox overlay.

---

## Functional Requirements Inventory

- **FR1:** 系统能够渲染由数千上万个粒子组成的 3D 圣诞树形态
- **FR2:** 系统能够为粒子应用用户选择的颜色主题
- **FR3:** 系统能够在树形态下持续旋转显示（自动旋转动画）
- **FR4:** 系统能够渲染双面纹理的 Polaroid 照片卡片（正反面都显示照片）
- **FR5:** 系统能够在 3D 空间中渲染多个漂浮的照片对象
- **FR6:** 系统能够应用实时光照和阴影效果以增强深度感
- **FR7:** 系统能够根据当前状态（树/记忆）切换后期处理效果（对比度、光晕、色调）
- **FR8:** 用户可以通过点击圣诞树触发粒子爆炸效果
- **FR9:** 系统能够执行高速径向粒子爆炸动画，带有物理阻尼效果
- **FR10:** 系统能够在爆炸过程中将粒子形态平滑转换为照片卡片（缩放 + 纹理交叉淡入）
- **FR11:** 系统能够在形态转换完成后，使照片进入漂浮状态（3D 旋转 + 位置漂移）
- **FR12:** 系统能够在爆炸触发时自动隐藏所有 UI 控件（沉浸模式）
- **FR13:** 用户可以通过"返回"按钮或特定手势触发照片内爆回树形态的逆向动画
- **FR14:** 系统能够在树重新组装完成后恢复 UI 控件显示
- **FR15:** 用户可以在 3D 空间中自由浏览漂浮的照片
- **FR16:** 系统能够在用户悬停照片时应用磁性效果（减速旋转 + 轻微放大 1.1x）
- **FR17:** 用户可以点击单张照片进入 Lightbox 查看模式
- **FR18:** 系统能够在 Lightbox 模式下将选中照片平滑移动并放大至屏幕中心
- **FR19:** 系统能够在 Lightbox 模式下模糊/变暗背景中的其他照片
- **FR20:** 用户可以通过点击关闭按钮或背景区域退出 Lightbox 模式
- **FR21:** 系统能够在退出 Lightbox 时将照片平滑返回原漂浮位置
- **FR22:** 用户可以从预设的颜色主题中选择树的配色方案
- **FR23:** 用户可以调整粒子数量（影响视觉密度和性能）
- **FR24:** 用户可以查看当前的性能指标（FPS、粒子数）
- **FR25:** 用户可以重置所有设置到默认值
- **FR26:** 系统能够保存用户的偏好设置到本地存储（LocalStorage）
- **FR27:** 系统能够在页面重新加载时恢复用户的偏好设置
- **FR28:** 用户可以通过鼠标拖拽旋转相机视角（轨道控制）
- **FR29:** 系统能够在爆炸后自动执行相机推进动画（Dolly In）
- **FR30:** 用户可以通过鼠标滚轮或捏合手势缩放视角
- **FR31:** 系统能够限制相机的旋转和缩放范围，保持最佳观看角度
- **FR32:** 系统能够在移动设备上支持触摸交互（点击触发爆炸）
- **FR33:** 用户可以在移动设备上通过滑动手势旋转相机
- **FR34:** 用户可以在移动设备上通过双指捏合手势缩放视角
- **FR35:** 系统能够根据设备类型（桌面/移动）自动调整粒子数量和视觉效果质量
- **FR36:** 系统能够在竖屏模式下自动调整视野（FOV）以保持树/照片在画面内
- **FR37:** 用户可以通过键盘 Tab 键循环选择漂浮的照片
- **FR38:** 用户可以通过键盘 Enter 键打开选中的照片（Lightbox）
- **FR39:** 用户可以通过键盘 Esc 键关闭 Lightbox 或退出当前状态
- **FR40:** 系统能够检测用户的"减少动画"偏好设置，并相应地禁用爆炸效果，使用简单淡入淡出
- **FR41:** 系统能够为所有交互元素提供适当的 ARIA 标签和角色

---

## FR Coverage Map

- **Epic 1:** FR22-27 (Controls), FR32-36 (Responsive Foundation), FR41 (A11y Foundation)
- **Epic 2:** FR1-11 (Visuals & Physics), FR28-31 (Camera), FR40 (Reduced Motion)
- **Epic 3:** FR12-21 (Interaction & Lightbox), FR37-39 (Keyboard Nav)

---

## Epic 1: Architecture & UI Modernization

**Goal:** Establish the robust technical foundation required by the Architecture Spec by refactoring the existing demo code. Migrate state management to Zustand, styling to Tailwind CSS, and implement the new directory structure.

### Story 1.1: Tech Stack & Directory Refactor

As a Developer,
I want to install the required dependencies and restructure the project,
So that the codebase aligns with the approved Architecture Spec.

**Acceptance Criteria:**
**Given** the current project root
**When** I run the setup commands
**Then** `zustand`, `framer-motion`, `tailwindcss`, `postcss`, `autoprefixer` are installed
**And** Tailwind is initialized with `tailwind.config.js`
**And** the directory structure matches the Architecture Spec (`components/canvas`, `components/ui`, `hooks`, `store`, `config`)
**And** existing files are moved to their new locations (even if not yet refactored)

**Technical Notes:**
- Move `TreeParticles.tsx` -> `components/canvas/`
- Move `Controls.tsx` -> `components/ui/`
- Create `src/store/` and `src/config/`

### Story 1.2: Global State Implementation (Zustand)

As a Developer,
I want to implement a global Zustand store,
So that 3D components and UI components can share state without prop drilling.

**Acceptance Criteria:**
**Given** the new `src/store` directory
**When** I create `useStore.ts`
**Then** it should define the state interface matching the PRD (color theme, particle count, isExploded, activePhoto)
**And** it should include actions to update these states
**And** it should include `persist` middleware for LocalStorage (FR26, FR27)

**Technical Notes:**
- State: `theme` (string), `particleCount` (number), `isExploded` (boolean), `activePhotoId` (string | null)
- Actions: `setTheme`, `setParticleCount`, `triggerExplosion`, `resetExplosion`, `setActivePhoto`

### Story 1.3: UI Component Refactor (Tailwind + Framer)

As a User,
I want to see a polished, responsive control panel,
So that I can customize the tree using the new "Midnight Magic" design system.

**Acceptance Criteria:**
**Given** the existing `Controls.tsx`
**When** I refactor it to use Tailwind CSS
**Then** it should match the "Midnight Magic" theme (Neon Pink/Purple on Dark Slate)
**And** it should use `useStore` for state (removing local useState)
**And** it should use Framer Motion for fade-in/out transitions (FR12 - Immersion Mode)
**And** it should be accessible (ARIA labels) (FR41)

**Technical Notes:**
- Replace inline styles/CSS modules with Tailwind classes
- Implement `AnimatePresence` to handle the "fade out on explosion" requirement

---

## Epic 2: Visual Engine Upgrade

**Goal:** Upgrade the core 3D experience to meet the "Midnight Magic" aesthetic and implement the specific physics-driven transitions defined in the UX spec.

### Story 2.0: Test Infrastructure & Video Prep

As a Developer,
I want to set up the testing framework and prepare video assets,
So that the project is stable and supports the new video requirements.

**Acceptance Criteria:**
**Given** the current codebase
**When** I install and configure `vitest`
**Then** I should be able to run unit tests for `useStore`
**And** `assets.ts` should be updated to include video file paths (FR-New)
**And** I should fix the `URL.createObjectURL` memory leak in `Controls.tsx`

**Technical Notes:**
- Install `vitest`, `@testing-library/react`
- Create `src/store/useStore.test.ts`
- Update `Asset` type to support `videoUrl`

### Story 2.1: Theme & Asset Configuration

As a Developer,
I want to centralize theme and asset configuration,
So that the application uses the correct "Midnight Magic" colors and textures.

**Acceptance Criteria:**
**Given** the `src/config` directory
**When** I create `theme.ts` and `assets.ts`
**Then** `theme.ts` should export the specific hex codes from UX Spec (Primary: #D53F8C, etc.)
**And** `assets.ts` should define paths for particle textures and photo placeholders
**And** `TreeParticles` should be updated to consume these config values instead of hardcoded colors

**Technical Notes:**
- Define the "Midnight Magic" palette constants
- Ensure `TreeParticles` reads color from `useStore` (which defaults to this config)

### Story 2.2: Explosion Physics & Shader Upgrade

As a User,
I want the tree to explode with a specific "radial force" and "damping" effect,
So that it feels like a release of energy rather than just linear movement.

**Acceptance Criteria:**
**Given** the `TreeParticles` component
**When** I click the tree (triggering `isExploded`)
**Then** the particles should move using the "GPU State Machine" pattern (Architecture Spec)
**And** the movement should follow a Bezier curve (Start -> Explosion Vector -> Float Position)
**And** the animation should be driven by a `uProgress` uniform (0 to 1)
**And** performance should remain >30fps during explosion (FR1, FR9)

**Technical Notes:**
- Implement `particle.vert` shader with the Bezier logic
- Use `useFrame` to interpolate `uProgress` based on `isExploded` state

### Story 2.3: Morphing Effect (Particle to Photo)

As a User,
I want the particles to transform into photos,
So that I understand the connection between the tree and the memories.

**Acceptance Criteria:**
**Given** the explosion animation is active
**When** `uProgress` increases
**Then** particles should scale up to "card size"
**And** the texture should cross-fade from "glow dot" to "photo texture" (FR10)
**And** the particles should end up in a floating, drifting state (FR11)

**Technical Notes:**
- Shader needs `mix()` function for color/texture based on progress
- Need a Texture Atlas or Array for the photos

---

## Epic 3: Memory Interaction & Lightbox

**Goal:** Implement the "Photo Cloud" interactivity, allowing users to explore memories and view them in detail.

### Story 3.1: Magnetic Hover & Camera Drift

As a User,
I want the photos to drift gently and respond to my mouse,
So that the memory cloud feels alive and immersive.

**Acceptance Criteria:**
**Given** the photos are in "Floating" state
**When** I do nothing, the camera should slowly "Dolly In" (FR29)
**When** I hover a photo, it should slow down its rotation and scale up (1.1x) (FR16)
**And** the cursor should change to a "Zoom In" icon

**Technical Notes:**
- Use Raycaster for hover detection
- Update individual particle instance attributes (scale/rotation) on hover (or use the "Hybrid Interaction" pattern from Arch Spec)

### Story 3.2: Lightbox Overlay Implementation

As a User,
I want to click a photo to see it clearly,
So that I can relive that specific memory.

**Acceptance Criteria:**
**Given** I click a floating photo
**Then** a high-fidelity version of that photo should appear in the center (FR17, FR18)
**And** if the memory is a video, it should auto-play with controls
**And** the background (3D scene) should blur or dim (FR19)
**And** I should see a "Close" button
**And** pressing ESC should close it (FR39)

**Technical Notes:**
- Create `Lightbox.tsx` (UI component)
- Use `useStore` to track `activePhotoId`
- When active, render a DOM overlay OR a separate R3F Plane in front of the camera (Hybrid approach)

### Story 3.3: Return to Tree (Implosion)

As a User,
I want to return to the tree shape,
So that I can experience the cycle again.

**Acceptance Criteria:**
**Given** I am in the "Exploded" state
**When** I click the "Back" button
**Then** the photos should "implode" back into the tree shape (FR13)
**And** the UI controls should fade back in (FR14)

**Technical Notes:**
- Animate `uProgress` from 1 back to 0
- Ensure physics feel "reversed" (suction effect)

---

## FR Coverage Matrix

| FR ID | Covered By |
| :--- | :--- |
| FR1 | Epic 2 (Story 2.2) |
| FR2 | Epic 2 (Story 2.1) |
| FR3 | Epic 2 (Story 2.2) |
| FR4 | Epic 2 (Story 2.3) |
| FR5 | Epic 2 (Story 2.3) |
| FR6 | Epic 2 (Story 2.2) |
| FR7 | Epic 2 (Story 2.1) |
| FR8 | Epic 2 (Story 2.2) |
| FR9 | Epic 2 (Story 2.2) |
| FR10 | Epic 2 (Story 2.3) |
| FR11 | Epic 2 (Story 2.3) |
| FR12 | Epic 1 (Story 1.3) |
| FR13 | Epic 3 (Story 3.3) |
| FR14 | Epic 3 (Story 3.3) |
| FR15 | Epic 3 (Story 3.1) |
| FR16 | Epic 3 (Story 3.1) |
| FR17 | Epic 3 (Story 3.2) |
| FR18 | Epic 3 (Story 3.2) |
| FR19 | Epic 3 (Story 3.2) |
| FR20 | Epic 3 (Story 3.2) |
| FR21 | Epic 3 (Story 3.2) |
| FR22 | Epic 1 (Story 1.3) |
| FR23 | Epic 1 (Story 1.3) |
| FR24 | Epic 1 (Story 1.3) |
| FR25 | Epic 1 (Story 1.3) |
| FR26 | Epic 1 (Story 1.2) |
| FR27 | Epic 1 (Story 1.2) |
| FR28 | Epic 2 (Story 2.2) |
| FR29 | Epic 3 (Story 3.1) |
| FR30 | Epic 2 (Story 2.2) |
| FR31 | Epic 2 (Story 2.2) |
| FR32 | Epic 1 (Story 1.3) |
| FR33 | Epic 2 (Story 2.2) |
| FR34 | Epic 2 (Story 2.2) |
| FR35 | Epic 2 (Story 2.2) |
| FR36 | Epic 2 (Story 2.2) |
| FR37 | Epic 3 (Story 3.2) |
| FR38 | Epic 3 (Story 3.2) |
| FR39 | Epic 3 (Story 3.2) |
| FR40 | Epic 2 (Story 2.2) |
| FR41 | Epic 1 (Story 1.3) |

---

## Summary

This breakdown respects the existing "Brownfield" status of the project.
- **Epic 1** establishes the new architecture (Zustand/Tailwind) by refactoring the existing `Controls` and file structure.
- **Epic 2** upgrades the existing `TreeParticles` to meet the high-fidelity visual and physics requirements of the PRD.
- **Epic 3** adds the missing interaction layer (Lightbox, Hover) to complete the user journey.

This approach minimizes rework while ensuring the final product meets the premium "Midnight Magic" specification.

---

_For implementation: Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown._
