# 配置文件整理总结

## 执行时间
2025-12-09

## 整理目标
确保每个配置参数都放置在对应功能的文件中，避免配置混乱和跨功能污染。

---

## 配置文件功能归属

### 1. `performance.ts` - 性能优化配置 ⭐
**功能范围**: 影响渲染性能的全局参数

**包含配置**:
- ✅ 粒子数量配置 (`particles.defaultCount`, `particles.recommended`, `particles.range`)
- ✅ Landing Page 性能配置 (`landing.titleSamplingDensity`, `landing.particleGenerationDensity`, `landing.particleSize`)
- ✅ 渲染优化配置 (`rendering.enablePostProcessing`, `rendering.enableShadows`, `rendering.maxPixelRatio`)
- ✅ 相机配置 (`camera.driftSpeed`, `camera.idleThreshold`, `camera.minDistance`)
- ✅ 性能预设 (`PERFORMANCE_PRESETS`)
- ✅ 性能监控阈值 (`PERFORMANCE_THRESHOLDS`)

**不包含**:
- ❌ 具体场景的业务逻辑配置 (如照片分布、粒子类型比例)
- ❌ UI 组件的交互参数 (如悬停效果)

---

### 2. `particles.ts` - 圣诞树粒子配置
**功能范围**: 圣诞树场景的粒子系统

**包含配置**:
- ✅ 树形尺寸 (`treeHeight`, `treeBottomY`)
- ✅ 粒子分布比例 (`ratios.entity`, `ratios.glow`, `ratios.ornament`, `ratios.gift`, `ratios.magicDust`)
- ✅ 最小粒子数量 (`minCounts`)
- ✅ 魔法尘埃特效 (`magicDust`)
- ✅ 树动画配置 (`animation.breatheFrequency`, `animation.swayAmplitude`, etc.)

**不包含**:
- ❌ Landing Page 的粒子配置 (已移至 `landing.ts`)
- ❌ 照片墙的粒子配置 (已移至 `photoConfig.ts`)
- ❌ 性能相关的粒子数量默认值 (已移至 `performance.ts`)

---

### 3. `landing.ts` - 落地页配置
**功能范围**: Landing Page 标题粒子系统和流程控制

**包含配置**:
- ✅ 标题颜色方案 (`TITLE_COLORS`, `USERNAME_COLORS`)
- ✅ 字体与排版 (`TITLE_CONFIG.font`, `TITLE_CONFIG.text`)
- ✅ 粒子采样 (`TITLE_CONFIG.sampling`) - **引用自 `performance.ts`**
- ✅ 粒子渲染 (`TITLE_CONFIG.particle`) - **引用自 `performance.ts`**
- ✅ 动画参数 (`TITLE_CONFIG.animation`)
- ✅ 响应式布局 (`LANDING_CONFIG.title`)
- ✅ 用户名配置 (`LANDING_CONFIG.userName`)
- ✅ 流程配置 (`LANDING_CONFIG.entrance`, `LANDING_CONFIG.typewriter`, `LANDING_CONFIG.morphing`)

**不包含**:
- ❌ 圣诞树场景的配置 (在 `particles.ts`)
- ❌ 照片墙的配置 (在 `photoConfig.ts`)

---

### 4. `colors.ts` - 颜色配置
**功能范围**: 圣诞树颜色预设和静态颜色常量

**包含配置**:
- ✅ 颜色预设数组 (`TREE_COLOR_PRESETS`)
- ✅ 默认颜色 (`DEFAULT_TREE_COLOR`)
- ✅ 向后兼容导出 (`TREE_COLORS`, `TREE_COLOR_NAMES`)
- ✅ 静态颜色常量 (`STATIC_COLORS`)

**不包含**:
- ❌ Landing Page 的颜色 (在 `landing.ts` 中的 `TITLE_COLORS`, `USERNAME_COLORS`)
- ❌ 魔法尘埃的颜色 (在 `particles.ts` 中的 `magicDust.colors`)

---

### 5. `photoConfig.ts` - 照片墙配置
**功能范围**: 爆炸效果时的照片展示

**包含配置**:
- ✅ 照片数量 (`PHOTO_COUNT`)
- ✅ 球形分布参数 (`PHOTO_DISTRIBUTION`)
- ✅ 照片尺寸 (`PHOTO_DIMENSIONS`)
- ✅ 变形动画时序 (`MORPH_TIMING`)
- ✅ 位置生成函数 (`generatePhotoPositions`, `gaussianRandom`)

**不包含**:
- ❌ 照片悬停交互 (在 `interactions.ts`)
- ❌ 照片资源路径 (在 `assets.ts`)

---

### 6. `interactions.ts` - 交互配置
**功能范围**: 照片悬停、点击等交互行为

**包含配置**:
- ✅ 悬停效果配置 (`INTERACTION_CONFIG.hover`)
- ✅ 向后兼容导出 (`HOVER_CONFIG`)

