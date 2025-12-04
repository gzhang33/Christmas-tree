<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 运行并部署你的 AI Studio 应用

中文 | [English](README.md)

这是一个使用 React、Vite 和 React Three Fiber 构建的节日 3D 体验。应用会渲染一棵可交互的宇宙圣诞树，包含粒子效果、背景音乐和性能监控。本文档将帮助你在本地完成项目设置、配置环境变量，并了解可用的脚本。

在 AI Studio 查看你的应用：https://ai.studio/apps/drive/1vk29u3Po_2fsqMqmKm6yd2buaXrokV1x

## 功能

- 可交互的 3D 圣诞树，包含动画粒子、灯光和爆炸效果
- 带有静音/取消静音控制的背景音乐，并提供性能面板的键盘快捷键
- 可上传照片，作为挂在圣诞树上的装饰
- 通过屏幕上的控件配置树的颜色、粒子数量、降雪密度、旋转速度等
- 内置性能监控（FPS、帧时间、draw calls 和内存使用）

## 前置条件

- Node.js 18 或更高版本
- npm（随 Node.js 一同安装）

## 快速开始

1. 安装依赖：
   ```bash
   npm install
   ```
2. 复制示例环境文件并设置你的 Gemini API 密钥：
   ```bash
   cp .env.local .env
   # 编辑 .env 并设置 GEMINI_API_KEY=<你的密钥>
   ```
3. 本地运行应用：
   ```bash
   npm run dev
   ```
4. 在浏览器中打开终端打印的本地地址（默认：http://localhost:5173）。

## 环境变量

- `GEMINI_API_KEY` – Gemini 功能所需的密钥。运行应用前请在 `.env` 文件中设置。

## 可用脚本

- `npm run dev` – 启动带热重载的 Vite 开发服务器。
- `npm run build` – 在 `dist/` 生成优化后的生产构建。
- `npm run preview` – 本地预览生产构建。

## 项目结构

- `src/` – React 源码
  - `components/` – UI 与画布组件（树体验、控制面板、调试面板）
  - `store/` – 基于 Zustand 的共享状态存储
  - `shaders/` – GLSL 着色器，实现视觉效果
  - `types.ts` – 公用 TypeScript 类型
- `public/` – 由 Vite 提供的静态资源
- `docs/` – 额外的项目文档

## 部署提示

- 使用 `npm run build` 构建项目，并在任意静态主机上服务 `dist/` 目录。
- 在部署到 AI Studio 时，确保 `.env` 文件（或平台密钥）包含 `GEMINI_API_KEY`。
