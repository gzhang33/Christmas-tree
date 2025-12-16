# Landing.ts 参数使用情况分析

## ✅ 已使用的参数

### TITLE_CONFIG
- **font**: ✅ 全部使用
  - family, fallback, size.normal, size.compact, loadDelay
- **text**: ✅ 全部使用
  - line1, line2, lineSpacing, line2Indent.normal, line2Indent.compact
- **sampling**: ✅ 全部使用
  - density, canvasWidth.normal, canvasWidth.compact, canvasPadding, canvasHeightMultiplier.normal, canvasHeightMultiplier.compact
- **particle**: ⚠️ 部分使用
  - ✅ sizeMin, sizeMax, sizeMinDraw
  - ❌ glowLayerSizeMultiplier (未使用)
  - ❌ glowLayerAlpha (未使用)
- **effects**: ⚠️ 部分使用
  - ✅ shadowBlur
  - ❌ dropShadow.red (未使用)
  - ❌ dropShadow.green (未使用)
  - ❌ dropShadow.gold (未使用)
- **animation**: ⚠️ 部分使用
  - ✅ breatheAmp1Scale, breatheAmp2Scale, twinkleAmp, twinkleBase
  - ❌ swayAmpScale (未使用)
  - ❌ twinkleFreq (未使用，使用 LANDING_CONFIG.text.twinkleSpeed 代替)
  - ❌ sizeFreq (未使用)
  - ❌ sizeAmp (未使用)
  - ❌ line2DelayOffset (未使用)
  - ❌ line2DelayScale (未使用)
  - ❌ progressScale (未使用)
  - ❌ erosionNoiseWeight (未使用)
  - ❌ heightDelayWeight (未使用)
  - ❌ upwardForce (未使用)
  - ❌ driftAmplitude (未使用)
  - ❌ noiseTimeScale (未使用)
  - ❌ noiseYFreq (未使用)
  - ❌ noiseXFreq (未使用)
  - ❌ noiseXTimeScale (未使用)
  - ❌ noiseDriftYScale (未使用)
  - ❌ fadeStart (未使用)
  - ❌ fadeEnd (未使用)
  - ❌ growPhaseEnd (未使用)
  - ❌ growAmount (未使用)
  - ❌ shrinkAmount (未使用)
- **transition**: ❌ 完全未使用
  - ❌ normalDuration (未使用)
  - ❌ explodedDuration (未使用)

### LANDING_CONFIG
- **title**: ✅ 大部分使用
  - ✅ scale, densityOverride, breakpoints, viewportScale, padding, alignment, verticalOffset
  - ✅ particleGeneration (LandingParticles.tsx 使用)
  - ✅ animation.fadeTransitionDuration, animation.defaultScreenHeight
- **userName**: ✅ 全部使用 (修复后)
  - ✅ fontFamily, fontSizeRatio, canvasWidthMultiplier, canvasHeightMultiplier
  - ✅ yOffset.normal, yOffset.compact
  - ✅ xOffset.normal, xOffset.compact (新添加)
- **entrance**: ✅ 全部使用
  - duration, spreadHeight, delayVariation
- **typewriter**: ✅ 全部使用
  - charDelay
- **text**: ✅ 全部使用
  - breatheAmplitude, twinkleSpeed
- **morphing**: ✅ 全部使用
  - duration

## ❌ 未使用参数汇总

### 高优先级清理建议 (完全冗余)
1. **TITLE_CONFIG.transition** - 整个对象未使用
2. **TITLE_CONFIG.particle.glowLayerSizeMultiplier** - 未实现光晕效果
3. **TITLE_CONFIG.particle.glowLayerAlpha** - 未实现光晕效果
4. **TITLE_CONFIG.effects.dropShadow** - 整个对象未使用

### 中优先级清理建议 (可能预留)
5. **TITLE_CONFIG.animation** 中的消散动画参数 (L121-141)
   - 这些参数在配置文件注释中说明"需匹配 Tree Shader"
   - 但实际在 LandingTitle.tsx 中并未使用
   - 可能是为未来的 shader 动画预留的

### 低优先级 (待确认)
6. **TITLE_CONFIG.animation.swayAmpScale** - 摇摆动画未实现
7. **TITLE_CONFIG.animation.sizeFreq/sizeAmp** - 尺寸脉动未实现
8. **TITLE_CONFIG.animation.line2DelayOffset/line2DelayScale** - 第二行错落感未实现

## 🔧 已修复的问题
1. ✅ 将 `userName.indent` 改为 `userName.xOffset` 并正确应用到渲染中
2. ✅ 用户名现在支持独立的水平偏移 (通过 transform translateX)

## 📝 建议
1. **清理冗余参数**: 删除 transition、dropShadow、glowLayer 相关参数
2. **文档化预留参数**: 为未使用但预留的参数添加 `// TODO:` 注释
3. **考虑分离**: 将 shader 专用参数移到单独的配置对象中
