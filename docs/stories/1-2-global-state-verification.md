# Story 1.2 Global State - 验证清单

## 测试步骤

### 1. Debug 面板位置与可见性
- [ ] 刷新页面，确认 Debug 面板默认不显示
- [ ] 按 F4 键，Debug 面板应该出现在**左上角**
- [ ] 再次按 F4，面板应该隐藏
- [ ] 确认面板不与右侧 Controls 重叠

### 2. isExploded 状态同步测试

#### 2.1 通过 Debug 面板触发
- [ ] 按 F4 打开 debug 面板
- [ ] 点击 "Trigger Explosion" 按钮
- [ ] **预期**: 
  - Debug 面板中的 "Exploded" 显示为 TRUE (红色背景)
  - 圣诞树应该炸开成相册墙
  - Updates 计数器应该增加

#### 2.2 通过 UI 点击树触发
- [ ] 点击圣诞树（3D场景中）
- [ ] **预期**:
  - Debug 面板中的 "Exploded" 值应该切换
  - 场景应该在树和相册墙间切换
  - Updates 计数器应该增加

#### 2.3 通过 Controls 面板触发
- [ ] 打开右侧 Controls 面板（齿轮图标）
- [ ] 点击 "Reveal" 或 "Rebuild" 按钮
- [ ] **预期**:
  - Debug 面板中的 "Exploded" 值应该同步更新
  - Updates 计数器应该增加

### 3. particleCount 状态同步测试

#### 3.1 通过 Debug 面板调整
- [ ] 打开 Debug 面板 (F4)
- [ ] 点击 "+1k Particles" 按钮多次
- [ ] **预期**:
  - Debug 面板中的 "Particles" 数值增加 (例如: 18000 → 19000 → 20000)
  - 右侧 Controls 中的 "Particle Count" 滑块位置应该同步移动
  - 圣诞树的粒子数量应该增加（视觉上更密集）
  - Updates 计数器应该增加

#### 3.2 通过 Controls 滑块调整
- [ ] 打开右侧 Controls 面板
- [ ] 拖动 "Particle Count" 滑块
- [ ] **预期**:
  - Debug 面板中的 "Particles" 数值应该实时更新
  - 圣诞树的粒子效果应该实时改变
  - Updates 计数器应该快速增加

### 4. 持久化测试 (LocalStorage)

#### 4.1 保存测试
- [ ] 打开 Debug 面板
- [ ] 修改 particleCount (例如: 改为 25000)
- [ ] 触发 explosion (Exploded = TRUE)
- [ ] 切换 theme (例如: 切换到 daylight)
- [ ] 打开浏览器开发者工具 → Application → Local Storage
- [ ] **预期**: 应该看到 `christmas-tree-storage` 键，值包含最新的状态

#### 4.2 恢复测试
- [ ] 刷新页面 (F5)
- [ ] 打开 Debug 面板 (F4)
- [ ] **预期**:
  - particleCount 保持为修改后的值
  - isExploded 保持为 true (相册墙状态)
  - theme 保持为修改后的值

### 5. 已知限制（待后续 Story 解决）
- [ ] 上传照片后，"Active Photo" 仍显示为 null（photos 尚未迁移到全局 store）
- [ ] 通过 Debug 面板切换 theme 时，界面目前无变化（theme 应用逻辑需在后续 Story 中实现）

## 问题记录

### 已修复
1. ✅ Debug 面板从右上角移至左上角，避免与 Controls 重叠
2. ✅ Debug 面板默认隐藏，通过 F4 切换
3. ✅ isExploded 双向同步（Debug ↔ UI）
4. ✅ particleCount 双向同步（Debug ↔ UI）
5. ✅ 持久化功能正常工作
6. ✅ Updates 计数器显示组件重渲染次数，验证响应式

### 待解决（后续 Story）
1. ⏳ photos 状态迁移到全局 store
2. ⏳ activePhotoId 应用逻辑实现
3. ⏳ theme 切换的视觉效果实现

## 验收标准
- [x] AC1: `src/store/useStore.ts` 已创建
- [x] AC2: Zustand store 使用 persist 中间件
- [x] AC3: State interface 包含所有必需字段
- [x] AC4: 所有 Actions 已实现
- [x] AC5: TypeScript 类型定义已导出
- [x] 额外: Debug 工具可用且功能完整
