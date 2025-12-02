# Story 2.1: Theme & Asset Configuration

Status: done

## Story

As a Developer,
I want to centralize theme and asset configuration,
so that the application uses the correct "Midnight Magic" colors and textures.

## Acceptance Criteria

1. `src/config` directory is created and populated.
2. `src/config/theme.ts` exports "Midnight Magic" palette constants matching UX Spec.
3. `src/config/assets.ts` defines paths for particle textures and photo placeholders.
4. `TreeParticles` component is updated to consume color values from `useStore` (initialized from config) instead of hardcoded values.

## Tasks / Subtasks

- [x] Create `src/config` directory and files (AC: 1, 2, 3)
  - [x] Implement `theme.ts` with Midnight Magic hex codes
  - [x] Implement `assets.ts` with asset paths
- [x] Update `useStore` to use config defaults (AC: 4)
  - [x] Import theme constants in `useStore.ts`
- [x] Refactor `TreeParticles.tsx` (AC: 4)
  - [x] Replace hardcoded colors with `useStore` selector
  - [x] Verify particles render with new theme colors
- [x] Verify Build and Lint
  - [x] Run type check

## Dev Notes

- **Architecture Patterns:**
  - Use `src/config` for static constants [Source: docs/architecture.md#4-project-structure].
  - `TreeParticles` should read from store, not config directly, to allow dynamic theme switching [Source: docs/architecture.md#6-implementation-patterns].

### Project Structure Notes

- New directory: `src/config`
- New files: `theme.ts`, `assets.ts`
- Target component: `src/components/canvas/TreeParticles.tsx`

### Learnings from Previous Story

**From Story 1-3-ui-refactor (Status: done)**

- **Integration**: `Controls.tsx` is already using `useStore` for theme selection.
- **Context**: `useStore` is the central state of truth. `TreeParticles` must align with it.
- **Assets**: Ensure asset paths in `assets.ts` match actual file locations in `public/`.

[Source: stories/1-3-ui-refactor.md#Dev-Agent-Record]

### References

- [Source: docs/epics.md#story-21-theme--asset-configuration] - Epic Requirements
- [Source: docs/ux-design-specification.md#31-color-system] - Midnight Magic Palette
- [Source: docs/architecture.md#6-implementation-patterns] - Asset Management

## Dev Agent Record

### Context Reference

- [Context File](2-1-theme-config.context.xml)

### Agent Model Used

Gemini 2.0 Flash

### Debug Log References

**Implementation Plan:**
1. Created `src/config/theme.ts` with MIDNIGHT_MAGIC_PALETTE and THEMES definitions
2. Created `src/config/assets.ts` with asset path constants
3. Updated `useStore.ts` to import and use DEFAULT_THEME and PARTICLE_CONFIG
4. Refactored `TreeParticles.tsx` to:
   - Import useStore and THEMES
   - Create getThemeColors() function for dynamic color mapping
   - Replace hardcoded COLORS object with theme-aware color getter
   - Add COLORS to useMemo dependencies for reactivity
5. Fixed DebugStore.tsx theme toggle to use 'pink' instead of 'daylight'
6. Verified type checking passes with `npx tsc --noEmit`

**Theme Switching Fix (2025-12-01 22:30):**

**问题诊断：**
1. Debug 面板切换 Theme 时，粒子位置重新生成（不应该）
   - 原因：COLORS 对象在 useMemo 依赖中，导致粒子位置数据重新计算
2. Controls 面板的 Tree Color 选择器无效
   - 原因：使用旧的 `config.treeColor`，而 TreeParticles 已改用 `theme`

**解决方案：**
1. **统一主题系统**：
   - 移除 Controls 中的旧颜色选择器（TREE_COLORS 数组）
   - 添加新的主题选择器（Midnight / Pink 按钮）
   - 直接调用 `setTheme()` 而不是 `updateConfig('treeColor')`

2. **优化渲染性能**：
   - 从所有粒子层的 useMemo 依赖中移除 COLORS
   - 添加 `useEffect` 监听 theme 变化，动态更新现有粒子的颜色
   - 粒子位置仅在 particleCount/explosionRadius 改变时重新生成

3. **实现细节**：
   - Entity Layer: 根据粒子位置重新计算颜色
   - Glow Layer: 根据索引重新分配发光颜色
   - Gifts Layer: 重新映射礼物盒颜色
   - Ornaments/Crown: 保持原色（金属色，不受主题影响）

**Key Technical Decisions:**
- Used `useMemo` to compute theme colors based on store theme value
- Maintained backward compatibility with 'pink' theme
- Added COLORS to all particle layer dependencies to ensure re-render on theme change
- Preserved all existing particle effects and British theme ornaments
- **NEW**: Separated color updates from position generation for better performance
- **NEW**: Implemented reactive color system using useEffect instead of useMemo deps

**Pure Color Mode Implementation (2025-12-02 01:20):**

**需求分析：**
1. 粒子颜色不统一 → 需要纯色模式
2. 装饰物和礼物盒保持多色 → 选择性应用纯色
3. 需要调色盘功能 → 添加 custom 主题支持

**实现方案：**

1. **配置层 (theme.ts)**:
   ```typescript
   export const THEMES = {
     midnight: { pureColor: '#D53F8C', ... },
     pink: { pureColor: '#FFC0CB', ... },
     custom: { pureColor: '#FFC0CB', ... }  // 新增
   }
   ```

2. **状态层 (useStore.ts)**:
   ```typescript
   interface AppState {
     customColor: string;  // 新增
     setCustomColor: (color: string) => void;
   }
   ```

3. **渲染层 (TreeParticles.tsx)**:
   - Entity Layer: `const c = COLORS.pure` (纯色)
   - Glow Layer: `const c = COLORS.pure` + HDR (纯色+强度)
   - Ornaments: 保持原有金属色（gold, silver, ukRed, ukBlue）
   - Gifts: 保持原有色带设计（primary, secondary, white, gold）

4. **UI层 (Controls.tsx)**:
   - Midnight 主题按钮（3个颜色点预览）
   - Pink 主题按钮（3个颜色点预览）
   - Custom 调色盘（颜色圆圈 + "Custom" 标签）
   - 所有按钮同一行，统一样式

**效果对比：**
- 修改前：粒子有 tip/inner/middle 三种颜色渐变
- 修改后：所有粒子使用单一主题色，视觉统一
- 装饰物：保持多色（符合要求）

### Completion Notes List

✅ **AC1**: `src/config` directory created with `theme.ts` and `assets.ts`
✅ **AC2**: `theme.ts` exports MIDNIGHT_MAGIC_PALETTE with exact hex codes from UX Spec (#D53F8C, #805AD5, #38B2AC, etc.)
✅ **AC3**: `assets.ts` defines TEXTURES, PHOTOS, and AUDIO path constants
✅ **AC4**: `TreeParticles` now consumes colors from `useStore` via getThemeColors() function, enabling dynamic theme switching

**Theme System Architecture:**
- Config layer (`theme.ts`) defines static palette constants
- Store layer (`useStore.ts`) manages active theme selection
- Component layer (`TreeParticles.tsx`) reads from store and maps to THREE.Color instances
- This separation enables runtime theme switching while maintaining type safety

### File List

- `src/config/theme.ts` (new)
- `src/config/assets.ts` (new)
- `src/store/useStore.ts` (modified)
- `src/components/canvas/TreeParticles.tsx` (modified - added useEffect for theme color updates)
- `src/components/DebugStore.tsx` (modified - fixed theme toggle)
- `src/components/ui/Controls.tsx` (modified - replaced Tree Color with Theme selector)

### Completion Notes
**Completed:** 2025-12-02
**Definition of Done:** All acceptance criteria met, code reviewed, tests passing

## Change Log

- 2025-12-01: Story drafted based on Epic 2 requirements.
- 2025-12-01: Implementation completed - Theme configuration centralized, TreeParticles refactored to use store-based colors.
- 2025-12-01 22:30: Fixed theme switching issues - unified theme system in Controls, optimized color updates to avoid position regeneration.
- 2025-12-02 01:00: Refactored to pure color mode - particle layers now use single theme color, preserved ornament/gift multi-color design. Added custom color picker support.
- 2025-12-02 01:20: **COMPLETED** - Restored and updated Controls.tsx with theme selector and color picker. All features implemented and type-checked successfully.

## Code Review

**Reviewer:** Senior Developer Agent
**Date:** 2025-12-02
**Status:** Passed

### Summary
The implementation successfully centralizes the theme and asset configuration as requested. The refactoring of `TreeParticles` to use the global store for theme management is well-executed, with appropriate performance optimizations.

### Strengths
1.  **Performance Optimization:** The use of `useEffect` in `TreeParticles.tsx` to update geometry colors directly (instead of regenerating the entire particle system via `useMemo` dependencies) is a excellent choice. It prevents expensive re-calculations of particle positions when switching themes.
2.  **Clean Configuration:** `theme.ts` and `assets.ts` provide a clear, type-safe source of truth for the application's design system and resources.
3.  **Backward Compatibility:** The implementation maintains support for existing features (British theme elements) while introducing the new "Midnight Magic" system.
4.  **Type Safety:** The use of TypeScript interfaces and `as const` assertions in config files ensures type safety across the application.

### Suggestions for Future Refactoring
1.  **Component Size:** `TreeParticles.tsx` is becoming quite large (>900 lines). Consider breaking it down into smaller sub-components (e.g., `EntityLayer`, `GlowLayer`, `OrnamentLayer`) or custom hooks (`useParticleLayer`) in a future refactor to improve maintainability.
2.  **Magic Numbers:** There are still some magic numbers in the particle generation logic (e.g., `treeHeight = 14`, `count * 1.5`). Moving these to a `particle-config.ts` or similar would further improve maintainability.

### Conclusion
The story meets all acceptance criteria and adheres to the architecture guidelines. The code is ready for production.
