/**
 * Particle Fragment Shader
 *
 * Handles color mixing and texture sampling.
 * Supports "Midnight Magic" aesthetic with soft feathered particles.
 *
 * Extended with photo particle support for visual distinction.
 *
 * @source docs/ux-design-specification.md#3.1-color-system
 */

// === UNIFORMS ===
uniform float uProgress;
uniform vec3 uTreeColor;      // Primary tree color
uniform sampler2D uMap;       // Particle texture map (feather/sparkle)
uniform float uGlobalAlpha;   // Global alpha for fade-in transitions
uniform float uBrightness;    // Brightness multiplier

// === VARYINGS ===
varying float vProgress;
varying float vAlpha;
varying vec3 vColor;
varying float vDepth;
varying float vIsPhotoParticle;
varying float vFlash;

void main() {
  // === TEXTURE SAMPLING ===
  // Sample the particle texture (feather or sparkle)
  vec4 texColor = texture2D(uMap, gl_PointCoord);

  // Use texture alpha with edge sharpening for clearer particle edges
  // Direct alpha mapping for 100% texture fidelity
  float alpha = texColor.a * vAlpha;

  // Discard fully transparent pixels for performance
  if (alpha < 0.02) discard;

  // === COLOR PROCESSING ===
  // Base color from vertex shader, modulated by texture brightness
  vec3 color = vColor * texColor.rgb;

  // Apply Brightness Multiplier
  color *= uBrightness;

  // Kinetic Flash (Shockwave effect)
  // Add additive burst of white/gold light based on vFlash
  color += vec3(1.0, 0.95, 0.8) * vFlash;

  // For photo particles during explosion: add subtle glow to indicate transformation
  if (vIsPhotoParticle > 0.5 && vProgress > 0.1) {
    float glowIntensity = smoothstep(0.1, 0.4, vProgress) * (1.0 - smoothstep(0.4, 0.7, vProgress));
    color += vec3(1.0, 0.95, 0.9) * glowIntensity * 0.3;
  }

  // For regular particles during fade-out: desaturate slightly for dispersal effect
  if (vIsPhotoParticle < 0.5 && vProgress > 0.3) {
    float dispersePhase = smoothstep(0.3, 0.7, vProgress);
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(color, vec3(luminance), dispersePhase * 0.4);
    // Also reduce brightness
    color *= 1.0 - dispersePhase * 0.3;
  }

  // Enhanced depth-based fog for volumetric feel
  // Darkens distant particles more significantly to pop the foreground
  float fogFactor = clamp((vDepth - 5.0) / 60.0, 0.0, 0.35);
  color = mix(color, color * 0.4, fogFactor);

  // === OUTPUT ===
  gl_FragColor = vec4(color, alpha * uGlobalAlpha);
}
