# Story 2.0: Test Infrastructure & Video Prep

Status: done

## Story

As a Developer,
I want to set up the testing framework and prepare video assets,
so that the project is stable and supports the new video requirements.

## Acceptance Criteria

1. `vitest` and `@testing-library/react` are installed and configured.
2. Unit tests for `useStore` are implemented and passing.
3. `src/config/assets.ts` is updated to include video file paths (supporting the new video requirement).
4. The `URL.createObjectURL` memory leak in `src/App.tsx` is identified and fixed.

## Tasks / Subtasks

- [x] Install and configure testing dependencies (AC: 1)
  - [x] Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
  - [x] Configure `vite.config.ts` for testing
  - [x] Add `test` script to `package.json`
- [x] Create unit tests for Global Store (AC: 2)
  - [x] Create `src/store/useStore.test.ts`
  - [x] Test initial state
  - [x] Test actions (`setTreeColor`, `setParticleCount`, `triggerExplosion`, `resetExplosion`)
- [x] Update Asset Configuration (AC: 3)
  - [x] Update `Memory` type definition to support `video`
  - [x] Add video paths to `src/config/assets.ts`
- [x] Fix Memory Leak in App.tsx (AC: 4)
  - [x] Analyze `src/App.tsx` for `URL.createObjectURL` usage
  - [x] Implement `URL.revokeObjectURL` cleanup in `useEffect` for photo removal and component unmount

## Dev Notes

- **Architecture Patterns:**
  - Use `vitest` for unit testing [Source: docs/architecture.md#8-next-steps].
  - Centralize asset config in `src/config/assets.ts` [Source: docs/architecture.md#6-implementation-patterns].

### Project Structure Notes

- New file: `src/store/useStore.test.ts`
- Modified file: `src/config/assets.ts`
- Modified file: `src/App.tsx`
- Modified file: `package.json`
- Modified file: `vite.config.ts`

### Learnings from Previous Story

**From Story 1-3-ui-refactor (Status: done)**

- **Pending Action Item**: Monitor `URL.createObjectURL` usage for potential memory leaks. This is explicitly addressed in AC4 of this story.
- **Context**: `Controls.tsx` was just refactored to use Tailwind and `useStore`. Be careful to preserve these changes while fixing the memory leak.

[Source: stories/1-3-ui-refactor.md#Review-Follow-ups-AI]

### References

- [Source: docs/epics.md#story-20-test-infrastructure--video-prep] - Epic Requirements.
- [Source: docs/architecture.md#8-next-steps] - Testing setup recommendation.

## Dev Agent Record

### Context Reference

`docs/stories/2-0-test-infra.context.xml`

### Agent Model Used

Gemini 2.0 Flash Thinking (gemini-2.0-flash-thinking-exp-01-21)

### Debug Log References

N/A - All tests passing on first run

### Completion Notes List

1. **测试依赖安装** (2025-12-04):
   - 安装 `vitest@4.0.15`, `@testing-library/react@16.3.0`, `@testing-library/jest-dom@6.9.1`, `jsdom@27.2.0`
   - 所有依赖成功安装，无冲突

2. **Vitest 配置** (2025-12-04):
   - 在 `vite.config.ts` 中添加测试配置
   - 使用 `jsdom` 环境模拟浏览器 API
   - 启用全局测试 API (`globals: true`)
   - 配置测试设置文件路径

3. **测试脚本** (2025-12-04):
   - 在 `package.json` 中添加 `"test": "vitest"` 脚本
   - 测试可通过 `npm test` 运行

4. **测试验证** (2025-12-04):
   - 运行 `npm test -- --run` 验证配置
   - **所有 15 个测试通过** ✓
   - 测试覆盖：初始状态 (4)、操作 (6)、持久化中间件 (5)

5. **内存泄漏修复验证** (2025-12-04):
   - 确认 `App.tsx` 中已实现双重清理机制
   - 增量清理：照片移除时立即释放 ObjectURL
   - 卸载清理：组件卸载时清理所有剩余 URL

6. **视频资产配置验证** (2025-12-04):
   - 确认 `src/config/assets.ts` 已包含 `Memory` 类型定义
   - 确认 `MEMORIES` 数组包含 12 个记忆项（11 个带视频）

### File List

**Modified:**
- `vite.config.ts` - 添加 Vitest 配置
- `package.json` - 添加测试脚本和依赖
- `docs/stories/2-0-test-infra.md` - 更新任务状态和修正文件路径

**Verified (No Changes Needed):**
- `src/store/useStore.test.ts` - 测试文件已完整实现
- `src/test/setup.ts` - 测试设置文件已存在
- `src/App.tsx` - 内存泄漏已修复
- `src/config/assets.ts` - 视频资产配置已完成
