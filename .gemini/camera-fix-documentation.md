# 相机控制 Bug 修复

## 🐛 问题描述

**症状**: 用户无法自由旋转相机视角，相机会被持续拉回默认位置

**原因**: `CameraController` 在关闭照片后会持续将相机拉回默认位置，与 `OrbitControls` 的用户交互产生冲突

## 🔧 修复方案

### 修改前的问题代码

```typescript
useFrame((state, delta) => {
    if (!activePhoto) {
        if (hadActivePhoto.current) {
            // ❌ 问题：会持续执行，阻止用户控制相机
            const damp = Math.min(CAMERA_CONFIG.transition.returnDampingSpeed * delta, 1.0);
            state.camera.position.lerp(defaultPosRef.current, damp);
            // ... 持续拉回相机
        }
        return;
    }
    // ...
});
```

**问题分析**:
1. 只要 `hadActivePhoto.current === true`，相机就会被持续拉回
2. 用户使用 OrbitControls 旋转相机时，相机会立即被拉回默认位置
3. 无法自由探索场景

### 修复后的代码

```typescript
// 添加计时器追踪照片关闭时间
const photoClosedTime = useRef<number | null>(null);

useFrame((state, delta) => {
    if (!activePhoto) {
        if (hadActivePhoto.current) {
            // ✅ 初始化关闭时间
            if (photoClosedTime.current === null) {
                photoClosedTime.current = state.clock.getElapsedTime();
            }

            // ✅ 计算经过时间
            const elapsedSinceClose = state.clock.getElapsedTime() - photoClosedTime.current;

            // ✅ 只在短时间内执行返回动画
            if (elapsedSinceClose < CAMERA_CONFIG.transition.returnAnimationDuration) {
                // 执行返回动画
                const damp = Math.min(CAMERA_CONFIG.transition.returnDampingSpeed * delta, 1.0);
                state.camera.position.lerp(defaultPosRef.current, damp);
                // ...
            } else {
                // ✅ 动画完成后，重置标志，允许用户控制
                hadActivePhoto.current = false;
                photoClosedTime.current = null;
            }
        }
        return;
    }

    // ✅ 打开照片时重置计时器
    hadActivePhoto.current = true;
    photoClosedTime.current = null;
    // ...
});
```

## ✅ 修复效果

### 行为流程

1. **打开照片时**:
   - `hadActivePhoto.current = true`
   - `photoClosedTime.current = null`
   - 相机移动到照片前方

2. **关闭照片时**:
   - `photoClosedTime.current` 记录当前时间
   - 开始返回动画（持续 1.5 秒）

3. **返回动画期间** (0-1.5秒):
   - 相机平滑返回默认位置
   - 用户暂时无法控制（避免冲突）

4. **动画完成后** (>1.5秒):
   - `hadActivePhoto.current = false`
   - `photoClosedTime.current = null`
   - **用户可以自由使用 OrbitControls 旋转相机** ✅

## 📊 配置参数

新增配置参数在 `config/performance.ts`:

```typescript
export const CAMERA_CONFIG = {
    transition: {
        returnDampingSpeed: 2,              // 返回速度
        returnAnimationDuration: 1.5,       // 返回动画持续时间（秒）
    },
} as const;
```

### 参数说明

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `returnDampingSpeed` | 2 | 相机返回的插值速度倍数 |
| `returnAnimationDuration` | 1.5 | 返回动画持续时间（秒），之后允许用户自由控制 |

### 调整建议

- **更快返回**: 增加 `returnDampingSpeed` 或减少 `returnAnimationDuration`
- **更慢返回**: 减少 `returnDampingSpeed` 或增加 `returnAnimationDuration`
- **立即允许控制**: 设置 `returnAnimationDuration: 0`

## 🎯 测试场景

### 测试步骤

1. ✅ **正常流程**:
   - 点击照片 → 相机移动到照片
   - 关闭照片 → 相机返回默认位置（1.5秒）
   - 等待动画完成 → 可以自由旋转相机

2. ✅ **快速切换**:
   - 点击照片A → 点击照片B
   - 相机应正确移动到照片B

3. ✅ **初始加载**:
   - 页面加载时相机不应移动
   - 只有在关闭过照片后才会有返回动画

4. ✅ **用户控制**:
   - 返回动画完成后
   - 用户可以使用鼠标拖拽旋转相机
   - 相机不会被拉回

## 🔍 技术细节

### 状态管理

```typescript
// 三个关键状态
hadActivePhoto.current      // 是否曾经有过活动照片
photoClosedTime.current     // 照片关闭的时间戳
activePhoto                 // 当前活动的照片（来自 store）
```

### 状态转换

```
初始状态:
  hadActivePhoto = false
  photoClosedTime = null
  activePhoto = null

打开照片:
  hadActivePhoto = true
  photoClosedTime = null
  activePhoto = {...}

关闭照片:
  hadActivePhoto = true
  photoClosedTime = 当前时间
  activePhoto = null

动画完成:
  hadActivePhoto = false  ← 重置，允许用户控制
  photoClosedTime = null
  activePhoto = null
```

## 📝 相关文件

### 修改的文件

1. **`src/components/canvas/CameraController.tsx`**
   - 添加 `photoClosedTime` 状态追踪
   - 添加时间检查逻辑
   - 添加动画完成后的重置逻辑

2. **`src/config/performance.ts`**
   - 添加 `returnAnimationDuration` 配置参数

### 影响的组件

- ✅ `CameraController` - 相机控制逻辑
- ✅ `OrbitControls` (在 Experience.tsx) - 用户交互
- ✅ `PolaroidPhoto` - 照片点击交互

## ✅ 总结

**修复前**: 相机被持续锁定，无法自由旋转  
**修复后**: 返回动画完成后，用户可以自由控制相机

**关键改进**:
- ✅ 添加时间限制的返回动画
- ✅ 动画完成后释放相机控制
- ✅ 配置参数可调整
- ✅ 不影响照片查看功能

**用户体验提升**:
- ✅ 可以自由探索场景
- ✅ 可以从不同角度观看圣诞树
- ✅ OrbitControls 正常工作
- ✅ 照片查看功能保持不变
