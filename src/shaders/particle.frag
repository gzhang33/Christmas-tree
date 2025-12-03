uniform vec3 uColor;
uniform float uProgress;

varying vec3 vColor;

void main() {
    // Circular particle
    vec2 uv = gl_PointCoord.xy - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;

    // Soft edge
    float alpha = 1.0 - smoothstep(0.4, 0.5, dist);

    // Boost intensity when in tree form (uProgress close to 0) to simulate glow
    float intensity = 1.0 + (1.0 - uProgress) * 2.0; 
    
    vec3 finalColor = vColor * uColor * intensity;

    gl_FragColor = vec4(finalColor, alpha);
}
