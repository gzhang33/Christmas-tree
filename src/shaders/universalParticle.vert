/**
 * Universal Particle Vertex Shader
 * 
 * Unified shader for seamless text-to-dust particle system.
 * Supports multiple phases: text formation, dispersion, drifting, reforming, and continuous dust loop.
 * 
 * Uses "Super Shader" approach with mix factor interpolation for smooth state transitions.
 */

// === PHASE CONSTANTS ===
#define PH_FORMING     0
#define PH_VISIBLE     1
#define PH_DISPERSING  2
#define PH_DRIFTING    3
#define PH_REFORMING   4
#define PH_DUST_LOOP   5

// === UNIFORMS ===
uniform float uTime;
uniform int uPhase;           // Current animation phase
uniform float uProgress;      // Progress within current phase (0.0 - 1.0)
uniform float uBaseSize;      // Base particle size

// Color uniforms
uniform vec3 uTextColor;      // Text phase color
uniform vec3 uDustColor;      // Dust phase color

// MagicDust spiral parameters (for reforming and dust phases)
uniform float uTreeHeight;
uniform float uTreeBottomY;
uniform float uSpiralTurns;
uniform float uRadiusOffset;
uniform float uMaxRadius;
uniform float uRadiusScale;
uniform float uMinRadius;

// Disperse animation parameters
uniform float uDisperseUpForce;
uniform float uDisperseDriftAmp;
uniform float uDisperseNoiseScale;
uniform float uDisperseFadeStart;
uniform float uDisperseFadeEnd;

// Dust loop animation parameters (from MagicDust)
uniform float uAscentSpeed;
uniform float uDustFlickerFreq;

// === ATTRIBUTES ===
attribute vec3 aPositionText;     // Text form position (initial target)
attribute float aRandom;          // Random seed per particle (0-1)
attribute float aSpiralT;         // T parameter for spiral calculation (0-1)
attribute float aFlickerPhase;    // Flicker phase offset for dust animation
attribute vec3 aColor;            // Per-particle color (for dust phase)
attribute float aSize;            // Per-particle size variation

// === VARYINGS ===
varying vec3 vColor;
varying float vAlpha;

// === NOISE FUNCTIONS ===
// Simplex noise for organic scatter motion
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
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

    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
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

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// === EASING FUNCTIONS ===
float easeInOutCubic(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
}

float easeOutQuad(float t) {
    return 1.0 - (1.0 - t) * (1.0 - t);
}

float easeInOutQuad(float t) {
    return t < 0.5 ? 2.0 * t * t : 1.0 - pow(-2.0 * t + 2.0, 2.0) / 2.0;
}

// === TREE RADIUS CALCULATION ===
float getTreeRadius(float t) {
    // t=0 is top (small radius), t=1 is bottom (large radius)
    return uMaxRadius * t * uRadiusScale + uMinRadius;
}

// === SPIRAL POSITION CALCULATION ===
vec3 calculateSpiralPosition(float t, float time, float randomSeed) {
    float topY = uTreeBottomY + uTreeHeight;
    
    // For dust loop, particles ascend continuously
    float currentT = fract(t - uAscentSpeed * time * 0.1);
    float yPos = topY - currentT * uTreeHeight;
    
    float theta = currentT * 3.14159 * 2.0 * uSpiralTurns;
    float radius = getTreeRadius(currentT) + uRadiusOffset;
    
    // Add wobble for organic motion
    float wobbleAngle = time * 0.5 + randomSeed * 6.28;
    float wobbleR = sin(wobbleAngle) * 0.1;
    float wobbleY = sin(wobbleAngle * 1.5) * 0.08;
    
    theta += randomSeed * 0.5;
    radius += wobbleR;
    yPos += wobbleY;
    
    return vec3(
        cos(theta) * radius,
        yPos,
        sin(theta) * radius
    );
}

