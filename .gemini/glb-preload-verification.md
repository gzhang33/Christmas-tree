# GLB模型预加载验证文档

## 当前实现机制

### 1. AssetPreloader组件
- **位置**: SceneContainer.tsx Line 198
- **挂载时机**: Canvas创建时立即挂载
- **工作流程**:
  1. **静态阶段** (组件挂载): `useGLTF.preload()` 排队所有6个GLB模型
  2. **动态阶段** (text/morphing/tree): `useGLTF()` 实际加载模型到内存

### 2. Floor组件
- **渲染条件**: entrance || text || morphing || tree
- **透明度**:
  - entrance: 0%
  - text: 30%
  - morphing/tree: 50%

## 预期控制台输出顺序

```
1. [应用启动]
   [AssetPreloader] Queueing GLB preload...

2. [用户输入完成 → entrance阶段]
   (Floor开始渲染，透明度0%)

3. [text intro阶段开始]
   [AssetPreloader] 6 GLB models loaded in phase: text
   (Floor透明度→30%)
   (此时6个GLB文件开始真实下载并解析)

4. [morphing阶段]
   (GLB已在缓存中)
   (Floor透明度→50%)

5. [tree阶段 - TreeParticles挂载]
   (TreeParticles的useGLTF直接从缓存读取，无需重新加载)
```

## 验证方法

### 浏览器开发者工具检查
1. 打开Network面板，筛选`.glb`文件
2. 刷新页面
3. 观察GLB文件的下载时机：
   - ✅ 应在text intro阶段开始下载
   - ✅ 在进入morphing阶段前全部完成
   - ✅ TreeParticles挂载时不再有新的GLB请求

### 控制台日志检查
1. 打开Console面板
2. 搜索"AssetPreloader"
3. 验证日志顺序与上述预期一致

## 关键技术点

1. **两阶段加载策略**
   - 第一阶段（preload）: 非阻塞，最佳努力
   - 第二阶段（useGLTF）: 实际加载，确保完成

2. **条件式渲染内部组件**
   - 符合React Hooks规则（hooks不能条件调用）
   - 通过条件渲染GiftModelLoader子组件实现

3. **drei缓存机制**
   - useGLTF自动缓存已加载的GLB
   - 相同URL的多次调用共享同一实例
   - TreeParticles的useGLTF(GIFT_MODELS)会命中缓存

4. **Floor同步加载**
   - Floor在entrance阶段就挂载（0%透明度）
   - 与GLB加载同时进行，无阻塞
   - text阶段淡入至30%，提供视觉反馈

## 故障排查

### 如果GLB仍在morphing阶段才加载
- 检查landingPhase状态是否正确传递到AssetPreloader
- 验证GiftModelLoader是否在text阶段渲染
- 查看浏览器缓存是否禁用

### 如果控制台无[AssetPreloader]日志
- 检查AssetPreloader组件是否正确导入
- 验证Canvas是否成功挂载
- 确认useStore正常工作
