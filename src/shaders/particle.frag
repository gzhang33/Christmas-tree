/**
 * Particle Fragment Shader - Glow via Intensity Pattern
 * 
 * This shader renders circular particles with soft edges and implements
 * a "glow via intensity" effect that avoids the issues of additive blending.
 * 
 * Design Decisions:
 * 1. Circular Shape: Uses gl_PointCoord to create perfect circles
 * 2. Soft Edges: smoothstep creates anti-aliased edges
 * 3. Intensity Glow: Boosts color brightness instead of using additive blending
 *    - Additive blending can cause oversaturation and wash out colors
 *    - Intensity boost maintains color fidelity while simulating glow
 * 
 * Color Calculation:
 * finalColor = vColor * uColor * intensity
 * - vColor: Per-particle color (from vertex shader, based on theme)
 * - uColor: Global tree color (from uniform, user-configurable)
 * - intensity: Glow factor (higher when in tree form)
 */

// === UNIFORMS ===
uniform vec3 uColor;      // Global tree color (from user config)
uniform float uProgress;  // Animation progress: 0.0 (tree) -> 1.0 (cloud)

// === VARYINGS (from vertex shader) ===
varying vec3 vColor;      // Per-particle color based on position/theme

void main() {
    // === CIRCULAR PARTICLE SHAPE ===
    // gl_PointCoord: UV coordinates within the point sprite (0,0 to 1,1)
    // Shift to center: (-0.5, -0.5) to (0.5, 0.5)
    vec2 uv = gl_PointCoord.xy - 0.5;
    
    // Calculate distance from center
    float dist = length(uv);
    
    // Discard fragments outside the circle (radius = 0.5)
    // This creates a circular particle instead of square
    if (dist > 0.5) discard;

    // === SOFT EDGE (ANTI-ALIASING) ===
    // smoothstep creates a gradual falloff from 0.4 to 0.5
    // - At dist < 0.4: alpha = 1.0 (fully opaque)
    // - At dist = 0.45: alpha = 0.5 (half transparent)
    // - At dist >= 0.5: alpha = 0.0 (fully transparent, but already discarded)
    float alpha = 1.0 - smoothstep(0.4, 0.5, dist);

    // === GLOW VIA INTENSITY BOOST ===
    // When in tree form (uProgress close to 0), boost intensity to simulate glow
    // 
    // Formula: intensity = 1.0 + (1.0 - uProgress) * 2.0
    // - At uProgress = 0 (tree): intensity = 3.0 (bright glow)
    // - At uProgress = 0.5 (mid): intensity = 2.0
    // - At uProgress = 1 (cloud): intensity = 1.0 (normal brightness)
    //
    // Physics Rationale:
    // - Tree particles should appear as glowing lights (high intensity)
    // - Cloud particles should show actual photo colors (normal intensity)
    // - Gradual transition maintains visual continuity
    float intensity = 1.0 + (1.0 - uProgress) * 2.0; 
    
    // === FINAL COLOR COMPOSITION ===
    // Multiply all color components:
    // - vColor: Theme-based per-particle color (warm/cool tones, etc.)
    // - uColor: User-selected tree color (allows customization)
    // - intensity: Glow factor for visual effect
    vec3 finalColor = vColor * uColor * intensity;

    // Output with calculated alpha for soft edges
    gl_FragColor = vec4(finalColor, alpha);
}
