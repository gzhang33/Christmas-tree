<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 运行并部署你的 AI Studio 应用

中文 | [English](README.md)

这是一个使用 React、Vite 和 React Three Fiber 构建的节日 3D 体验。应用会渲染一棵可交互的宇宙圣诞树，包含粒子效果、背景音乐和性能监控。本文档将帮助你在本地完成项目设置，并了解可用的脚本。

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
2. 本地运行应用：
   ```bash
   npm run dev
   ```
3. 在浏览器中打开终端打印的本地地址（默认：http://localhost:5173）。

## 可用脚本

- `npm run dev` – 启动带热重载的 Vite 开发服务器。
- `npm run build` – 在 `dist/` 生成优化后的生产构建。
- `npm run preview` – 本地预览生产构建。

## 项目结构

```text
.
├─ src/
│  ├─ App.tsx                # 场景组合与 UI 连接
│  ├─ index.css              # 全局样式
│  ├─ components/
│  │  ├─ canvas/             # 3D 场景组件（Experience、Snow、MagicDust、TreeParticles、PerformanceMonitor、PhotoCard）
│  │  └─ ui/                 # UI 外壳与覆盖层（Controls、DebugStore、ErrorBoundary）
│  ├─ shaders/               # 粒子与光效的 GLSL 着色器
│  ├─ store/                 # Zustand 状态（useStore.ts）
│  └─ types.ts               # 公用 TypeScript 类型
├─ public/
│  ├─ photos/                # 示例挂饰素材
│  ├─ textures/              # 场景材质贴图
│  └─ *JingleBells.mp3       # 内置音乐资源
├─ docs/                     # 架构、UX 与冲刺文档
├─ index.html                # Vite HTML 入口
├─ index.tsx                 # React 入口
├─ package.json
└─ vite.config.ts
```

## 部署提示

- 使用 `npm run build` 构建项目，并在任意静态主机上服务 `dist/` 目录。
- 当前应用使用 `public/` 中的资源即可运行，不依赖外部密钥。若未来新增密钥，可放入 `.env.local` 并在部署平台配置对应的环境变量。
