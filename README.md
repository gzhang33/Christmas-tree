# Run and deploy your AI Studio app

English | [中文](README.zh.md)

A festive 3D experience built with React, Vite, and React Three Fiber. The app renders an interactive cosmic Christmas tree with particle effects, ambient music, and performance monitoring. Use this README to set up the project locally and understand the available scripts.

View your app in AI Studio: https://ai.studio/apps/drive/1vk29u3Po_2fsqMqmKm6yd2buaXrokV1x

## Features

- Interactive 3D Christmas tree with animated particles, lights, and explosions
- Ambient music with mute/unmute controls and keyboard shortcuts for performance overlay
- Uploadable photos that become ornaments on the tree
- Configurable tree color, particle count, snow density, rotation speed, and more via on-screen controls
- Built-in performance monitor (FPS, frame time, draw calls, and memory usage)

## Prerequisites

- Node.js 18 or later
- npm (comes with Node.js)

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the app locally:
   ```bash
   npm run dev
   ```
3. Open the printed local URL in your browser (default: http://localhost:5173).

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
