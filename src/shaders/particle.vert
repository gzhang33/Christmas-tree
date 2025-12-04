/**
 * Particle Vertex Shader - GPU State Machine Interpolation
 * 
 * Uses Quadratic Bezier curve interpolation for smooth explosion animation.
 * Math: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
 * 
 * @source docs/architecture.md#5-novel-pattern-designs
 */

// === UNIFORMS ===
uniform float uProgress;    // Animation progress: 0.0 (Tree) -> 1.0 (Exploded)
uniform float uTime;        // Time for floating noise animation
uniform vec3 uTreeColor;    // Base tree color from theme
uniform float uBaseSize;    // Base particle size multiplier

// === ATTRIBUTES ===
attribute vec3 positionStart;   // Tree shape position (P0)
attribute vec3 positionEnd;     // Final floating position (P2)
attribute vec3 controlPoint;    // Bezier control point (P1 = Start + Explosion Vector)
attribute float aScale;         // Particle scale factor
attribute float aRandom;        // Random seed for variation
attribute float aBranchAngle;   // Branch angle for tree shape animation
attribute vec3 aColor;          // Particle color

// === VARYINGS (passed to fragment shader) ===
varying float vProgress;
varying float vAlpha;
varying vec3 vColor;
varying float vDepth;

/**
 * Quadratic Bezier interpolation
 * B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
 */
vec3 quadraticBezier(vec3 p0, vec3 p1, vec3 p2, float t) {
  float oneMinusT = 1.0 - t;
  return oneMinusT * oneMinusT * p0 
       + 2.0 * oneMinusT * t * p1 
       + t * t * p2;
}

void main() {
  // === BREATHING ANIMATION (Tree State Only) ===
  // Multi-layer breathing effect for organic movement when not exploded
  float breatheFactor = 1.0 - uProgress; // Breathing fades out during explosion
  vec3 normal = normalize(positionStart);
  
  float breathe1 = sin(uTime * 0.6 + positionStart.y * 0.8 + aRandom * 6.28) * 0.04;
  float breathe2 = sin(uTime * 1.2 + aBranchAngle * 2.0 + positionStart.y * 0.3) * 0.03;
  float breathe3 = cos(uTime * 0.4 + aRandom * 3.14) * 0.02;
  
  vec3 breatheOffset = normal * (breathe1 + breathe2 + breathe3) * breatheFactor;
  
  // Subtle swaying motion
  float sway = sin(uTime * 0.5 + positionStart.y * 0.2) * 0.08 * (positionStart.y + 3.0) / 12.0;
  breatheOffset.x += sway * cos(aBranchAngle) * breatheFactor;
  breatheOffset.z += sway * sin(aBranchAngle) * breatheFactor;
  
  // Apply breathing to start position
  vec3 animatedStart = positionStart + breatheOffset;
  
  // === BEZIER INTERPOLATION ===
  // Smooth easing for the progress (ease-out quad)
  float easedProgress = 1.0 - (1.0 - uProgress) * (1.0 - uProgress);
  
  // Calculate Bezier position
  vec3 pos = quadraticBezier(animatedStart, controlPoint, positionEnd, easedProgress);
  
  // === FLOATING NOISE (Exploded State Only) ===
  // Gentle drift animation when in photo cloud state
  float floatFactor = uProgress;
  float driftX = sin(uTime * 0.3 + aRandom * 10.0) * 0.5;
  float driftY = cos(uTime * 0.25 + aRandom * 8.0) * 0.5;
  float driftZ = sin(uTime * 0.35 + aRandom * 12.0) * 0.5;
  
  pos += vec3(driftX, driftY, driftZ) * floatFactor;
  
  // === MVP TRANSFORMATION ===
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  
  // === PARTICLE SIZE ===
  // Depth-based scaling matching original PointsMaterial behavior
  float depthScale = 1.0 + (positionStart.y + 2.5) / 14.0;
  float explosionSizeBoost = 1.0 + uProgress * 0.3; // Slight growth during explosion
  
  // Base size calculation: aScale ranges 0.3-0.9, uBaseSize is the material size (0.45-0.55)
  // Original PointsMaterial used size * sizeAttenuation
  float basePointSize = uBaseSize * aScale * 300.0; // Match PointsMaterial scale
  gl_PointSize = basePointSize * depthScale * explosionSizeBoost / -mvPosition.z;
  
  // Clamp minimum size to avoid invisible particles
  gl_PointSize = max(gl_PointSize, 1.0);
  
  // === OUTPUT TO FRAGMENT SHADER ===
  vProgress = uProgress;
  // Higher alpha for better visibility, matching original opacity settings
  vAlpha = 0.95 * (0.85 + aScale * 0.15);
  vColor = aColor;
  vDepth = -mvPosition.z;
}
