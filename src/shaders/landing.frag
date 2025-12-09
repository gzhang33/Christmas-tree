/**
 * Landing Particles Fragment Shader
 * 
 * Renders particles with soft circular shape and color from vertex shader.
 */

varying float vAlpha;
varying vec3 vColor;

void main() {
    // Calculate distance from center of point
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    // Soft circular cutoff with feathered edge
    float softEdge = 1.0 - smoothstep(0.35, 0.5, dist);
    
    // Discard fully transparent pixels
    if (softEdge * vAlpha < 0.01) {
        discard;
    }
    
    // Apply color with HDR boost for glow effect
    vec3 finalColor = vColor * 1.2;
    
    gl_FragColor = vec4(finalColor, softEdge * vAlpha);
}
