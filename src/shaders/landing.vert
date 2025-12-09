/**
 * Landing Particles Vertex Shader
 * 
 * GPU-driven animation for the landing page particle flow.
 * Supports four animation phases:
 * - Phase 0 (entrance): Particles fall from above to form text
 * - Phase 1 (text): Static text with breathing animation
 * - Phase 2 (morphing): Text morphs into tree shape
 * - Phase 3 (complete): Tree shape
 */
// Uniforms
uniform float uTime;
uniform float uEntranceProgress;  // 0.0 -> 1.0 for entrance animation
uniform float uMorphProgress;     // 0.0 -> 1.0 for morphing animation
uniform int uPhase;               // Current animation phase
uniform float uBaseSize;
uniform vec3 uColor;

// Attributes
attribute vec3 positionEntrance;  // Start position (above screen)
attribute vec3 positionText;      // Text form position
attribute vec3 positionTree;      // Tree form position
attribute float aRandom;          // Random seed per particle
attribute float aSize;            // Size multiplier
attribute float aVisibility;      // 1.0 = visible, 0.0 = hidden

// Varyings
varying float vAlpha;
varying vec3 vColor;

// Easing function
float easeOutCubic(float x) {
    return 1.0 - pow(1.0 - x, 3.0);
}

float easeInOutCubic(float x) {
    return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
}

void main() {
    vec3 pos;
    float alpha = aVisibility;
    
    if (uPhase == 0) {
        // === ENTRANCE PHASE ===
        // Particles fall from above to form text
        
        // Add per-particle delay based on random seed
        float particleDelay = aRandom * 0.3;
        float adjustedProgress = clamp((uEntranceProgress - particleDelay) / (1.0 - particleDelay), 0.0, 1.0);
        float easedProgress = easeOutCubic(adjustedProgress);
        
        // Interpolate from entrance position to text position
        pos = mix(positionEntrance, positionText, easedProgress);
        
        // Add slight wobble during fall
        float wobble = sin(uTime * 3.0 + aRandom * 10.0) * (1.0 - easedProgress) * 0.5;
        pos.x += wobble;
        
        // Fade in as particles arrive
        alpha *= smoothstep(0.0, 0.3, adjustedProgress);
    }
    else if (uPhase == 1) {
    else if (uPhase == 1) {
        // === TEXT PHASE ===
        // Static text with subtle breathing animation
        pos = positionText;
        
        // Breathing animation
        float breathe = sin(uTime * 1.5 + pos.y * 0.5) * 0.03;
        if (length(pos.xz) > 0.01) {
            pos += normalize(vec3(pos.x, 0.0, pos.z)) * breathe;
        }
        
        // Twinkle effect
        float twinkle = 0.85 + 0.15 * sin(uTime * 3.0 + aRandom * 10.0);
        alpha *= twinkle;
    }        // === MORPHING PHASE ===
        // Text morphs into tree shape with chaos in the middle
        
        // Calculate chaos factor (peaks at 0.5 progress)
        float chaosFactor = sin(uMorphProgress * 3.14159) * 3.0;
        
        // Random chaos offset
        vec3 chaosOffset = vec3(
            sin(aRandom * 10.0 + uTime * 2.0),
            cos(aRandom * 8.0 + uTime * 1.5),
            sin(aRandom * 6.0 + uTime * 1.8)
        ) * chaosFactor;
        
        // Interpolate between text and tree positions
        pos = mix(positionText, positionTree, uMorphProgress);
        
        // Add chaos
        pos += chaosOffset;
        
        // Particles that were hidden (padding) fade in during morphing
        if (aVisibility < 0.5) {
            alpha = smoothstep(0.3, 0.7, uMorphProgress);
        }
    }
    else {
        // === COMPLETE PHASE ===
        // Final tree position with breathing
        pos = positionTree;
        
        // Tree breathing animation (matches TreeParticles.tsx)
        float breathe = sin(uTime * 0.6 + pos.y * 0.1) * 0.15;
        if (length(pos.xz) > 0.01) {
            pos += normalize(vec3(pos.x, 0.0, pos.z)) * breathe;
        }
        
        // Sway
        float sway = sin(uTime * 0.5 + pos.y * 0.15) * 0.15 * smoothstep(-5.0, 20.0, pos.y);
        pos.x += sway;
        
        alpha = 1.0;
    }
    
    // Transform to clip space
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Calculate point size with depth attenuation
    float sizeScale = 300.0 * aSize * uBaseSize;
    gl_PointSize = sizeScale / -mvPosition.z;
    gl_PointSize = max(gl_PointSize, 1.0);
    
    // Pass to fragment shader
    vAlpha = alpha;
    vColor = uColor; // Use uniform color
}}