// === STATIC SPIRAL POSITION (for reforming target) ===
vec3 calculateStaticSpiralPosition(float t, float time, float randomSeed) {
    float topY = uTreeBottomY + uTreeHeight;
    float yPos = topY - t * uTreeHeight;
    
    float theta = t * 3.14159 * 2.0 * uSpiralTurns;
    float radius = getTreeRadius(t) + uRadiusOffset;
    
    // Subtle wobble for liveliness
    float wobbleAngle = time * 0.3 + randomSeed * 6.28;
    float wobbleR = sin(wobbleAngle) * 0.05;
    float wobbleY = sin(wobbleAngle * 1.2) * 0.04;
    
    theta += randomSeed * 0.5;
    radius += wobbleR;
    yPos += wobbleY;
    
    return vec3(
        cos(theta) * radius,
        yPos,
        sin(theta) * radius
    );
}

// === SCATTERED POSITION CALCULATION ===
vec3 calculateScatteredPosition(vec3 textPos, float time) {
    // Calculate scatter offset using noise
    vec3 noiseInput = textPos * uDisperseNoiseScale;
    vec3 noiseOffset = vec3(
        snoise(noiseInput),
        snoise(noiseInput + 100.0),
        snoise(noiseInput + 200.0)
    );
    
    // Scatter components: outward + upward + noise drift
    vec3 outward = normalize(vec3(textPos.x, 0.0, textPos.z) + vec3(0.001)) * 5.0;
    vec3 upward = vec3(0.0, uDisperseUpForce, 0.0);
    vec3 drift = noiseOffset * uDisperseDriftAmp;
    
    return textPos + outward + upward + drift;
}

