<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

English | [中文](README.zh.md)

A festive 3D experience built with React, Vite, and React Three Fiber. The app renders an interactive cosmic Christmas tree with particle effects, ambient music, and performance monitoring. Use this README to set up the project locally, configure environment variables, and understand the available scripts.

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
2. Copy the sample environment file and set your Gemini API key:
   ```bash
   cp .env.local .env
   # edit .env and set GEMINI_API_KEY=<your key>
   ```
3. Run the app locally:
   ```bash
   npm run dev
   ```
4. Open the printed local URL in your browser (default: http://localhost:5173).

## Environment variables

- `GEMINI_API_KEY` – required for Gemini-powered features. Set this in your `.env` file before running the app.

## Available scripts

- `npm run dev` – start the Vite development server with hot reloading.
- `npm run build` – create an optimized production build in `dist/`.
- `npm run preview` – preview the production build locally.

## Project structure

- `src/` – React source code
  - `components/` – UI and canvas components (tree experience, controls, debug panels)
  - `store/` – Zustand store for shared state
  - `shaders/` – GLSL shaders for visual effects
  - `types.ts` – shared TypeScript types
- `public/` – static assets served by Vite
- `docs/` – additional project documentation

## Deployment tips

- Build the project with `npm run build` and serve the `dist/` folder with any static host.
- For AI Studio deployment, ensure your `.env` file (or platform secrets) includes `GEMINI_API_KEY`.
