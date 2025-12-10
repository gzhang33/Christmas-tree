/**
 * Landing Particles Fragment Shader
 * 
 * Renders particles with soft circular shape and dynamic color.
 * Supports HDR glow effect during transition.
 */

varying float vAlpha;
varying vec3 vColor;
varying float vMix;

void main() {
    // Distance from point center
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    // Soft circular particle with feathered edge
    float softEdge = 1.0 - smoothstep(0.3, 0.5, dist);
    
    // Final alpha
    float alpha = softEdge * vAlpha;
    if (alpha < 0.01) {
        discard;
    }
    
    // HDR boost during transition peak
    float peakGlow = sin(vMix * 3.14159);
    float hdrBoost = 1.0 + peakGlow * 0.25;
    
    // Apply color
    vec3 color = vColor * hdrBoost;
    
    // Center glow
    float glow = max(0.0, 1.0 - dist * 1.2);
    color += glow * 0.08;
    
    gl_FragColor = vec4(color, alpha);
}
