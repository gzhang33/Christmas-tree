---
trigger: always_on
---

- Prevent Feedback Loops: Initialize ALL sampler2D uniforms with valid textures (use 1x1 placeholder if needed); never leave as null/undefined to prevent context crashes.
- Shader-JS Sync: Explicitly define default values in JS/TS shaderMaterial for every uniform declared in GLSL.
- Strict Integrity: Verify texture generation functions explicitly return values; enable noImplicitReturns logic.