export const HOVER_CONFIG = {
    scaleTarget: 1.5,          // Scale up to 1.5x on hover
    rotationDamping: 0.1,      // Slow rotation speed by 90% when hovered
    tiltMaxAngle: 0.25,        // Maximum tilt angle in radians (~14 degrees)
    transitionSpeed: 8,        // Lerp speed for smooth transitions
    tiltSmoothing: 10,         // Lerp speed for tilt effect
    popDistance: 1.5,          // Minimal Z-Pop 
    idealDistance: 8.0,        // Target distance from camera when hovered (Adaptive Pop)
    emissiveIntensity: 0.5,    // Glow intensity
    autoFaceSpeed: 0.1,        // Quaternion slerp speed
};
