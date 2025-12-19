/**
 * Magic Dust Vertex Shader
 * 
 * Creates a spiral particle effect around the Christmas tree.
 * Synchronized with TreeParticles dissipation animation using shared config uniforms.
 * 
 * All animation parameters are received from PARTICLE_CONFIG.dissipation
 * and TREE_SHAPE_CONFIG in treeUtils.ts to ensure synchronization.
 */

// === UNIFORMS ===
uniform float uTime;
uniform float uTreeHeight;
uniform float uTreeBottomY;
uniform float uSpiralTurns;
uniform float uRadiusOffset;
uniform float uProgress; // Animation progress: 0.0 (Tree) -> 1.0 (Exploded)

// Tree shape uniforms (from TREE_SHAPE_CONFIG in treeUtils.ts)
uniform float uMaxRadius;    // Base tree radius at bottom
uniform float uRadiusScale;  // Scale factor for radius tapering
uniform float uMinRadius;    // Minimum radius at the top

// Dissipation animation uniforms (synchronized with TreeParticles)
uniform float uProgressMultiplier;  // Scale factor for uProgress
uniform float uNoiseInfluence;      // Random noise influence on trigger time
uniform float uHeightInfluence;     // Height delay influence (top-down dissipation)
uniform float uUpForce;             // Upward buoyancy force
uniform float uDriftAmplitude;      // Drift/turbulence amplitude
uniform float uGrowPeakProgress;    // Peak progress for size growth
uniform float uGrowAmount;          // Size growth amount
uniform float uShrinkAmount;        // Size shrink amount
uniform float uFadeStart;           // Progress to start fading out
uniform float uFadeEnd;             // Progress to be fully faded
uniform float uSpeedVariation;      // Variance for individual speed

// === ATTRIBUTES ===
attribute float aSpiralT;
attribute float aAscentSpeed;
attribute float aRadiusOffset;
attribute float aAngleOffset;
attribute float aFlickerPhase;
attribute vec3 aColor;
attribute float aSize;
attribute float aErosionFactor; // For dissipation timing
attribute float aRandom;        // For noise

// === VARYINGS ===
varying vec3 vColor;
varying float vAlpha;

/**
 * Calculate tree radius at a given normalized height (0 to 1)
 * Uses uniform parameters from TREE_SHAPE_CONFIG for consistency
 */
float getTreeRadius(float t) {
  // t=0 is top (small radius), t=1 is bottom (large radius)
  return uMaxRadius * t * uRadiusScale + uMinRadius; 
}

void main() {
  // 1. Calculate animation progress
  // Move from 1.0 (bottom) to 0.0 (top)
  float currentT = fract(aSpiralT - aAscentSpeed * uTime * 0.1); 
  
  // 2. Base Spiral Calculation
  float topY = uTreeBottomY + uTreeHeight;
  float yLogic = topY - currentT * uTreeHeight; // linear height
  
  // Angle
  float theta = currentT * 3.14159 * 2.0 * uSpiralTurns;
  
  // Radius
  float radius = getTreeRadius(currentT) + uRadiusOffset + aRadiusOffset;
  
  // 3. Movement & Wobble (Base Tree Animation)
  float wobbleAngle = uTime * 0.5 + aFlickerPhase;
  float wobbleR = sin(wobbleAngle) * 0.1;
  float wobbleY = sin(wobbleAngle * 1.5) * 0.08;
  
  theta += aAngleOffset; // Spread
  radius += wobbleR;
  float finalY = yLogic + wobbleY;
  
  vec3 spiralPos = vec3(
    cos(theta) * radius,
    finalY,
    sin(theta) * radius
  );
  
  // === DISSIPATION ANIMATION (Synced with TreeParticles) ===
  // Uses shared config uniforms for perfect synchronization
  
  // Erosion Threshold
  float erosionNoise = aRandom; 
  float heightDelay = aErosionFactor; 
  
  // Trigger logic matching TreeParticles: (uProgress * multiplier * speed) - offsets
  float individualSpeed = 1.0 + (aRandom - 0.4) * uSpeedVariation;
  float trigger = (uProgress * uProgressMultiplier * individualSpeed) - (erosionNoise * uNoiseInfluence + heightDelay * uHeightInfluence);
  float localProgress = clamp(trigger, 0.0, 1.0);
  float easedProgress = smoothstep(0.0, 1.0, localProgress);
  
  // Movement Physics (Dissipation)
  // Upward force (buoyancy)
  vec3 upForce = vec3(0.0, uUpForce, 0.0) * easedProgress * easedProgress;
  
  // Turbulent Drift
  float timeOffset = uTime * 0.5;
  float noisePhaseX = spiralPos.y * 0.5 + timeOffset + aRandom * 5.0;
  float noisePhaseZ = spiralPos.z * 0.5 + timeOffset * 0.8 + aRandom * 4.0;
  
  vec3 noiseOffset = vec3(
    sin(noisePhaseX),
    0.0,
    cos(noisePhaseZ)
  ) * uDriftAmplitude * easedProgress;
  
  vec3 currentPos = spiralPos;
  
  if (localProgress > 0.0) {
     currentPos += upForce + noiseOffset;
  }
  
  vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  
  // 4. Size & Fade
  float dist = -mvPosition.z;
  
  // Size behavior during explosion (using config uniforms)
  float growPhase = smoothstep(0.0, uGrowPeakProgress, easedProgress);
  float shrinkPhase = smoothstep(uGrowPeakProgress, 1.0, easedProgress);
  float sizeProgress = 1.0 + growPhase * uGrowAmount - shrinkPhase * uShrinkAmount;
  
  gl_PointSize = aSize * (300.0 / dist) * sizeProgress;
  
  // Flicker
  float flickerFreq = 3.0 + mod(aFlickerPhase, 2.0);
  float flicker = 0.8 + sin(uTime * flickerFreq + aFlickerPhase) * 0.2;
  
  // Fade edges (Tree State)
  float fadeIn = min((1.0 - currentT) * 8.0, 1.0);
  float fadeOutBase = (currentT < 0.1) ? currentT * 10.0 : 1.0;
  float baseFade = fadeIn * fadeOutBase;
  
  // Fade out for dissipation (using config uniforms)
  float dissipate = 1.0 - smoothstep(uFadeStart, uFadeEnd, easedProgress);
  
  vColor = aColor * (1.0 + flicker * 0.3); // Brighten on flicker
  vAlpha = baseFade * dissipate;
  
  // Early discard optimization
  if (vAlpha <= 0.01) {
    gl_PointSize = 0.0;
  }
}
