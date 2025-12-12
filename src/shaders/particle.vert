/**
 * Particle Vertex Shader - GPU State Machine Interpolation
 *
 * Uses Quadratic Bezier curve interpolation for smooth explosion animation.
 * Math: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
 *
 * Extended with:
 * - Photo particle support (isPhotoParticle attribute)
 * - Fade-out for non-photo particles during explosion
 * - Synchronized dissipation animation via config uniforms
 *
 * All dissipation animation parameters are received from PARTICLE_CONFIG.dissipation
 * to ensure perfect synchronization with MagicDust particles.
 *
 * @source docs/architecture.md#5-novel-pattern-designs
 */

// === UNIFORMS ===
uniform float uProgress;    // Animation progress: 0.0 (Tree) -> 1.0 (Exploded)
uniform float uTime;        // Time for floating noise animation
uniform vec3 uTreeColor;    // Base tree color from theme
uniform float uBaseSize;    // Base particle size multiplier

// Animation uniforms (breathing and sway)
uniform float uBreatheFreq1; 
uniform float uBreatheFreq2;
uniform float uBreatheFreq3;
uniform float uBreatheAmp1;
uniform float uBreatheAmp2;
uniform float uBreatheAmp3;
uniform float uSwayFreq;
uniform float uSwayAmp;

// === DUAL-LAYER PARTICLE SYSTEM (双层粒子系统) ===
// When uDissipateOnly is true, core layer particles stay in place while
// dissipation layer particles float away. This creates a "smoke" effect
// where the tree remains visible but appears to emit particles.
uniform float uDissipateOnly;    // 0.0 = normal mode, 1.0 = tree stays visible
uniform float uCoreLayerRatio;   // Ratio of particles that form the core layer (0-1)
uniform float uIsEntrance;       // 1.0 = entrance animation, 0.0 = explosion/normal

// Dissipation animation uniforms (synchronized with MagicDust)
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

// === ATTRIBUTES ===
attribute vec3 positionStart;   // Tree shape position (P0)
attribute vec3 positionEnd;     // Final floating position (P2)
attribute vec3 controlPoint;    // Bezier control point (P1 = Start + Explosion Vector)
attribute float aScale;         // Particle scale factor
attribute float aRandom;        // Random seed for variation
attribute float aBranchAngle;   // Branch angle for tree shape animation
attribute vec3 aColor;          // Particle color
attribute float aIsPhotoParticle; // 1.0 = photo particle, 0.0 = regular particle
attribute float aErosionFactor;   // Pre-computed erosion delay (0.0 to 1.0)

// === VARYINGS (passed to fragment shader) ===
varying float vProgress;
varying float vAlpha;
varying vec3 vColor;
varying float vDepth;
varying float vIsPhotoParticle;
varying float vFlash;

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

float easeOutCubic(float x) {
  return 1.0 - pow(1.0 - x, 3.0);
}

