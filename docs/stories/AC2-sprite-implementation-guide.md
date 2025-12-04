# AC #2 实施指南：Sprite渲染系统

## 📋 实施摘要

已完成shader修改，现在需要更新TreeParticles.tsx以集成sprite系统。

## ✅ 已完成的修改

### 1. Shader文件
- ✅ `particle.frag`: 添加sprite atlas支持和双纹理系统
- ✅ `particle.vert`: 添加aType和aSpriteUvOffset属性

### 2. 配置和工具文件
- ✅ `src/config/sprites.ts`: Sprite资源配置和fallback生成
- ✅ `src/utils/spriteAtlas.ts`: Sprite atlas加载工具

## 🔧 待完成的修改

### TreeParticles.tsx需要的更改：

#### 1. 导入sprite工具
```typescript
// 在文件顶部添加
import { createSpriteAtlas, getSpriteUVOffset, SpriteAtlasResult } from '../../utils/spriteAtlas';
```

#### 2. 更新shader material uniforms
在ExplosionMaterial定义中添加：
```typescript
{
  uTime: 0,
  uProgress: 0,
  uColor: new THREE.Color(),
  uTextureAtlas: null,
  uAtlasGrid: new THREE.Vector2(1, 1),
  uSpriteAtlas: null,        // 新增
  uSpriteGrid: new THREE.Vector2(1, 1),  // 新增
  uOpacityScale: 1.0,
}
```

#### 3. 添加sprite atlas状态
在组件中添加：
```typescript
const [spriteAtlas, setSpriteAtlas] = useState<SpriteAtlasResult | null>(null);

useEffect(() => {
  const loadSprites = async () => {
    const result = await createSpriteAtlas();
    setSpriteAtlas(result);
  };
  loadSprites();
}, []);
```

#### 4. 为每个粒子层添加type和spriteUvOffset属性

**Entity Layer** (entityLayerData):
```typescript
const type = new Float32Array(count);
const spriteUvOffset = new Float32Array(count * 2);
type.fill(0.0);  // Normal particles
spriteUvOffset.fill(0.0);  // Not used for normal particles
```

**Glow Layer** (glowLayerData):
```typescript
const type = new Float32Array(count);
const spriteUvOffset = new Float32Array(count * 2);
type.fill(0.0);  // Normal particles
spriteUvOffset.fill(0.0);
```

**Ornaments** (ornamentData):
```typescript
const type = new Float32Array(count);
const spriteUvOffset = new Float32Array(count * 2);

// 在生成循环中：
type[idx] = 2.0;  // Ornament type

// 根据ornament类型选择sprite
let spriteKey = 'ornament-ball';  // 默认
if (cluster.type === 'FLAG') spriteKey = 'ornament-uk-flag';
else if (cluster.type === 'BUS') spriteKey = 'ornament-bus';
else if (cluster.type === 'CORGI') spriteKey = 'ornament-corgi';

if (spriteAtlas) {
  const [uvX, uvY] = getSpriteUVOffset(
    spriteAtlas.mapping,
    spriteKey,
    spriteAtlas.cols,
    spriteAtlas.rows
  );
  spriteUvOffset[idx * 2] = uvX;
  spriteUvOffset[idx * 2 + 1] = uvY;
}
```

**Gifts** (giftData):
```typescript
const type = new Float32Array(count);
const spriteUvOffset = new Float32Array(count * 2);

// 在生成循环中：
type[idx] = 1.0;  // Gift type

if (spriteAtlas) {
  const [uvX, uvY] = getSpriteUVOffset(
    spriteAtlas.mapping,
    'gift',
    spriteAtlas.cols,
    spriteAtlas.rows
  );
  spriteUvOffset[idx * 2] = uvX;
  spriteUvOffset[idx * 2 + 1] = uvY;
}
```

#### 5. 在return语句中添加buffer attributes

为每个`<points>`添加：
```tsx
<bufferAttribute attach="attributes-aType" count={data.count} array={data.type} itemSize={1} />
<bufferAttribute attach="attributes-aSpriteUvOffset" count={data.count} array={data.spriteUvOffset} itemSize={2} />
```

#### 6. 更新material uniforms

在useFrame中更新：
```typescript
mat.uniforms.uSpriteAtlas.value = spriteAtlas?.texture || null;
mat.uniforms.uSpriteGrid.value = spriteAtlas 
  ? new THREE.Vector2(spriteAtlas.cols, spriteAtlas.rows) 
  : new THREE.Vector2(1, 1);
```

## 🎨 Sprite资源准备

### 临时方案（当前）
代码会自动使用fallback sprites（代码生成的简单图形）

### 最终方案（推荐）
从以下网站下载并替换sprites：

1. **OpenGameArt.org** - 搜索 "christmas ornament", "gift box"
2. **Kenney.nl** - 下载 "Holiday Pack"
3. **Flaticon.com** - 搜索 "christmas", "gift"

将PNG文件放入 `public/sprites/` 文件夹：
- gift-box.png
- ornament-ball.png
- ornament-uk-flag.png
- ornament-bus.png
- ornament-corgi.png

## 🧪 测试验证

完成后验证：
1. ✅ Tree状态下，gifts显示为礼物盒sprite
2. ✅ Tree状态下，ornaments显示为装饰球sprite
3. ✅ Cloud状态下，所有粒子过渡到照片
4. ✅ 性能保持稳定（>30fps）

## 📝 下一步

由于TreeParticles.tsx的修改量较大（需要修改4个数据生成函数和JSX部分），建议：

**选项1**: 我可以生成完整的修改后的TreeParticles.tsx文件
**选项2**: 我可以逐步指导您手动修改
**选项3**: 我可以创建一个git patch文件供您应用

请告诉我您希望采用哪种方式？
