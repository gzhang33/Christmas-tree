# userName xOffset 缩放机制修复

## 🐛 问题描述

用户反馈 `xOffset` 需要设置很大的值（如 50px）才能看到明显的偏移效果，而 `yOffset` 只需要小数值（如 1.0）就能产生显著效果。

## 🔍 根本原因

### 原实现
```typescript
// xOffset: 直接使用像素值
transform: `translate(${responsive.userNameXOffset}px, ...)`

// yOffset: 使用响应式缩放公式
transform: `translate(..., ${responsive.fontSize * lineSpacing * yOffset / innerHeight * 100}%)`
```

**问题**: 两者使用了不同的单位和缩放机制
- `xOffset`: 固定像素值，不随字体大小和视口缩放
- `yOffset`: 响应式百分比，基于字体大小和视口高度动态计算

## ✅ 解决方案

### 统一缩放机制
现在 `xOffset` 和 `yOffset` 都使用相同的响应式缩放公式：

```typescript
// verticalOffset: 基础垂直定位值（通常为 0，或根据布局需求设定的基准百分比）
const verticalOffset = 0;

transform: `translate(
  ${fontSize * lineSpacing * xOffset / innerWidth * 100}%,
  ${verticalOffset + (fontSize * lineSpacing * yOffset / innerHeight * 100)}%
)`
```

### 公式解析
```
水平偏移 (%) = fontSize × lineSpacing × xOffset / viewportWidth × 100
垂直偏移 (%) = fontSize × lineSpacing × yOffset / viewportHeight × 100
```

### 缩放效果
- **字体越大** → 偏移越大
- **视口越小** → 偏移百分比越大（保持视觉一致性）
- **倍率值** → 直观控制偏移程度

## 📊 参数调整

### 修改前
```typescript
xOffset: {
    normal: 50,    // 桌面端水平偏移（像素）
    compact: 50,   // 移动端水平偏移（像素）
}
```

### 修改后
```typescript
xOffset: {
    normal: 0.15,  // 桌面端水平偏移倍率
    compact: 0,    // 移动端水平偏移倍率（居中时通常为0）
}
```

## 🎯 使用指南

### 推荐值范围
- **yOffset**: `0.5 ~ 3.0` (垂直间距)
- **xOffset**: `0 ~ 0.5` (水平偏移)

### 典型场景
```typescript
// 桌面端：左对齐，用户名略微右移
xOffset: { normal: 0.15, compact: 0 }

// 桌面端：左对齐，用户名显著右移
xOffset: { normal: 0.5, compact: 0 }

// 移动端：居中对齐，无水平偏移
xOffset: { normal: 0, compact: 0 }
```

### 计算示例
假设：
- `fontSize = 300px`
- `lineSpacing = 1.1`
- `xOffset = 0.15`
- `viewportWidth = 1920px`

```
水平偏移 = 300 × 1.1 × 0.15 / 1920 × 100
        = 49.5 / 1920 × 100
        ≈ 2.58%
```

在 1920px 宽的屏幕上，实际偏移约为 `1920 × 2.58% ≈ 49.5px`

## ✨ 优势

1. **响应式**: 自动适配不同屏幕尺寸和字体大小
2. **一致性**: xOffset 和 yOffset 使用相同的缩放逻辑
3. **直观性**: 小数值即可产生明显效果，与 yOffset 行为一致
4. **可维护性**: 统一的计算公式，易于理解和调整

## 🔧 相关文件

- `src/config/landing.ts` - 配置定义（L229-237）
- `src/components/ui/LandingTitle.tsx` - 计算逻辑（L602）

## 📝 注意事项

- 移动端通常使用居中对齐，`xOffset.compact` 建议设为 `0`
- 桌面端左对齐时，可以使用小的正值（如 `0.15`）来增加视觉层次
- 如果需要向左偏移，可以使用负值（如 `-0.1`）
