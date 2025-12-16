# 配置文件架构说明

## 概述

`src/config` 文件夹集中管理所有应用配置参数，遵循**单一数据源**原则，避免硬编码和配置分散。

## 文件结构

```
src/config/
├── index.ts              # 统一导出入口
├── performance.ts        # 性能优化配置 ⭐ 新增
├── particles.ts          # 粒子系统配置
├── landing.ts            # 落地页配置
├── colors.ts             # 颜色方案配置
├── assets.ts             # 资源路径配置
├── interactions.ts       # 交互行为配置
└── photoConfig.ts        # 照片展示配置
```

---

## 核心配置文件

### 1. `performance.ts` ⭐ 性能优化配置

**用途**: 集中管理影响渲染性能的关键参数

**主要配置项**:

#### 1.1 粒子数量配置
```typescript
PERFORMANCE_CONFIG.particles.defaultCount  // 默认粒子总数: 12000 (原 18000)
PERFORMANCE_CONFIG.particles.recommended   // 推荐配置 (high/medium/low/minimal)
PERFORMANCE_CONFIG.particles.range         // UI 控件范围 (5000-25000)
```

**性能影响**:
- **18000**: 高端设备 (独立显卡, 60+ FPS)
- **12000**: 中端设备 (集成显卡, 30-45 FPS) ✅ **当前默认值**
- **8000**: 低端设备 (移动端, 20-30 FPS)
- **5000**: 最低配置 (15-20 FPS)

#### 1.2 Landing Page 性能配置
```typescript
PERFORMANCE_CONFIG.landing.titleSamplingDensity        // 标题采样密度: 6 (原 4)
PERFORMANCE_CONFIG.landing.particleGenerationDensity   // 3D 文字采样: 5 (原 4)
PERFORMANCE_CONFIG.landing.particleSize                // 粒子尺寸补偿
```

**优化说明**:
- 采样密度从 `4` 提升到 `6`，粒子数量减少约 **50%**
- 粒子尺寸从 `1.5-2.0` 增大到 `1.8-2.4`，保持视觉密度

#### 1.3 渲染优化配置
```typescript
PERFORMANCE_CONFIG.rendering.enablePostProcessing  // 后处理效果开关
PERFORMANCE_CONFIG.rendering.enableShadows         // 阴影渲染 (默认关闭)
PERFORMANCE_CONFIG.rendering.maxPixelRatio         // 像素比率上限: 2
```

#### 1.4 相机与交互配置
```typescript
PERFORMANCE_CONFIG.camera.driftSpeed       // 相机漂移速度: 0.15
PERFORMANCE_CONFIG.camera.idleThreshold    // 空闲检测阈值: 2000ms
PERFORMANCE_CONFIG.camera.minDistance      // 最小相机距离: 12
```

#### 1.5 性能预设 (Presets)
```typescript
PERFORMANCE_PRESETS.high       // 高性能模式 (18000 粒子)
PERFORMANCE_PRESETS.balanced   // 平衡模式 (12000 粒子) ✅ 推荐
PERFORMANCE_PRESETS.performance // 性能优先 (8000 粒子)
```

#### 1.6 性能监控阈值
```typescript
PERFORMANCE_THRESHOLDS.fps          // FPS 评级标准
PERFORMANCE_THRESHOLDS.frameBudget  // 帧预算阈值
PERFORMANCE_THRESHOLDS.drawCalls    // Draw Call 阈值
```

---

### 2. `particles.ts` - 粒子系统配置

**用途**: 圣诞树粒子分布、动画参数

**主要配置项**:
- `ratios`: 粒子类型分配比例 (tree/glow/ornament/gift/magicDust)
- `minCounts`: 最小粒子数量保证
- `magicDust`: 魔法尘埃特效参数
- `animation`: 呼吸动画、摇摆效果、爆炸物理

---

### 3. `landing.ts` - 落地页配置

**用途**: Landing Page 标题粒子系统、布局、动画流程

**主要配置项**:
- `TITLE_COLORS`: 标题粒子圣诞色彩方案
- `USERNAME_COLORS`: 用户名粒子暖色调方案
- `TITLE_CONFIG`: 字体、采样、渲染、动画参数 (现已引用 `performance.ts`)
- `LANDING_CONFIG`: 响应式布局、对齐方式、打字机效果、变形动画

**性能优化关联**:
```typescript
// 现已从 performance.ts 读取
TITLE_CONFIG.sampling.density              // ← PERFORMANCE_CONFIG.landing.titleSamplingDensity
TITLE_CONFIG.particle.sizeMin/Max/MinDraw // ← PERFORMANCE_CONFIG.landing.particleSize
LANDING_CONFIG.title.particleGeneration.density // ← PERFORMANCE_CONFIG.landing.particleGenerationDensity
```