void main() {
    vec3 finalPos;
    float alpha = 1.0;
    float size = uBaseSize;
    vec3 color = uTextColor;

    // === PHASE 0: FORMING ===
    // Particles converge from random positions to text positions
    if (uPhase == PH_FORMING) {
        float progress = easeOutQuad(uProgress);
        
        // Start position: scattered above and around
        vec3 startPos = vec3(
            aPositionText.x + (aRandom - 0.5) * 20.0,
            aPositionText.y + 10.0 + aRandom * 10.0,
            aPositionText.z + (aRandom - 0.5) * 5.0
        );
        
        finalPos = mix(startPos, aPositionText, progress);
        alpha = progress;
        color = uTextColor;
    }
    // === PHASE 1: VISIBLE ===
    // Particles hold text form with subtle breathing animation
    else if (uPhase == PH_VISIBLE) {
        finalPos = aPositionText;
        
        // Breathing animation
        float breathe = sin(uTime * 2.0 + aRandom * 6.28) * 0.03;
        finalPos.y += breathe;
        finalPos.x += breathe * 0.5 * sin(aRandom * 10.0);
        
        // Twinkle
        alpha = 0.85 + 0.15 * sin(uTime * 3.5 + aRandom * 12.0);
        color = uTextColor;
    }
    // === PHASE 2: DISPERSING ===
    // Particles scatter outward with wind-like motion
    else if (uPhase == PH_DISPERSING) {
        float progress = easeInOutCubic(uProgress);
        
        // Calculate scatter direction with time-based noise
        vec3 noiseInput = aPositionText * uDisperseNoiseScale + uTime * 0.5;
        vec3 noiseOffset = vec3(
            snoise(noiseInput),
            snoise(noiseInput + 100.0),
            snoise(noiseInput + 200.0)
        );
        
        // Scatter offset: outward + upward + noise drift
        vec3 outward = normalize(vec3(aPositionText.x, 0.0, aPositionText.z) + vec3(0.001)) * 5.0;
        vec3 upward = vec3(0.0, uDisperseUpForce, 0.0);
        vec3 drift = noiseOffset * uDisperseDriftAmp;
        
        vec3 scatterOffset = (outward + upward + drift) * progress;
        finalPos = aPositionText + scatterOffset;
        
        // Fade out partially during scatter (keep visible for drifting)
        alpha = 1.0 - smoothstep(uDisperseFadeStart, uDisperseFadeEnd, progress) * 0.5;
        
        // Size variation during scatter
        size *= 1.0 + progress * 0.3 - progress * progress * 0.5;
        color = uTextColor;
    }
    // === PHASE 3: DRIFTING ===
    // Particles hold scattered position with subtle organic drift, waiting for tree
    else if (uPhase == PH_DRIFTING) {
        // Base scattered position (same as end of disperse phase)
        vec3 scatteredPos = calculateScatteredPosition(aPositionText, uTime);
        
        // Add gentle floating motion while waiting
        float floatPhase = uTime * 0.5 + aRandom * 6.28;
        vec3 floatOffset = vec3(
            sin(floatPhase) * 0.3,
            sin(floatPhase * 0.7 + 1.0) * 0.5,
            cos(floatPhase * 0.5) * 0.3
        );
        
        finalPos = scatteredPos + floatOffset;
        
        // Maintain partial visibility with gentle twinkle
        alpha = 0.5 + 0.15 * sin(uTime * 2.0 + aRandom * 10.0);
        size *= 0.9;
        color = uTextColor;
    }
    // === PHASE 4: REFORMING ===
    // Particles converge from scattered position to MagicDust spiral positions
    else if (uPhase == PH_REFORMING) {
        float progress = easeInOutCubic(uProgress);
        
        // Current scattered position (from drifting phase)
        vec3 scatteredPos = calculateScatteredPosition(aPositionText, uTime);
        
        // Add the float offset that was present in drifting
        float floatPhase = uTime * 0.5 + aRandom * 6.28;
        vec3 floatOffset = vec3(
            sin(floatPhase) * 0.3,
            sin(floatPhase * 0.7 + 1.0) * 0.5,
            cos(floatPhase * 0.5) * 0.3
        ) * (1.0 - progress); // Fade out float as we reform
        
        scatteredPos += floatOffset;
        
        // Target: static spiral position (we'll use the assigned spiralT as final position)
        vec3 spiralPos = calculateStaticSpiralPosition(aSpiralT, uTime, aRandom);
        
        // Interpolate from scattered to spiral
        finalPos = mix(scatteredPos, spiralPos, progress);
        
        // Fade back in fully and transition color
        alpha = 0.5 + 0.5 * smoothstep(0.0, 0.3, progress);
        
        // Smooth color transition from text to dust color
        color = mix(uTextColor, aColor, smoothstep(0.3, 0.8, progress));
        
        // Size transition
        size = mix(uBaseSize * 0.9, aSize, progress);
    }
    // === PHASE 5: DUST LOOP ===
    // Continuous ascending spiral animation (MagicDust behavior)
    else {
        // Continuous spiral with ascent
        finalPos = calculateSpiralPosition(aSpiralT, uTime, aRandom);
        
        // Flicker animation
        float flickerFreq = uDustFlickerFreq + mod(aFlickerPhase, 2.0);
        float flicker = 0.8 + sin(uTime * flickerFreq + aFlickerPhase) * 0.2;
        
        // Use per-particle color and size
        color = aColor * (1.0 + flicker * 0.3);
        size = aSize;
        
        // Fade edges based on spiral position
        float currentT = fract(aSpiralT - uAscentSpeed * uTime * 0.1);
        float fadeIn = min((1.0 - currentT) * 8.0, 1.0);
        float fadeOutBase = (currentT < 0.1) ? currentT * 10.0 : 1.0;
        alpha = fadeIn * fadeOutBase;
    }
    
    // === TRANSFORM ===
    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Depth-attenuated point size
    gl_PointSize = (280.0 * size) / -mvPosition.z;
    gl_PointSize = max(gl_PointSize, 1.0);
    
    // === OUTPUT ===
    vColor = color;
    vAlpha = alpha;
    
    // Early discard for invisible particles
    if (vAlpha <= 0.01) {
        gl_PointSize = 0.0;
    }
}
