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
  float maxRadius = 12.0;    // Base tree radius at bottom
  float radiusScale = 0.9;   // Scale factor for radius tapering
  float minRadius = 1.0;     // Minimum radius at the top

  // t=0 is top (small radius), t=1 is bottom (large radius)
  return maxRadius * t * radiusScale + minRadius; 
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
  const float progressMultiplier = 2.6; // Scale uProgress to cover the full height + offsets
  const float noiseInfluence = 0.3;     // How much randomness affects the trigger time
  const float heightInfluence = 1.0;    // How strictly it likely follows height (top-down)

  float trigger = (uProgress * progressMultiplier) - (erosionNoise * noiseInfluence + heightDelay * heightInfluence);
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
    gl_PointSize = 0.0;
  }
}
