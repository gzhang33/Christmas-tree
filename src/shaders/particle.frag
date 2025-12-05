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
  
  // Use texture alpha with edge sharpening for clearer particle edges
  float rawAlpha = texColor.a * vAlpha;
  // Tighter smoothstep for sharper, more crystal-like appearance
  float edgeSharpness = smoothstep(0.1, 0.35, rawAlpha);
  float alpha = mix(rawAlpha, edgeSharpness, 0.6); // Increased blend towards sharpness
  
  // Discard fully transparent pixels for performance
  if (alpha < 0.02) discard;
  
  // === COLOR PROCESSING ===
  // Base color from vertex shader, modulated by texture brightness
  vec3 color = vColor * texColor.rgb;
  
  // Enhanced depth-based fog for volumetric feel
  // Darkens distant particles more significantly to pop the foreground
  float fogFactor = clamp((vDepth - 5.0) / 60.0, 0.0, 0.35);
  color = mix(color, color * 0.4, fogFactor);
  
  // === OUTPUT ===
  gl_FragColor = vec4(color, alpha);
}
