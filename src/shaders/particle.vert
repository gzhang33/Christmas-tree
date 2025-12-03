uniform float uTime;
uniform float uProgress;

attribute vec3 aPositionStart;
attribute vec3 aPositionEnd;
attribute vec3 aControlPoint;
attribute vec3 aColor;
attribute float aRandom;

varying vec3 vColor;

// Quadratic Bezier interpolation
vec3 bezier(vec3 p0, vec3 p1, vec3 p2, float t) {
    float oneMinusT = 1.0 - t;
    return oneMinusT * oneMinusT * p0 + 2.0 * oneMinusT * t * p1 + t * t * p2;
}

void main() {
    vColor = aColor;

    // Calculate current position based on uProgress
    vec3 newPos = bezier(aPositionStart, aControlPoint, aPositionEnd, uProgress);

    // Add some floating noise when exploded (uProgress near 1.0)
    if (uProgress > 0.5) {
        float noise = sin(uTime * 2.0 + aRandom * 10.0) * 0.1;
        newPos.y += noise * uProgress;
    }

    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    
    // Size attenuation
    gl_PointSize = 8.0 * (1.0 / -mvPosition.z);
    
    gl_Position = projectionMatrix * mvPosition;
}
