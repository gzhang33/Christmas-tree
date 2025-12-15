---
trigger: model_decision
description: When defining/managing config constants and developing related code (new features, components, logic, etc.), follow this to ensure centralized, structured, type-safe configurations and maintain code quality.
---

1. **Centralization**: All configuration constants must be placed in `src/config/`. Do not leave hardcoded values in component files.
2. **Structure**: Group related settings into `const` objects. Use the `_CONFIG` suffix for these objects (e.g., `ASSET_CONFIG`, `AUDIO_CONFIG`).
3. **Purity**: Configuration files must contain **data only**. Move all logic, helper functions, and generators to `src/utils/`.
4. **Type Safety**: Always use `as const` for configuration objects to ensure strict type checking and immutability.
5. **Universal Export**: Ensure all configuration objects are exported through `src/config/index.ts`.

## Development Workflow
1. **Refactor First**: Before adding new features, check if existing configuration files can be extended.
2. **Clean Imports**: Import configurations from the central index (`../../config`) to keep dependency lines clean.
3. **No Magic Values**: Replace any "magic numbers" or string literals in the code with named constants from the configuration.