**不包含**:
- ❌ 相机控制参数 (在 `performance.ts` 中的 `camera`)
- ❌ 照片位置和分布 (在 `photoConfig.ts`)

---

### 7. `assets.ts` - 资源配置
**功能范围**: 静态资源路径

**包含配置**:
- ✅ 照片资源数组 (`MEMORIES`)

**不包含**:
- ❌ 资源的展示配置 (在 `photoConfig.ts`)
- ❌ 资源的交互配置 (在 `interactions.ts`)

---

## 配置归属原则

### ✅ 正确的归属示例

1. **性能相关参数 → `performance.ts`**
   ```typescript
   // ✅ 正确：默认粒子数量影响性能
   PERFORMANCE_CONFIG.particles.defaultCount = 12000;
   
   // ✅ 正确：采样密度影响性能
   PERFORMANCE_CONFIG.landing.titleSamplingDensity = 6;
   ```

2. **场景特定参数 → 对应场景文件**
   ```typescript
   // ✅ 正确：圣诞树粒子比例在 particles.ts
   PARTICLE_CONFIG.ratios.entity = 0.50;
   
   // ✅ 正确：Landing 标题颜色在 landing.ts
   TITLE_COLORS = ['#C41E3A', '#228B22', ...];
   ```

3. **交互行为参数 → `interactions.ts`**
   ```typescript
   // ✅ 正确：照片悬停效果在 interactions.ts
   INTERACTION_CONFIG.hover.scaleTarget = 1.5;
   ```

### ❌ 错误的归属示例

1. **跨功能污染**
   ```typescript
   // ❌ 错误：照片分布参数不应该在 particles.ts
   // particles.ts 应该只包含圣诞树粒子配置
   
   // ❌ 错误：性能参数不应该硬编码在组件中
   // 应该在 performance.ts 中统一管理
   ```

2. **配置重复**
   ```typescript
   // ❌ 错误：同一个参数在多个文件中定义
   // 应该只在一个文件中定义，其他文件引用
   ```

---

## 配置引用关系

```
performance.ts (性能配置)
    ↓ 被引用
landing.ts (引用性能配置)
    ↓ 被引用
LandingTitle.tsx / LandingParticles.tsx (消费配置)

performance.ts
    ↓ 被引用
createConfigSlice.ts (引用默认粒子数)
    ↓ 被引用
useStore.ts (全局状态)
    ↓ 被引用
Experience.tsx / TreeParticles.tsx (消费状态)

particles.ts (圣诞树粒子配置)
    ↓ 被引用
TreeParticles.tsx / MagicDust.tsx (消费配置)

photoConfig.ts (照片墙配置)
    ↓ 被引用
TreeParticles.tsx (消费配置)

interactions.ts (交互配置)
    ↓ 被引用
PolaroidPhoto.tsx (消费配置)

colors.ts (颜色配置)
    ↓ 被引用
Controls.tsx / TreeParticles.tsx (消费配置)
```

---

## 修改内容

### 1. `colors.ts` - 添加缺失的导出
**变更前**:
```typescript
// 缺少 TREE_COLORS 和 TREE_COLOR_NAMES 导出
export const TREE_COLOR_PRESETS = [...];
export const DEFAULT_TREE_COLOR = '#D53F8C';
export const STATIC_COLORS = {...};
```

**变更后**:
```typescript
export const TREE_COLOR_PRESETS = [...];
export const DEFAULT_TREE_COLOR = '#D53F8C';

// 新增：向后兼容导出
export const TREE_COLORS = TREE_COLOR_PRESETS.map(preset => preset.hex);
export const TREE_COLOR_NAMES = TREE_COLOR_PRESETS.reduce((acc, preset) => {
    acc[preset.hex] = preset.name;
    return acc;
}, {} as Record<string, string>);

export const STATIC_COLORS = {...} as const;
```

---

### 2. `interactions.ts` - 统一命名规范
**变更前**:
```typescript
export const HOVER_CONFIG = {
    scaleTarget: 1.5,
    // ...
};
```

**变更后**:
```typescript
export const INTERACTION_CONFIG = {
    hover: {
        scaleTarget: 1.5,
        // ...
    },
} as const;

// 向后兼容：保留旧的导出名称
export const HOVER_CONFIG = INTERACTION_CONFIG.hover;
```

---

### 3. `particles.ts` - 添加中文注释
**变更前**:
```typescript
export const PARTICLE_CONFIG = {
    // Tree Dimensions
    treeHeight: 14,
    // ...
};
```

**变更后**:
```typescript
/**
 * 圣诞树粒子系统配置
 */
export const PARTICLE_CONFIG = {
    // ------------------------------------------------------------------------
    // 树形尺寸 (Tree Dimensions)
    // ------------------------------------------------------------------------
    treeHeight: 14,      // 树的高度
    treeBottomY: -5.5,   // 树底部的 Y 坐标
    // ...
} as const;
```

---

