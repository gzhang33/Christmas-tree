uniform float uTime;
uniform float uExplosion;

attribute float aScale;
attribute float aRandom;
attribute float aBranchAngle;
attribute vec3 aExplosionTarget;

varying float vAlpha;
varying float vDepth;
varying float vRandom;

void main() {
  vec3 pos = position;
  vec3 normal = normalize(pos);
  
  // Multi-layer breathing effect for more organic movement
  float breathe1 = sin(uTime * 0.6 + position.y * 0.8 + aRandom * 6.28) * 0.04;
  float breathe2 = sin(uTime * 1.2 + aBranchAngle * 2.0 + position.y * 0.3) * 0.03;
  float breathe3 = cos(uTime * 0.4 + aRandom * 3.14) * 0.02;
  
  // Apply breathing in radial direction
  pos += normal * (breathe1 + breathe2 + breathe3);
  
  // Subtle swaying motion
  float sway = sin(uTime * 0.5 + position.y * 0.2) * 0.08 * (position.y + 3.0) / 12.0;
  pos.x += sway * cos(aBranchAngle);
  pos.z += sway * sin(aBranchAngle);
  
  // Explosion effect
  vec3 explosionPos = aExplosionTarget;
  pos = mix(pos, explosionPos, uExplosion);
  
  // Calculate MVP
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  
  // Particle size with depth-based scaling
  float depthScale = 1.0 + (position.y + 2.5) / 14.0;
  gl_PointSize = aScale * depthScale * (200.0 / -mvPosition.z);
  
  // Pass to fragment shader
  vAlpha = (1.0 - uExplosion * 0.5) * (0.7 + aScale * 0.3);
  vDepth = -mvPosition.z;
  vRandom = aRandom;
}
