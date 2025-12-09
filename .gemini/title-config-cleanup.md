# Title 配置冗余代码清理

## 🧹 清理内容

### 删除的冗余配置

#### 1. `breakpoints.tablet` (未使用)
```typescript
// 删除前
breakpoints: {
    mobile: 768,
    tablet: 1200,  // ❌ 定义但从未使用
}

// 删除后
breakpoints: {
    mobile: 768,
}
```

**原因**: 
- `isTablet` 变量在 `LandingTitle.tsx` L139 被定义，但从未在后续代码中使用
- 当前只需要区分移动端和桌面端，不需要单独的平板断点

#### 2. `isTablet` 变量 (LandingTitle.tsx)
```typescript
// 删除前
const isMobile = width < LANDING_CONFIG.title.breakpoints.mobile;
const isTablet = width >= LANDING_CONFIG.title.breakpoints.mobile && width < LANDING_CONFIG.title.breakpoints.tablet;  // ❌ 未使用
const vp = LANDING_CONFIG.title.viewportScale;

// 删除后
const isMobile = width < LANDING_CONFIG.title.breakpoints.mobile;
const vp = LANDING_CONFIG.title.viewportScale;
```

## 📊 清理统计

| 项目 | 删除行数 | 文件 |
|------|---------|------|
| `breakpoints.tablet` | 1 | `landing.ts` |
| `isTablet` 变量 | 1 | `LandingTitle.tsx` |
| **总计** | **2** | **2 个文件** |

## ✅ 保留的配置

以下配置都在使用中，已验证：

### title 配置
- ✅ `scale` - 全局缩放修正
- ✅ `densityOverride` - 调试用密度覆盖
- ✅ `breakpoints.mobile` - 移动端断点
- ✅ `viewportScale.*` - 视口缩放规则（全部使用）
- ✅ `padding.horizontal.*` - 横向边距（mobile/desktop）
- ✅ `padding.vertical.*` - 纵向边距（mobile/desktop）
- ✅ `padding.leftPadding` - 左对齐边距
- ✅ `alignment.*` - 对齐方式（normal/compact）
- ✅ `verticalOffset.*` - 垂直偏移（normal/compact）
- ✅ `horizontalOffset.*` - 水平偏移（normal/compact）
- ✅ `particleGeneration.*` - 3D 粒子生成参数（全部使用）
- ✅ `animation.fadeTransitionDuration` - 淡入淡出时长
- ✅ `animation.defaultScreenHeight` - 默认屏幕高度

## 🎯 清理效果

1. **代码更简洁**: 删除了 2 行未使用的代码
2. **配置更清晰**: 移除了容易引起混淆的 tablet 断点
3. **维护性提升**: 减少了不必要的配置项
4. **无功能影响**: 删除的都是未使用的代码，不影响现有功能

## 📝 响应式逻辑

当前的响应式逻辑非常简单明了：

```typescript
const isMobile = width < 768;

// 根据 isMobile 选择配置
const config = isMobile ? compact : normal;
```

这种二分法足以满足当前需求：
- **移动端** (< 768px): 居中对齐，较小字体
- **桌面端** (≥ 768px): 左对齐，较大字体

如果未来需要平板专用配置，可以重新添加 `tablet` 断点。

## 🔍 验证方法

使用 `grep_search` 工具验证：
1. 搜索 `breakpoints.tablet` - 仅在配置定义处出现
2. 搜索 `isTablet` - 仅在变量定义处出现，无实际使用

## 📁 相关文件

- `src/config/landing.ts` - L152-155 (删除 tablet 断点)
- `src/components/ui/LandingTitle.tsx` - L139 (删除 isTablet 变量)
