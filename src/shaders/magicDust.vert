uniform float uTime;
uniform float uTreeHeight;
uniform float uTreeBottomY;
uniform float uSpiralTurns;
uniform float uRadiusOffset;
uniform float uProgress; // NEW: Animation progress

attribute float aSpiralT;
attribute float aAscentSpeed;
attribute float aRadiusOffset;
attribute float aAngleOffset;
attribute float aFlickerPhase;
attribute vec3 aColor;
attribute float aSize;
attribute float aErosionFactor; // NEW: For dissipation timing
attribute float aRandom;        // NEW: For noise


varying vec3 vColor;
varying float vAlpha;

// Function to calculate tree radius at a given normalized height (0 to 1)
// Tiered shape logic mimicking treeUtils.ts
float getTreeRadius(float t) {
  float maxRadius = 12.0; // Base tree radius
  // Simple cone approximation for shader efficiency, or tiered if needed.
  // Using a cone shape: radius is largest at bottom (t=0) and smallest at top (t=1).
  // Note: t here implies 0 at bottom, 1 at top? 
  // In MagicDust.tsx logic: y = topY - t * treeHeight. So t=0 is TOP, t=1 is BOTTOM.
  // So radius should be larger when t is larger.
  
  return maxRadius * t * 0.9 + 1.0; 
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
  
  // Erosion Threshold
  float erosionNoise = aRandom; 
  float heightDelay = aErosionFactor; 
  
  // Trigger logic matching TreeParticles: (uProgress * 2.6) - offsets
  float trigger = (uProgress * 2.6) - (erosionNoise * 0.3 + heightDelay * 1.0);
  float localProgress = clamp(trigger, 0.0, 1.0);
  float easedProgress = smoothstep(0.0, 1.0, localProgress);
  
  // Movement Physics (Dissipation)
  // Upward force
  vec3 upForce = vec3(0.0, 15.0, 0.0) * easedProgress * easedProgress;
  
  // Turbulent Drift
  float timeOffset = uTime * 0.5;
  float noisePhaseX = spiralPos.y * 0.5 + timeOffset + aRandom * 5.0;
  float noisePhaseZ = spiralPos.z * 0.5 + timeOffset * 0.8 + aRandom * 4.0;
  
  vec3 noiseOffset = vec3(
    sin(noisePhaseX),
    0.0,
    cos(noisePhaseZ)
  ) * 4.0 * easedProgress;
  
  vec3 currentPos = spiralPos;
  
  if (localProgress > 0.0) {
     currentPos += upForce + noiseOffset;
  }
  
  vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  
  // 4. Size & Fade
  float dist = -mvPosition.z;
  
  // Size behavior during explosion
  float growPhase = smoothstep(0.0, 0.3, easedProgress);
  float shrinkPhase = smoothstep(0.3, 1.0, easedProgress);
  float sizeProgress = 1.0 + growPhase * 0.3 - shrinkPhase * 0.6;
  
  gl_PointSize = aSize * (300.0 / dist) * sizeProgress;
  
  // Flicker
  float flickerFreq = 3.0 + mod(aFlickerPhase, 2.0);
  float flicker = 0.8 + sin(uTime * flickerFreq + aFlickerPhase) * 0.2;
  
  // Fade edges (Tree State)
  float fadeIn = min((1.0 - currentT) * 8.0, 1.0);
  float fadeOutBase = (currentT < 0.1) ? currentT * 10.0 : 1.0;
  float baseFade = fadeIn * fadeOutBase;
  
  // Fade out for dissipation
  float fadeStart = 0.3;
  float fadeEnd = 0.85;
  float dissipate = 1.0 - smoothstep(fadeStart, fadeEnd, easedProgress);
  
  vColor = aColor * (1.0 + flicker * 0.3); // Brighten on flicker
  vAlpha = baseFade * dissipate;
  
  // Early discard optimization
  if (vAlpha <= 0.01) {
    gl_Position = vec4(10.0, 10.0, 10.0, 1.0);
  }
}
