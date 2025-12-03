/**
 * Particle Vertex Shader - GPU State Machine Pattern
 * 
 * This shader implements the "GPU State Machine" pattern for high-performance
 * particle animation. All position calculations are performed on the GPU to
 * handle 20k+ particles efficiently.
 * 
 * Animation Flow:
 * 1. Tree Form (uProgress = 0): Particles at aPositionStart (tree shape)
 * 2. Explosion (uProgress 0->1): Particles follow Bezier curve trajectory
 * 3. Cloud Form (uProgress = 1): Particles at aPositionEnd (floating cloud)
 * 
 * The Bezier curve creates a natural arc trajectory:
 * - P0 (Start): Original tree position
 * - P1 (Control): Explosion vector point (creates outward arc)
 * - P2 (End): Final floating position in photo cloud
 */

// === UNIFORMS ===
uniform float uTime;      // Global time for animation effects
uniform float uProgress;  // Animation progress: 0.0 (tree) -> 1.0 (cloud)

// === ATTRIBUTES (per-particle data) ===
attribute vec3 aPositionStart;  // Starting position (tree shape)
attribute vec3 aPositionEnd;    // Ending position (photo cloud)
attribute vec3 aControlPoint;   // Bezier control point (explosion vector)
attribute vec3 aColor;          // Per-particle color from theme
attribute float aRandom;        // Random seed for noise variation

// === VARYINGS (passed to fragment shader) ===
varying vec3 vColor;

/**
 * Quadratic Bezier Interpolation
 * 
 * Formula: P(t) = (1-t)² * P0 + 2(1-t)t * P1 + t² * P2
 * 
 * This creates a smooth curved path between start and end points,
 * with the control point determining the arc's shape.
 * 
 * Physics Rationale:
 * - The control point is positioned along the explosion vector
 * - This creates an outward arc that simulates radial force
 * - The curve naturally decelerates as it approaches the end point
 * 
 * @param p0 Start position (tree)
 * @param p1 Control point (explosion vector)
 * @param p2 End position (cloud)
 * @param t  Interpolation factor (0 to 1)
 * @return   Interpolated position on the curve
 */
vec3 bezier(vec3 p0, vec3 p1, vec3 p2, float t) {
    float oneMinusT = 1.0 - t;
    // Quadratic Bezier: (1-t)²P0 + 2(1-t)tP1 + t²P2
    return oneMinusT * oneMinusT * p0 + 2.0 * oneMinusT * t * p1 + t * t * p2;
}

void main() {
    // Pass color to fragment shader
    vColor = aColor;

    // Calculate current position using Bezier interpolation
    // uProgress drives the entire animation: 0 = tree, 1 = cloud
    vec3 newPos = bezier(aPositionStart, aControlPoint, aPositionEnd, uProgress);

    // Add organic floating motion when particles are in cloud form
    // This creates a gentle bobbing effect for visual interest
    // Only active when uProgress > 0.5 to avoid affecting tree form
    if (uProgress > 0.5) {
        // Use sin wave with time and random offset for variation
        // Amplitude (0.1) is subtle to avoid distracting movement
        float noise = sin(uTime * 2.0 + aRandom * 10.0) * 0.1;
        // Scale by uProgress so effect increases as particles spread
        newPos.y += noise * uProgress;
    }

    // Transform to view space
    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    
    // Point size with perspective attenuation
    // Base size (8.0) divided by camera distance creates natural scaling
    // Negative z because camera looks down -Z axis in view space
    gl_PointSize = 8.0 * (1.0 / -mvPosition.z);
    
    // Final clip space position
    gl_Position = projectionMatrix * mvPosition;
}
