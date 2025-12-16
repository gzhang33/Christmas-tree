/**
 * Universal Particle Fragment Shader
 * 
 * Renders particles with sparkle texture and color modulation.
 * Unified fragment shader for text and dust phases.
 */

uniform sampler2D uMap;

varying vec3 vColor;
varying float vAlpha;

void main() {
    vec4 texColor = texture2D(uMap, gl_PointCoord);
    
    if (texColor.a < 0.01) discard;
    
    // Modulate texture color with vertex color
    vec3 finalColor = vColor * texColor.rgb;
    float finalAlpha = texColor.a * vAlpha;
    
    gl_FragColor = vec4(finalColor, finalAlpha);
}
