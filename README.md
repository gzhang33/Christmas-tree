# 🎄 Interactive 3D Christmas Tree

A festive, high-performance 3D interactive experience built with **React**, **Three.js**, and **React Three Fiber**. This project features a customizable Christmas tree that transforms into a galaxy of memories.

![Project Hero Banner](path/to/hero_banner.png)

## ✨ Core Features

### 🌟 1. Interactive 3D Particles & Explosion
The tree is composed of thousands of dynamic particles that "breathe" and sway. With a single click, the tree explodes into a cinematic cloud of photos, revealing hidden memories.
- **Natural Motion**: GPU-accelerated breathing and swaying animations.
- **Explosion Physics**: Smooth transition from tree shape to a spherical photo wall using Bezier curves.
- **Double-Click Restore**: Seamlessly rebuild the tree from any state.
- **Action Hint**: Subtle, breathing UI prompts to guide user interaction.

### 🎨 2. Real-time Customization
Personalize your Christmas experience through a sleek dashboard.
- **Visuals**: Adjust tree color, magic dust color, and snow density/speed.
- **Performance**: Dynamic particle count control to match your device's power.
- **Physics**: Change rotation speed and ornament (photo) scale in real-time.

### 📸 3. Dynamic Photo Ornaments
Upload your own photos to make the tree truly yours.
- **Image Support**: Local file uploads or remote Cloudinary URLs.
- **Video Memories**: Support for MP4/WebP video ornaments that play when hovered.
- **Smart Distribution**: Photos are procedurally placed as ornaments on the tree surface.

### 🔗 4. Sharing & Persistence (Cloudinary Integration)
Generate a unique link to share your customized tree and uploaded memories with friends.
- **One-Click Share**: Encodes all configurations and photo URLs into a sharable link.
- **Auto-Loading**: Opening a share link automatically restores the specific colors, music, and memories.

### 🚀 5. Performance & Mobile Optimization
Engineered for a buttery-smooth 60 FPS experience on both Desktop and Mobile.
- **Resource Management**: Automatically pauses rendering and audio when the tab is in background.
- **Optimized Caching**: Hybrid LRU-Memory texture cache to prevent crashes on low-end devices.
- **Responsive Scaling**: Automatic adjustment of particle counts and texture quality based on screen size.
- **Font Pre-warming**: Prevents flickering on mobile during text-heavy transitions.

### 🎵 6. Immersive Audio Experience
- **Music Selection**: Curated festive tracks with smooth volume fading.
- **Auto-Play Handling**: Intelligent interaction detection to comply with browser audio policies.

---

## 📸 Feature Showcase

### **Greeting & Morphing Intro**
Experience a "Vaporize" text effect where your name dissolves into magic dust to form the tree.
> ![Screenshot: Entrance Animation](path/to/entrance_screenshot.png)
> *Example: Entering "Antigravity" triggers a cinematic morphing sequence.*

### **Explosion & Photo Wall**
Click the tree to scatter the particles and display your uploaded memories in a 3D sphere.
> ![Screenshot: Tree Explosion](path/to/explosion_screenshot.png)
> *Interaction: Click once to explode. Hover over photos to preview or play videos.*

### **Customization Dashboard**
Tweak every detail of your festive scene with the side control panel.
> ![Screenshot: UI Controls](path/to/controls_screenshot.png)
> *Example: Changing the tree to 'Royal Blue' with 'Golden' magic dust.*

### **Performance Monitoring**
Real-time monitoring for developers and power users (Toggle with `` ` `` or `F3`).
> ![Screenshot: Performance Monitor](path/to/monitor_screenshot.png)

---

## 🛠 Project Structure

```bash
src/
├── components/
│   ├── canvas/      # 3D Elements (Tree, Snow, MagicDust, etc.)
│   ├── ui/          # 2D Interface (Controls, Modals, ActionHints)
│   └── layout/      # Page structure and Canvas containers
├── config/          # Centralized configuration (Particles, Audio, Assets)
├── shaders/         # Custom GLSL shaders for particle effects
├── store/           # Global state management via Zustand
└── utils/           # Helper functions (Responsive, Cloudinary, Texture)
```

## 💻 Tech Stack

- **Framework**: React 18 + Vite
- **3D Engine**: Three.js
- **React Bridge**: React Three Fiber (R3F)
- **Helpers**: @react-three/drei
- **Animations**: Framer Motion
- **State**: Zustand
- **Styling**: Tailwind CSS
- **Media**: Cloudinary (Global Hosting)

---

## 🚀 Getting Started

1.  **Clone the repo**
2.  **Install dependencies**: `npm install`
3.  **Setup Environment**: Create a `.env` file with your Cloudinary credentials (optional).
    ```env
    VITE_CLOUDINARY_CLOUD_NAME=your_name
    VITE_CLOUDINARY_UPLOAD_PRESET=your_preset
    ```
4.  **Run locally**: `npm run dev`

## Configuration (Cloudinary)

This project integrates with **Cloudinary** to enable the **Share Memories** feature. This allows users to upload photos, customize the tree, and generate a unique, persistent link to share with others.

1. **Create Account**: Sign up for free at [Cloudinary](https://cloudinary.com/).
2. **Get Cloud Name**: Find your cloud name in the Dashboard.
3. **Create Upload Preset**:
    - Go to **Settings** > **Upload** > **Upload presets**.
    - Click **Add Upload Preset**.
    - Name it (e.g., `christmas-tree`).
    - **CRITICAL**: Set **Signing Mode** to **Unsigned**.
    - Save.
4. **Setup Environment**:
    - Copy the example config: `cp .env.example .env.local`
    - Fill in your details in `.env.local`:
      ```bash
      VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
      VITE_CLOUDINARY_UPLOAD_PRESET=your_preset_name
      ```
5. **Restart**: Rerun `npm run dev` to load the new variables.

> **Note**: Without Cloudinary configuration, the application works in "Local Mode". Photos will display locally but the shared links will not work for others.

## Available scripts

- `npm run dev` – start the Vite development server with hot reloading.
- `npm run build` – create an optimized production build in `dist/`.
- `npm run preview` – preview the production build locally.

## Project structure

```text
.
├─ src/
│  ├─ App.tsx                # scene composition and UI wiring
│  ├─ index.css              # global styles
│  ├─ components/
│  │  ├─ canvas/             # 3D scene pieces (Experience, Snow, MagicDust, TreeParticles, PerformanceMonitor, PhotoCard)
│  │  └─ ui/                 # UI shells and overlays (Controls, DebugStore, ErrorBoundary)
│  ├─ shaders/               # GLSL shaders for particle and lighting effects
│  ├─ store/                 # Zustand store (useStore.ts)
│  └─ types.ts               # shared TypeScript types
├─ public/
│  ├─ photos/                # sample ornaments for uploads
│  ├─ textures/              # scene materials
│  └─ *JingleBells.mp3       # bundled music tracks
├─ docs/                     # architecture, UX, and sprint documentation
├─ index.html                # Vite HTML entry
├─ index.tsx                 # React entry point
├─ package.json
└─ vite.config.ts
```

## Deployment tips

- Build the project with `npm run build` and serve the `dist/` folder with any static host.
- For AI Studio deployment, the current app works without external secrets because media assets are bundled under `public/`. Add any future keys to `.env.local` and provide them in your hosting environment.
