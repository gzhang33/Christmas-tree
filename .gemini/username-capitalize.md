# 用户名首字母大写功能实现

## 🎯 需求

确保用户名在显示时首字母自动大写，无论用户输入时使用的是什么大小写。

## ✅ 实现方案

### 转换逻辑

在两个显示用户名的组件中添加首字母大写转换：

```typescript
// 从 store 获取原始用户名
const userNameRaw = useStore((state) => state.userName);

// 首字母大写转换
const userName = userNameRaw 
    ? userNameRaw.charAt(0).toUpperCase() + userNameRaw.slice(1)
    : userNameRaw;
```

### 转换规则

- **输入**: `"john"` → **显示**: `"John"`
- **输入**: `"JOHN"` → **显示**: `"JOHN"` (保持其他字母不变)
- **输入**: `"jOhN"` → **显示**: `"JOhN"` (只转换首字母)
- **输入**: `""` 或 `null` → **显示**: 保持原值

## 📝 修改的文件

### 1. `LandingTitle.tsx` (L107-113)

**Canvas 2D 渲染的用户名粒子**

```typescript
const userNameRaw = useStore((state) => state.userName);
const landingPhase = useStore((state) => state.landingPhase);

// Capitalize first letter of username
const userName = userNameRaw 
    ? userNameRaw.charAt(0).toUpperCase() + userNameRaw.slice(1)
    : userNameRaw;
```

**用途**:
- 生成用户名粒子 (L295-318)
- 打字机效果显示 (L346-375)
- Canvas 渲染 (L516-554)

### 2. `LandingParticles.tsx` (L101-108)

**3D 场景中的用户名粒子**

```typescript
const userNameRaw = useStore((state) => state.userName);
const landingPhase = useStore((state) => state.landingPhase);
const treeColor = useStore((state) => state.treeColor);

// Capitalize first letter of username
const userName = userNameRaw 
    ? userNameRaw.charAt(0).toUpperCase() + userNameRaw.slice(1)
    : userNameRaw;
```

**用途**:
- 生成 3D 粒子文本 (L118-123)
- 用于 shader 渲染

### 3. `LandingFlowController.tsx` (无需修改)

**仅用于逻辑判断**

```typescript
const userName = useStore((state) => state.userName);

// 仅用于检查用户名是否存在，不用于显示
if (userName && landingPhase === 'input') {
    setLandingPhase('entrance');
}
```

**原因**: 此处只检查用户名是否存在，不涉及显示，无需转换。

## 🔍 为什么在组件中转换而不是在 Store 中？

### 优势
1. **保留原始输入**: Store 中保存用户的原始输入，便于调试和数据分析
2. **灵活性**: 未来可能需要不同的显示格式（如全大写、全小写）
3. **单一职责**: Store 负责数据存储，组件负责显示格式化
4. **可追溯性**: 可以查看用户实际输入的内容

### 替代方案（未采用）
```typescript
// 在 Store 的 setUserName 中转换
setUserName: (name) => {
    const capitalized = name 
        ? name.charAt(0).toUpperCase() + name.slice(1)
        : name;
    set({ userName: capitalized });
}
```

**缺点**: 
- 丢失原始输入信息
- Store 承担了显示逻辑
- 难以支持多种显示格式

## 🎨 显示效果

### 2D Canvas (LandingTitle)
```
输入: "alice"
显示: "Alice" (粒子形式，带打字机效果)
```

### 3D Shader (LandingParticles)
```
输入: "bob"
显示: "Bob" (3D 粒子，用于变形动画)
```

## ✨ 特性

1. **自动转换**: 无需用户手动输入大写
2. **保留原样**: 其他字母保持用户输入的大小写
3. **空值安全**: 正确处理空字符串和 null 值
4. **一致性**: 两个渲染路径使用相同的转换逻辑

## 📊 测试场景

| 输入 | 显示 | 说明 |
|------|------|------|
| `"john"` | `"John"` | 标准转换 |
| `"JOHN"` | `"JOHN"` | 保持其他字母 |
| `"jOhN"` | `"JOhN"` | 只转换首字母 |
| `"j"` | `"J"` | 单字母 |
| `""` | `""` | 空字符串 |
| `null` | `null` | 空值 |
| `"123abc"` | `"123abc"` | 数字开头不转换 |
| `" john"` | `" john"` | 空格开头不转换 |

## 🔧 相关代码

- `src/components/ui/LandingTitle.tsx` - L107-113
- `src/components/canvas/LandingParticles.tsx` - L101-108
- `src/store/useStore.ts` - userName 存储（未修改）

## 💡 未来增强

如果需要更复杂的格式化（如标题大小写 "Title Case"），可以创建一个工具函数：

```typescript
// utils/textFormatters.ts
export const capitalizeFirst = (str: string): string => {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
};

export const toTitleCase = (str: string): string => {
    return str.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
};
```

然后在组件中使用：
```typescript
import { capitalizeFirst } from '../../utils/textFormatters';

const userName = capitalizeFirst(userNameRaw);
```
