/**
 * Landing Particles Vertex Shader
 * 
 * GPU-driven 2-stage morphing animation:
 * 
 * Stage 1 (Disperse): Text/Username particles blow outward like sand in wind
 *   - Uses Curl Noise for organic, flowing movement
 *   - Particles drift outward with soft, wind-blown aesthetic
 * 
 * Stage 2 (Converge): ALL particles flow toward pre-marked tree target positions
 *   - Tree shape is NOT pre-rendered
 *   - Tree emerges naturally from particle convergence
 */

// === UNIFORMS ===
uniform float uTime;
uniform float uMix;           // 0.0 = Text/Dispersed, 1.0 = Converged to tree
uniform float uScatter;       // Scatter intensity (0 = stable text, >0 = dispersing)
uniform float uTextCount;     // Number of original text particles
uniform float uBaseSize;
uniform vec3 uColorStart;     // Text state color (gold)
uniform vec3 uColorEnd;       // Tree state color (green)

// === ATTRIBUTES ===
attribute vec3 aPositionStart;  // Text form position (initial)
attribute vec3 aPositionEnd;    // Tree form position (pre-marked target)
attribute float aRandom;        // Random seed per particle
attribute float aSize;          // Size multiplier
attribute float aTextIndex;     // Particle index

// === VARYINGS ===
varying float vAlpha;
varying vec3 vColor;
varying float vMix;

// === NOISE FUNCTIONS ===
vec4 permute(vec4 x) {
    return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

// 3D Simplex Noise
float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 1.0 / 7.0;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// Curl Noise for organic, divergence-free turbulence
vec3 curlNoise(vec3 p) {
    float eps = 0.1;
    
    float n1 = snoise(p + vec3(eps, 0.0, 0.0));
    float n2 = snoise(p - vec3(eps, 0.0, 0.0));
    float n3 = snoise(p + vec3(0.0, eps, 0.0));
    float n4 = snoise(p - vec3(0.0, eps, 0.0));
    float n5 = snoise(p + vec3(0.0, 0.0, eps));
    float n6 = snoise(p - vec3(0.0, 0.0, eps));
    
    float x = (n3 - n4) - (n5 - n6);
    float y = (n5 - n6) - (n1 - n2);
    float z = (n1 - n2) - (n3 - n4);
    
    return vec3(x, y, z) / (2.0 * eps);
}

// Smooth easing
float easeInOutCubic(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
}

void main() {
    vMix = uMix;
    
    // Determine if this is an "extra" particle (beyond original text count)
    float isExtraParticle = step(uTextCount, aTextIndex);
    
    // === HIDING LOGIC ===
    // Extra particles hidden when uMix < 0.1 (text/entrance/disperse phase)
    if (isExtraParticle > 0.5 && uMix < 0.1) {
        gl_PointSize = 0.0;
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
        vAlpha = 0.0;
        vColor = vec3(0.0);
        return;
    }
    
    // === BASE POSITION (Text Form) ===
    // Start from the original text position
    vec3 basePos = aPositionStart;
    
    // === SCATTER EFFECT (Wind-blown sand) ===
    // Only apply when uScatter > 0
    vec3 scatterOffset = vec3(0.0);
    if (uScatter > 0.01) {
        // Calculate Curl Noise based scatter
        vec3 noiseInput = aPositionStart * 0.25 + uTime * 0.15 + aRandom * 6.28;
        vec3 curlOffset = curlNoise(noiseInput);
        
        // Wind direction: outward from center with upward drift
        vec3 outwardDir = normalize(vec3(
            aPositionStart.x * 0.8 + curlOffset.x * 0.3,
            0.5 + curlOffset.y * 0.3,
            aPositionStart.z * 0.8 + curlOffset.z * 0.3
        ));
        
        // Scatter magnitude varies per particle
        float scatterMagnitude = uScatter * (4.0 + aRandom * 3.0);
        
        // Total scatter offset
        scatterOffset = outwardDir * scatterMagnitude + curlOffset * uScatter * 2.0;
    }
    
    // Position after scatter
    vec3 scatteredPos = basePos + scatterOffset;
    
    // === CONVERGENCE TO TREE ===
    // Smooth interpolation factor
    float convergeFactor = easeInOutCubic(uMix);
    
    // For extra particles: spawn from scattered positions around scene
    vec3 extraSpawnPos = vec3(
        (aRandom - 0.5) * 20.0,
        (fract(aRandom * 3.7) - 0.5) * 15.0 + 5.0,
        (fract(aRandom * 7.3) - 0.5) * 20.0
    );
    
    // Effective scattered position
    vec3 effectiveScattered = mix(scatteredPos, extraSpawnPos, isExtraParticle);
    
    // Add flowing motion during convergence
    vec3 flowNoise = curlNoise(aPositionEnd * 0.15 + uTime * 0.1);
    float flowIntensity = (1.0 - convergeFactor) * 1.5;
    
    // Final position: interpolate from scattered/text to tree target
    vec3 finalPos = mix(effectiveScattered, aPositionEnd, convergeFactor);
    finalPos += flowNoise * flowIntensity * step(0.01, uMix); // Only add flow when transitioning
    
    // === SUBTLE BREATHING (Text Phase) ===
    // When uScatter = 0 and uMix = 0, add subtle breathing animation
    if (uScatter < 0.01 && uMix < 0.01) {
        float breathe = sin(uTime * 2.0 + aRandom * 6.28) * 0.03;
        finalPos.y += breathe;
        finalPos.x += breathe * 0.5 * sin(aRandom * 10.0);
    }
    
    // === PARTICLE SIZE ===
    float size = uBaseSize * aSize;
    
    // Breathing size effect
    float breatheSize = 1.0 + sin(uTime * 2.5 + aRandom * 6.28) * 0.08;
    size *= breatheSize;
    
    // Slightly larger during scatter
    size *= 1.0 + uScatter * 0.12;
    
    // === TRANSFORM ===
    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Depth-attenuated point size
    gl_PointSize = (280.0 * size) / -mvPosition.z;
    gl_PointSize = max(gl_PointSize, 1.0);
    
    // === ALPHA ===
    float alpha = 1.0;
    
    // Twinkle effect
    alpha *= 0.88 + 0.12 * sin(uTime * 3.5 + aRandom * 12.0);
    
    // Extra particles fade in during convergence
    float fadeIn = smoothstep(0.05, 0.3, uMix);
    alpha *= mix(1.0, fadeIn, isExtraParticle);
    
    // Slight transparency during scatter
    alpha *= 1.0 - uScatter * 0.08;
    
    // === COLOR ===
    // Smooth transition from gold (text) to green (tree)
    vec3 color = mix(uColorStart, uColorEnd, convergeFactor);
    
    // Warm tint during scatter
    vec3 warmth = vec3(1.0, 0.92, 0.8);
    color = mix(color, color * warmth, uScatter * 0.25);
    
    // === OUTPUT ===
    vAlpha = alpha;
    vColor = color;
}
