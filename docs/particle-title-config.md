# ParticleTitle 配置说明

## 配置文件位置
`src/config/particleTitle.ts`

## 重要说明

**动画参数同步**：标题的呼吸、摇摆等基础动画频率直接引用 `PARTICLE_CONFIG.animation`，确保与圣诞树主体的动画完全同步。配置文件中只定义标题特有的参数（如缩放系数、闪烁效果等）。

## 配置结构

### 1. 颜色配置 (`TITLE_COLORS`)
圣诞主题颜色数组，仅包含红、绿、金、白四种颜色：
- Cardinal Red (`#C41E3A`)
- Crimson Red (`#DC143C`)
- Forest Green (`#228B22`)
- Dark Green (`#006400`)
- Gold (`#FFD700`)
- White (`#FFFFFF`)

### 2. 字体配置 (`TITLE_CONFIG.font`)
```typescript
font: {
    family: string,           // 字体族，支持 fallback
    size: {
        compact: number,      // 紧凑模式字号
        normal: number,       // 正常模式字号
    }
}
```

### 3. 文本配置 (`TITLE_CONFIG.text`)
```typescript
text: {
    line1: string,            // 第一行文本 ("Merry")
    line2: string,            // 第二行文本 ("Christmas")
    line2Indent: {
        compact: number,      // 紧凑模式第二行缩进
        normal: number,       // 正常模式第二行缩进
    },
    lineSpacing: number,      // 行间距倍数
}
```

### 4. 采样配置 (`TITLE_CONFIG.sampling`)
```typescript
sampling: {
    density: number,          // 像素采样密度 (1 = 每像素, 2 = 每2像素)
    canvasWidth: {
        compact: number,      // 紧凑模式画布宽度
        normal: number,       // 正常模式画布宽度
    },
    canvasPadding: number,    // 画布高度填充倍数
    canvasHeightMultiplier: number,  // 总画布高度 = fontSize * 此值
}
```

### 5. 粒子属性 (`TITLE_CONFIG.particle`)
```typescript
particle: {
    sizeMin: number,          // 粒子最小尺寸
    sizeMax: number,          // 粒子最大尺寸
    sizeMinDraw: number,      // 绘制时最小尺寸
    glowLayerSizeMultiplier: number,  // 背景发光层尺寸倍数
    glowLayerAlpha: number,   // 背景发光层透明度
}
```

### 6. 动画参数 (`TITLE_CONFIG.animation`)

#### 呼吸/闪烁动画（静止状态）
```typescript
breatheFreq1: number,         // 呼吸频率1
breatheFreq2: number,         // 呼吸频率2
breatheAmp1Scale: number,     // 呼吸幅度1缩放（2D画布）
breatheAmp2Scale: number,     // 呼吸幅度2缩放（2D画布）
swayFreq: number,             // 摇摆频率
swayAmpScale: number,         // 摇摆幅度缩放
twinkleFreq: number,          // 闪烁频率
twinkleAmp: number,           // 闪烁幅度
twinkleBase: number,          // 闪烁基准值
sizeFreq: number,             // 尺寸脉冲频率
sizeAmp: number,              // 尺寸脉冲幅度
```

#### 消散动画（爆炸状态）
```typescript
upwardForce: number,          // 向上力度
driftAmplitude: number,       // 漂移幅度
progressScale: number,        // 进度缩放（匹配shader）
erosionNoiseWeight: number,   // 侵蚀噪声权重
heightDelayWeight: number,    // 高度延迟权重
line2DelayOffset: number,     // 第二行延迟偏移
line2DelayScale: number,      // 第二行延迟缩放
fadeStart: number,            // 淡出开始点 (0-1)
fadeEnd: number,              // 淡出结束点 (0-1)
growPhaseEnd: number,         // 增长阶段结束点
growAmount: number,           // 增长量
shrinkAmount: number,         // 收缩量
noiseTimeScale: number,       // 噪声时间缩放
noiseYFreq: number,           // Y轴噪声频率
noiseXFreq: number,           // X轴噪声频率
noiseXTimeScale: number,      // X轴噪声时间缩放
noiseDriftYScale: number,     // Y轴漂移缩放
```

### 7. 视觉效果 (`TITLE_CONFIG.effects`)
```typescript
effects: {
    shadowBlur: number,       // 阴影模糊半径
    dropShadow: {
        red: {
            blur: number,     // 红色阴影模糊
            color: string,    // 红色阴影颜色
        },
        green: { ... },       // 绿色阴影
        gold: { ... },        // 金色阴影
    }
}
```

### 8. 定位 (`TITLE_CONFIG.position`)
```typescript
position: {
    top: string,              // CSS top 值
    left: string,             // CSS left 值
}
```

### 9. 过渡 (`TITLE_CONFIG.transition`)
```typescript
transition: {
    explodedDuration: number, // 爆炸状态过渡时长
    normalDuration: number,   // 正常状态过渡时长
}
```

## 使用示例

### 修改字体大小
```typescript
// 在 src/config/particleTitle.ts 中
font: {
    size: {
        compact: 80,  // 从 70 改为 80
        normal: 100,  // 从 90 改为 100
    }
}
```

### 修改粒子数量
通过调整 `sampling.density` 来控制粒子密度：
```typescript
sampling: {
    density: 2,  // 值越大，粒子越少（每N个像素采样一次）
}
```

### 修改颜色
在 `TITLE_COLORS` 数组中添加或替换颜色：
```typescript
export const TITLE_COLORS = [
    '#C41E3A',  // 可以替换为其他颜色
    // ... 添加更多颜色
] as const;
```

### 调整动画速度
```typescript
animation: {
    breatheFreq1: 0.8,  // 增加频率 = 更快的呼吸
    upwardForce: 250,   // 增加力度 = 更快的上升
}
```

## 注意事项

1. **粒子数量**：由 `sampling.density` 控制，值越小粒子越多，性能消耗越大
2. **动画同步**：部分参数（如 `breatheFreq1/2`）引用自 `PARTICLE_CONFIG`，确保与树的动画同步
3. **颜色一致性**：仅使用圣诞主题颜色（红、绿、金、白）
4. **尺寸计算**：画布尺寸和粒子尺寸相互关联，修改时需保持比例协调