---

### 4. `colors.ts` - 颜色方案配置

**用途**: 圣诞树颜色预设

**主要配置项**:
- `DEFAULT_TREE_COLOR`: 默认树颜色
- `TREE_COLORS`: 可选颜色方案数组
- `TREE_COLOR_NAMES`: 颜色名称映射

---

### 5. `assets.ts` - 资源路径配置

**用途**: 照片、音频等静态资源路径

**主要配置项**:
- `MEMORIES`: 照片资源数组 (id, url, description)

---

### 6. `interactions.ts` - 交互行为配置

**用途**: 用户交互参数 (点击、悬停、拖拽)

**主要配置项**:
- `INTERACTION_CONFIG`: 交互延迟、动画时长等

---

### 7. `photoConfig.ts` - 照片展示配置

**用途**: 照片墙布局、动画、视频播放

**主要配置项**:
- `PHOTO_CONFIG`: 照片尺寸、间距、动画参数

---

## 使用指南

### 方式 1: 从索引文件导入 (推荐)
```typescript
import { PERFORMANCE_CONFIG, PARTICLE_CONFIG } from '@/config';
```

### 方式 2: 直接导入具体文件
```typescript
import { PERFORMANCE_CONFIG } from '@/config/performance';
import { PARTICLE_CONFIG } from '@/config/particles';
```

---

## 性能调优流程

### 问题诊断
1. 打开 `PerformanceMonitor` 组件查看实时 FPS
2. 检查 `Particle Count` 和 `Draw Calls`
3. 查看 `Frame Budget` 是否超标

### 调优步骤

#### 步骤 1: 调整默认粒子数量
**文件**: `src/config/performance.ts`
```typescript
PERFORMANCE_CONFIG.particles.defaultCount = 8000; // 降低到 8000
```

#### 步骤 2: 降低 Landing Page 采样密度
**文件**: `src/config/performance.ts`
```typescript
PERFORMANCE_CONFIG.landing.titleSamplingDensity = 8; // 从 6 提升到 8
```

#### 步骤 3: 关闭后处理效果 (极端情况)
**文件**: `src/config/performance.ts`
```typescript
PERFORMANCE_CONFIG.rendering.enablePostProcessing = false;
```

#### 步骤 4: 使用性能预设
**文件**: `src/store/slices/createConfigSlice.ts`
```typescript
import { PERFORMANCE_PRESETS } from '../../config/performance';

particleCount: PERFORMANCE_PRESETS.performance.particleCount, // 8000
```

---

## 配置依赖关系

```
performance.ts (性能配置)
    ↓
landing.ts (引用性能配置)
    ↓
LandingTitle.tsx / LandingParticles.tsx (消费配置)

performance.ts
    ↓
createConfigSlice.ts (引用默认粒子数)
    ↓
useStore.ts (全局状态)
    ↓
Experience.tsx / TreeParticles.tsx (消费状态)
```

---

## 注意事项

1. **修改配置后需重启开发服务器** (`npm run dev`)
2. **粒子数量变更会清空 localStorage 缓存**，需重新设置
3. **采样密度值越大，粒子越少，性能越好**
4. **不要在组件中硬编码配置值**，始终从 `config` 文件夹引用
5. **性能预设仅供参考**，实际效果取决于设备性能

---

## 版本历史

### v1.0 (2025-12-09)
- ✅ 创建 `performance.ts` 性能配置文件
- ✅ 将默认粒子数从 `18000` 降至 `12000`
- ✅ 将 Landing Page 采样密度从 `4` 提升到 `6`
- ✅ 将粒子尺寸从 `1.5-2.0` 增大到 `1.8-2.4`
- ✅ 迁移相机漂移配置到 `performance.ts`
- ✅ 创建 `index.ts` 统一导出入口
- ✅ 更新 `landing.ts` 引用性能配置
- ✅ 更新 `createConfigSlice.ts` 引用性能配置
- ✅ 更新 `Experience.tsx` 引用性能配置

---

## 相关文件

- **配置消费者**: 
  - `src/store/slices/createConfigSlice.ts`
  - `src/components/canvas/Experience.tsx`
  - `src/components/ui/LandingTitle.tsx`
  - `src/components/canvas/LandingParticles.tsx`
  - `src/components/canvas/TreeParticles.tsx`

- **性能监控**: 
  - `src/components/canvas/PerformanceMonitor.tsx`
