# Story: Magic Halo Spiral Implementation

**Story ID**: 2-5-magic-halo-spiral  
**Epic**: Epic 2 - Particle Physics & Visual Effects  
**Status**: TODO  
**Created**: 2025-12-04  
**Dependencies**: 2-4-visual-polish (Crown removal completed)

## Objective

实现Magic Halo的螺旋路径生成和上升动画效果,替换当前的锥形分布。

## Background

在story 2-4-visual-polish中,我们成功完成了Crown层的移除和基础重构:
- 删除了135行Crown相关代码
- 将glowLayer重命名为magicHalo
- 更新了粒子分配配置

但是,`magicHaloData`仍使用原glowLayer的锥形粒子生成逻辑。本story将实现真正的螺旋路径。

## Acceptance Criteria

- [ ] AC #1: Magic Halo粒子沿螺旋路径分布,围绕树旋转
  - 螺旋半径约7.0 (比树基础半径5.5更宽)
  - 螺旋从树底部(-5.5)到顶部(8.5)
  - 粒子均匀分布在螺旋路径上

- [ ] AC #2: 螺旋具有上升动画效果
  - 粒子随时间向上移动
  - 到达顶部后从底部重新出现(循环)
  - 动画流畅,速度适中(可见但不分散注意力)

- [ ] AC #3: 视觉效果符合"Midnight Magic"主题
  - 颜色: 白色/金色/主题色的明亮光晕
  - HDR强度: 1.5-2.5 (确保可见性)
  - 粒子密度: 20%总粒子数

- [ ] AC #4: 移动端适配良好
  - 螺旋在小屏幕上完整可见
  - 性能稳定,无明显卡顿

## Tasks

### Task 1: 重写magicHaloData生成逻辑
**文件**: `src/components/canvas/TreeParticles.tsx`

```typescript
// 当前位置: 约第385-450行
const magicHaloData = useMemo(() => {
  const count = Math.floor(config.particleCount * PARTICLE_ALLOCATION.magicHalo);
  const posStart = new Float32Array(count * 3);
  const posEnd = new Float32Array(count * 3);
  const controlPoint = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const random = new Float32Array(count);

  // 螺旋参数
  const treeHeight = 14;
  const treeBottom = -5.5;
  const baseRadius = 7.0;        // 螺旋基础半径
  const spiralTurns = 10;        // 螺旋圈数
  const totalTheta = spiralTurns * Math.PI * 2;

  for (let i = 0; i < count; i++) {
    const t = i / count;  // 0到1的参数
    
    // 螺旋路径
    const theta = t * totalTheta;
    const y = treeBottom + t * treeHeight;
    
    // 半径随高度略微收缩
    const heightRatio = t;
    const radius = baseRadius * (1.0 - heightRatio * 0.3);
    
    // 添加径向噪声
    const radialNoise = (Math.random() - 0.5) * 0.5;
    const r = radius + radialNoise;
    
    // 螺旋位置
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    
    // 轻微垂直抖动
    const yJitter = (Math.random() - 0.5) * 0.3;
    
    posStart[i * 3] = x;
    posStart[i * 3 + 1] = y + yJitter;
    posStart[i * 3 + 2] = z;

    // ... 保持原有的explosion和control point逻辑
    // ... 保持原有的颜色逻辑(增强亮度)
  }

  return { posStart, posEnd, controlPoint, colors: col, random, count };
}, [config.particleCount, config.explosionRadius, themeColors]);
```

### Task 2: 实现着色器上升动画 (可选)
**文件**: `src/shaders/particle.vert`

如果需要动态上升效果,可以在着色器中添加:
```glsl
// 在tree状态下,让y坐标随时间上升并循环
float animatedY = mod(position.y + uTime * 0.5, 14.0) - 5.5;
```

**注意**: 这需要区分magic halo和其他粒子,可能需要添加新的uniform或attribute。

### Task 3: 参数调优
调整以下参数以达到最佳视觉效果:
- `baseRadius`: 螺旋半径 (当前: 7.0)
- `spiralTurns`: 螺旋圈数 (当前: 10)
- `radialNoise`: 径向变化 (当前: 0.5)
- `yJitter`: 垂直抖动 (当前: 0.3)
- 颜色强度: HDR boost值

### Task 4: 移动端测试
- 在小屏幕上验证螺旋完整可见
- 检查性能(FPS应保持稳定)
- 必要时调整螺旋参数

## Technical Notes

### 螺旋数学公式
参数化螺旋线(helix):
- `x = r * cos(θ)`
- `y = c * t` (线性高度)
- `z = r * sin(θ)`

其中:
- `θ = t * 2π * n` (n为圈数)
- `r` 可随高度变化
- `t ∈ [0, 1]`

### 性能考虑
- Magic Halo占20%粒子数 (~4000-6000粒子)
- 螺旋计算简单(三角函数),性能影响minimal
- 如果添加着色器动画,需要确保不影响其他层

## Definition of Done

- [ ] 代码实现完成并通过TypeScript编译
- [ ] 所有AC验证通过
- [ ] 在桌面和移动端测试通过
- [ ] 代码已提交并标记为ready for review
- [ ] 更新了相关文档

## Estimated Effort

**2-3小时** (小型story)
- Task 1: 1小时 (核心实现)
- Task 2: 30分钟 (可选,如需动画)
- Task 3: 30-60分钟 (调优)
- Task 4: 30分钟 (测试)

## Notes

- 这是从2-4-visual-polish推迟的工作
- Crown移除已完成,可以安全实现螺旋逻辑
- 当前magicHalo使用锥形分布,功能正常但不符合设计目标