### 4. `photoConfig.ts` - 添加中文注释
**变更前**:
```typescript
/**
 * Photo Distribution Configuration
 */
export const PHOTO_COUNT = 99;
export const PHOTO_DISTRIBUTION = {...};
```

**变更后**:
```typescript
/**
 * Photo Configuration
 * 照片配置文件
 * 
 * 管理照片墙的分布、动画和布局参数
 */
export const PHOTO_COUNT = 99;

/**
 * 照片球形分布参数
 * 控制照片在 3D 空间中的分布范围
 */
export const PHOTO_DISTRIBUTION = {...} as const;
```

---

### 5. `index.ts` - 更新导出清单
**变更前**:
```typescript
export { DEFAULT_TREE_COLOR, TREE_COLORS, TREE_COLOR_NAMES } from './colors';
export { INTERACTION_CONFIG } from './interactions';
export { PHOTO_CONFIG } from './photoConfig'; // ❌ 不存在
```

**变更后**:
```typescript
// 颜色配置
export { 
    DEFAULT_TREE_COLOR,
    TREE_COLOR_PRESETS,
    TREE_COLORS,
    TREE_COLOR_NAMES,
    STATIC_COLORS,
    type ColorPreset
} from './colors';

// 交互配置
export { 
    INTERACTION_CONFIG,
    HOVER_CONFIG  // 向后兼容
} from './interactions';

// 照片墙配置
export {
    PHOTO_COUNT,
    PHOTO_DISTRIBUTION,
    PHOTO_DIMENSIONS,
    MORPH_TIMING,
    generatePhotoPositions,
    gaussianRandom,
    type PhotoPosition
} from './photoConfig';
```

---

## 配置文件清单

### 核心配置文件 (7个)
1. ✅ `performance.ts` - 性能优化配置
2. ✅ `particles.ts` - 圣诞树粒子配置
3. ✅ `landing.ts` - 落地页配置
4. ✅ `colors.ts` - 颜色配置
5. ✅ `photoConfig.ts` - 照片墙配置
6. ✅ `interactions.ts` - 交互配置
7. ✅ `assets.ts` - 资源配置

### 辅助文件 (3个)
8. ✅ `index.ts` - 统一导出入口
9. ✅ `README.md` - 配置文档
10. ✅ `.gemini/config-organization-summary.md` - 本文件

---

## 验证清单

### 功能归属验证
- [x] 性能参数都在 `performance.ts`
- [x] 圣诞树粒子参数都在 `particles.ts`
- [x] Landing Page 参数都在 `landing.ts`
- [x] 照片墙参数都在 `photoConfig.ts`
- [x] 交互参数都在 `interactions.ts`
- [x] 颜色参数都在 `colors.ts`
- [x] 资源路径都在 `assets.ts`

### 导出完整性验证
- [x] `index.ts` 中所有导出都存在
- [x] 没有循环依赖
- [x] 类型导出正确 (`type ColorPreset`, `type PhotoPosition`)

### 命名规范验证
- [x] 所有配置常量使用 `UPPER_SNAKE_CASE`
- [x] 所有配置对象使用 `as const` 确保不可变
- [x] 中英文注释完整

### 向后兼容性验证
- [x] `HOVER_CONFIG` 仍可用 (指向 `INTERACTION_CONFIG.hover`)
- [x] `TREE_COLORS` 仍可用 (从 `TREE_COLOR_PRESETS` 生成)
- [x] `TREE_COLOR_NAMES` 仍可用 (从 `TREE_COLOR_PRESETS` 生成)

---

## 最佳实践

### 1. 添加新配置时
```typescript
// ✅ 正确：先确定功能归属
// 如果是性能相关 → performance.ts
// 如果是场景特定 → 对应场景文件
// 如果是交互行为 → interactions.ts

// ✅ 正确：添加中文注释
export const NEW_CONFIG = {
    // 参数说明 (中文)
    parameterName: value,
} as const;
```

### 2. 修改现有配置时
```typescript
// ✅ 正确：只在一个文件中修改
// ❌ 错误：在多个文件中重复定义

// ✅ 正确：其他文件通过引用使用
import { PERFORMANCE_CONFIG } from './performance';
const density = PERFORMANCE_CONFIG.landing.titleSamplingDensity;
```

### 3. 引用配置时
```typescript
// ✅ 推荐：从 index.ts 导入
import { PERFORMANCE_CONFIG, PARTICLE_CONFIG } from '@/config';

// ✅ 可选：直接从具体文件导入
import { PERFORMANCE_CONFIG } from '@/config/performance';
```

---

## 总结

本次整理确保了：
1. ✅ 每个配置参数都在正确的功能文件中
2. ✅ 没有跨功能污染 (如照片配置不在 particles.ts)
3. ✅ 所有导出都存在且正确
4. ✅ 命名规范统一
5. ✅ 中英文注释完整
6. ✅ 向后兼容性保持

配置文件现在结构清晰，易于维护和扩展。
