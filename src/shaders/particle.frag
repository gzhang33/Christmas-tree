/**
 * Particle Fragment Shader
 * 
 * Handles color mixing and texture sampling.
 * Supports "Midnight Magic" aesthetic with soft feathered particles.
 * 
 * @source docs/ux-design-specification.md#3.1-color-system
 */

// === UNIFORMS ===
uniform float uProgress;
uniform vec3 uTreeColor;      // Primary tree color
uniform sampler2D uMap;       // Particle texture map (feather/sparkle)

// === VARYINGS ===
varying float vProgress;
varying float vAlpha;
varying vec3 vColor;
varying float vDepth;

void main() {
  // === TEXTURE SAMPLING ===
  // Sample the particle texture (feather or sparkle)
  vec4 texColor = texture2D(uMap, gl_PointCoord);
  
  // Use texture alpha for soft edges
  float alpha = texColor.a * vAlpha;
  
  // Discard fully transparent pixels for performance
  if (alpha < 0.01) discard;
  
  // === COLOR PROCESSING ===
  // Base color from vertex shader, modulated by texture brightness
  vec3 color = vColor * texColor.rgb;
  
  // Subtle depth-based fog (very subtle darkening for distant particles)
  float fogFactor = clamp((vDepth - 10.0) / 80.0, 0.0, 0.15);
  color = mix(color, color * 0.85, fogFactor);
  
  // === OUTPUT ===
  gl_FragColor = vec4(color, alpha);
}