void main() {
  // === DUAL-LAYER PARTICLE SYSTEM (双层粒子系统) ===
  // Determine if this particle belongs to the core layer (stays in place)
  // or the dissipation layer (floats away during explosion)
  // Core layer is determined by aRandom < uCoreLayerRatio when uDissipateOnly is active
  //
  // IMPORTANT: Core layer behavior differs based on animation phase:
  // - Entrance phase (uIsEntrance > 0.5): Core layer participates normally in the implode animation
  // - Explosion phase (uIsEntrance <= 0.5): Core layer stays in place
  //
  // uIsEntrance is set by the component based on landingPhase === 'morphing'
  
  bool isDissipateOnlyMode = uDissipateOnly > 0.5;
  bool isCoreLayerParticle = aRandom < uCoreLayerRatio;
  
  // During entrance (uIsEntrance > 0.5), core layer should animate normally
  // Only apply "stay in place" logic when NOT in entrance phase (i.e., during explosion)
  bool isEntrancePhase = uIsEntrance > 0.5;
  bool shouldCoreLayerStay = isDissipateOnlyMode && isCoreLayerParticle && !isEntrancePhase;
  
  // === DISSIPATION ANIMATION (Synced with MagicDust via config uniforms) ===
  // Concept: Particles erode from bottom to top (or random) and float up
  
  // 1. Erosion Threshold
  // Calculate a random threshold for each particle to start moving
  // Use aRandom and vertical height to create an organic erosion front
  float erosionNoise = aRandom; 
  // Invert height logic: Top triggers first (Low delay), Bottom triggers last (High delay)
  // Use pre-computed attribute for performance
  float heightDelay = aErosionFactor; 
  
  // Trigger logic using config uniforms for synchronization
  // Core layer particles that should stay: trigger stays at 0 (no movement during explosion)
  float trigger;
  if (shouldCoreLayerStay) {
    trigger = 0.0; // Core layer stays in place during explosion
  } else {
    trigger = (uProgress * uProgressMultiplier) - (erosionNoise * uNoiseInfluence + heightDelay * uHeightInfluence);
  }
  float localProgress = clamp(trigger, 0.0, 1.0);
  
  // 2. Easing
  float easedProgress = smoothstep(0.0, 1.0, localProgress);
  vProgress = easedProgress; // Pass to frag

  // 3. Movement Physics (Dissipation)
  // Instead of exploding outward to a target, we float UP and DRIFT
  
  // Upward force (buoyancy) - using config uniform
  vec3 upForce = vec3(0.0, uUpForce, 0.0) * easedProgress * easedProgress; // Accelerate up
  
  // Turbulent Drift (Curl-like noise based on time and pos)
  // OPTIMIZED: Pre-compute phases to reduce redundant calculations
  float timeOffset = uTime * 0.5;
  float noisePhaseX = positionStart.y * 0.5 + timeOffset + aRandom * 5.0;
  float noisePhaseZ = positionStart.z * 0.5 + timeOffset * 0.8 + aRandom * 4.0;
  
  // Drift amplitude from config
  vec3 noiseOffset = vec3(
    sin(noisePhaseX),
    0.0,
    cos(noisePhaseZ)
  ) * uDriftAmplitude * easedProgress; // Drift amplitude increases with progress
  
  // === INITIAL POSITION & IDLE ANIMATION ===
  // Calculate animated start position with breathing and sway
  // OPTIMIZED: Pre-compute static phase offsets to reduce sin() calls
  
  // Breathing (radial expansion)
  // Original: Multiple sin() calls with position-based offsets
  // Optimized: Combine offsets before sin() call
  float breathePhase1 = uTime * uBreatheFreq1 + positionStart.y * 0.1;
  float breathePhase2 = uTime * uBreatheFreq2 + positionStart.x * 0.2;
  float breathe = sin(breathePhase1) * uBreatheAmp1 
                + sin(breathePhase2) * uBreatheAmp2;

  // Sway (wind movement)
  // OPTIMIZED: Single sin() call instead of nested calculations
  float swayPhase = uTime * uSwayFreq + positionStart.y * 0.15;
  float sway = sin(swayPhase) * uSwayAmp * smoothstep(-5.0, 20.0, positionStart.y);

  vec3 animatedStart = positionStart;
  if (length(positionStart.xz) > 0.01) {
     animatedStart += normalize(vec3(positionStart.x, 0.0, positionStart.z)) * breathe;
  }
  animatedStart.x += sway;

  vec3 currentPos = animatedStart;
  
  // Apply forces
  if (localProgress > 0.0) {
     currentPos += upForce + noiseOffset;
     
     // Expand slightly as they dissipate (gas expansion)
     // currentPos += normalize(positionStart) * 2.0 * easedProgress;
  }
  
  // Note: Photo particles (isPhotoParticle > 0.5) might need to follow the photo trajectory
  // BUT the user asked for "Particle Dissipation". 
  // If this is a photo particle, we blend to the end position (Orbits) because the React component expects photos there.
  // The React component morphs photos FROM the *Initial* particle position usually.
  // Let's keep the Photo Particles moving to their targets, but with a "dissolving" path?
  // Actually, standard behavior: Photo particles transform to endPos. Regular dissolve.
  
  vec3 finalPos;
  
  if (aIsPhotoParticle > 0.5) {
     // Photo particles: Lerp to orbit target (Standard Bezier/Lerp)
     // We keep the original bezier for photos so they don't get lost
     finalPos = quadraticBezier(animatedStart, controlPoint, positionEnd, easedProgress);
     
     // Add some jitter
     finalPos += noiseOffset * 0.2; 
  } else {
     // Regular particles: Dissipate Upwards
     finalPos = currentPos;
  }
  
  vec3 pos = finalPos;

  // === NO EXTRA ROTATION OR SPIRAL ===
  // (Removed Galaxy/Shockwave logic for pure dissipation)

  // === MVP TRANSFORMATION ===
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // === PARTICLE SIZE ===
  // Depth-based scaling matching original PointsMaterial behavior
  float depthScale = 1.0 + (positionStart.y + 2.5) / 14.0;

  // Size behavior during explosion (using config uniforms)
  float sizeProgress;
  if (aIsPhotoParticle > 0.5) {
    // Photo particles shrink during explosion (will be replaced by photos)
    sizeProgress = 1.0 - easedProgress * 0.8;
  } else {
    // Regular particles: grow slightly then shrink for dissipation
    float growPhase = smoothstep(0.0, uGrowPeakProgress, easedProgress);
    float shrinkPhase = smoothstep(uGrowPeakProgress, 1.0, easedProgress);
    sizeProgress = 1.0 + growPhase * uGrowAmount - shrinkPhase * uShrinkAmount;
  }

  // Base size calculation: aScale ranges 0.3-0.9, uBaseSize is the material size (0.45-0.55)
  float basePointSize = uBaseSize * aScale * 300.0 * sizeProgress;
  gl_PointSize = basePointSize * depthScale / -mvPosition.z;

  // Clamp minimum size to avoid invisible particles
  gl_PointSize = max(gl_PointSize, 1.0);

  // === ALPHA CALCULATION ===
  // Photo particles: fade out during explosion (replaced by photos)
  // Regular particles: fade out completely for dissipation effect
  float baseAlpha = 0.85 * (0.75 + aScale * 0.20);

  if (aIsPhotoParticle > 0.5) {
    // Photo particles fade to let photo mesh appear
    // Photo-specific fade uses different thresholds (fixed)
    float photoFadeStart = 0.2;
    float photoFadeEnd = 0.6;
    float photoFade = 1.0 - smoothstep(photoFadeStart, photoFadeEnd, easedProgress);
    vAlpha = baseAlpha * photoFade;
  } else {
    // Regular particles: complete fade-out for dissipation (using config uniforms)
    float dissipate = 1.0 - smoothstep(uFadeStart, uFadeEnd, easedProgress);
    vAlpha = baseAlpha * dissipate;
  }

  // === OUTPUT TO FRAGMENT SHADER ===
  vProgress = easedProgress; // Pass local eased progress instead of global uProgress
  vColor = aColor;
  vDepth = -mvPosition.z;
  vIsPhotoParticle = aIsPhotoParticle;
  vFlash = 0.0; // No flash effect in dissipation animation
  
  // === EARLY DISCARD ===
  // Optimization: If particle is fully transparent, move out of clip space
  // This skips the fragment shader entirely
  if (vAlpha <= 0.01) {
      // 将粒子移到远平面之外，确保被裁剪掉
      gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
  }
}
