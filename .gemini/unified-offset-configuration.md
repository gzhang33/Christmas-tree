# 标题和用户名统一偏移配置

## 🎯 目标

统一标题（"Merry Christmas"）和用户名的偏移配置机制，使两者都支持响应式的水平和垂直偏移。

## ✅ 完成的改动

### 1. 配置文件 (`landing.ts`)

#### 标题配置 - 新增 `horizontalOffset`
```typescript
LANDING_CONFIG.title = {
    // ... 其他配置
    
    // 垂直偏移量 (百分比相对于视口高度)
    verticalOffset: {
        normal: -5,   // 桌面：略偏上
        compact: -18, // 移动：上移（较高位置）
    },
    
    // 水平偏移量 (倍率值，基于 fontSize * lineSpacing 进行缩放)
    horizontalOffset: {
        normal: 0,   // 桌面：无水平偏移（左对齐已通过 leftPadding 控制）
        compact: 0,  // 移动：无水平偏移（居中对齐）
    },
}
```

#### 用户名配置 - 已有配置
```typescript
LANDING_CONFIG.userName = {
    // ... 其他配置
    
    // 位置偏移（倍率值，基于 fontSize * lineSpacing 进行缩放）
    yOffset: {
        normal: 1.0,  // 桌面端垂直偏移倍率
        compact: 1.5, // 移动端垂直偏移倍率
    },
    xOffset: {
        normal: 5.15, // 桌面端水平偏移倍率
        compact: 0.3, // 移动端水平偏移倍率
    },
}
```

### 2. 组件实现 (`LandingTitle.tsx`)

#### 统一的缩放公式
```typescript
// 标题
transform: `translate(
  ${fontSize * lineSpacing * horizontalOffset / innerWidth * 100}%,
  ${verticalOffset}%
)`

// 用户名
transform: `translate(
  ${fontSize * lineSpacing * xOffset / innerWidth * 100}%,
  ${verticalOffset + (fontSize * lineSpacing * yOffset / innerHeight * 100)}%
)`
```

## 📊 配置对比

| 元素 | 垂直偏移 | 水平偏移 | 缩放机制 |
|------|---------|---------|---------|
| **标题** | `verticalOffset` (%) | `horizontalOffset` (倍率) | 响应式 |
| **用户名** | `yOffset` (倍率) | `xOffset` (倍率) | 响应式 |

### 注意差异
- **标题的垂直偏移**: 直接使用百分比 (`verticalOffset`)
- **用户名的垂直偏移**: 使用倍率计算 (`yOffset`)，基于标题位置叠加

这是因为：
- 标题是页面的主要元素，垂直位置相对于视口固定
- 用户名是相对于标题定位的，需要基于标题的字体大小计算间距

## 🎨 使用示例

### 场景 1: 标题和用户名都居中（移动端）
```typescript
// 标题
horizontalOffset: { compact: 0 }
verticalOffset: { compact: -18 }

// 用户名
xOffset: { compact: 0 }
yOffset: { compact: 1.5 }
```

### 场景 2: 标题左对齐，用户名略微右移（桌面端）
```typescript
// 标题
horizontalOffset: { normal: 0 }      // 通过 leftPadding 控制
verticalOffset: { normal: -5 }

// 用户名
xOffset: { normal: 5.15 }            // 相对标题右移
yOffset: { normal: 1.0 }
```

### 场景 3: 标题和用户名都右移
```typescript
// 标题
horizontalOffset: { normal: 2.0 }    // 整体右移
verticalOffset: { normal: -5 }

// 用户名
xOffset: { normal: 2.0 }             // 跟随标题右移
yOffset: { normal: 1.0 }
```

## 🔧 调整指南

### 推荐值范围

#### 标题
- `verticalOffset`: `-30 ~ 10` (百分比)
- `horizontalOffset`: `0 ~ 3.0` (倍率)

#### 用户名
- `yOffset`: `0.5 ~ 3.0` (垂直间距倍率)
- `xOffset`: `0 ~ 5.0` (水平偏移倍率)

### 计算示例

假设桌面端：
- `fontSize = 300px`
- `lineSpacing = 1.1`
- `innerWidth = 1920px`

#### 标题水平偏移
```
horizontalOffset = 1.0
实际偏移 = 300 × 1.1 × 1.0 / 1920 × 100 ≈ 17.2%
像素值 = 1920 × 17.2% ≈ 330px
```

#### 用户名水平偏移
```
xOffset = 5.15
实际偏移 = 300 × 1.1 × 5.15 / 1920 × 100 ≈ 88.4%
像素值 = 1920 × 88.4% ≈ 1697px
```

## ✨ 优势

1. **统一机制**: 标题和用户名都使用响应式缩放
2. **灵活控制**: 可以独立调整标题和用户名的位置
3. **自适应**: 自动适配不同屏幕尺寸和字体大小
4. **直观配置**: 使用倍率值，易于理解和调整

## 📝 注意事项

1. **标题左对齐**: 桌面端通常通过 `leftPadding` 控制，`horizontalOffset` 保持为 `0`
2. **用户名跟随**: 如果标题有 `horizontalOffset`，用户名的 `xOffset` 应该设置相同值以保持对齐
3. **移动端居中**: 移动端通常居中对齐，两者的水平偏移都应该为 `0`
4. **响应式测试**: 调整后需要在不同屏幕尺寸下测试效果

## 🔍 相关文件

- `src/config/landing.ts` - 配置定义
  - L184-196: 标题偏移配置
  - L235-243: 用户名偏移配置
- `src/components/ui/LandingTitle.tsx` - 实现逻辑
  - L209-212: 读取配置
  - L583: 标题 transform
  - L608: 用户名 transform
