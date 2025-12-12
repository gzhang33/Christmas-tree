# Action Hint 实现验证清单

## 已实现功能

### 1. ActionHint 组件
- [x] 创建 `ActionHint.tsx` 组件
- [x] 实现呼吸动效
- [x] 支持自定义位置 (bottom-left, bottom-right, bottom-center)
- [x] 淡入淡出动画
- [x] 半透明背景 + 毛玻璃效果
- [x] z-index 设置为 40，确保可见性

### 2. Tree Idle 提示 (点击/Click)
- [x] 添加到 App.tsx
- [x] 显示条件: `landingPhase === 'tree' && !isExploded && !hoveredPhotoInstanceId`
- [x] 主文本: "Click"
- [x] 副文本: "点击"
- [x] 位置: bottom-center

### 3. Photo Sea 提示 (双击还原/Double Click to restore)
- [x] 添加到 App.tsx
- [x] 显示条件: `landingPhase === 'tree' && isExploded`
- [x] 主文本: "Double Click to restore"
- [x] 副文本: "双击还原"
- [x] 位置: bottom-center

## 验证步骤

### Tree Idle 提示验证
1. 启动应用
2. 完成名称输入流程
3. 等待过渡到 tree 阶段
4. 确认屏幕底部中央显示 "Click / 点击" 提示
5. 确认提示有呼吸动效
6. 当悬停在照片上时，提示应该消失

### Photo Sea 提示验证
1. 在 tree 阶段，点击 Controls 面板的 "Reveal" 按钮触发爆炸
2. 确认屏幕底部中央显示 "Double Click to restore / 双击还原" 提示
3. 确认提示有呼吸动效
4. 双击屏幕或点击 "Rebuild" 按钮后，提示应该消失

## 设计说明

- **不遮挡主体内容**: 提示位于屏幕底部，采用半透明设计
- **视觉一致性**: 使用与项目一致的设计语言
- **呼吸动效**: 使用 framer-motion 实现平滑的呼吸效果
- **响应式**: 在不同屏幕尺寸下都能正常显示
