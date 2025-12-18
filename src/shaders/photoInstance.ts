/**
 * Photo Instance Shader - GPU驱动的照片动画系统
 * 
 * 性能优化：
 * - 将轨道旋转、浮动动画从CPU下沉到GPU
 * - CPU只需传递时间uniform，位置由Vertex Shader实时计算
 * - 完全消除每帧99次的JavaScript位置计算
 * 
 * Uniforms:
 * - uTime: 全局时间（秒）
 * - uIsAnimating: 是否播放动画（0.0 = 静止, 1.0 = 动画中）
 * - uOrbitSpeed: 轨道旋转速度
 * - uBobAmplitude: 浮动幅度
 * 
 * Attributes (per instance):
 * - aTargetPosition: 目标位置（轨道中心）
 * - aOrbitRadius: 轨道半径
 * - aOrbitPhase: 轨道初始相位
 * - aFloatPhase: 浮动初始相位
 */
// Vertex Shader
export const photoInstanceVertexShader = `
// Instance attributes
attribute vec3 aTargetPosition;  // 目标位置（轨道中心）
attribute float aOrbitRadius;    // 轨道半径
attribute float aOrbitPhase;     // 初始轨道角度
attribute float aFloatPhase;     // 浮动相位偏移

// Uniforms
uniform float uTime;           // 全局时间
uniform float uOrbitSpeed;     // 轨道速度
uniform float uBobAmplitude;   // Y轴浮动幅度
uniform float uBobFrequency;   // 浮动频率
uniform float uIsAnimating;    // 0.0 = 静止, 1.0 = 动画中

// Varyings
varying vec2 vUv;
varying float vOpacity;

void main() {
    vUv = uv;
    
    // 基础位置（使用instance matrix）
    vec3 pos = position;
    
    // 计算当前轨道角度
    float orbitAngle = aOrbitPhase + uTime * uOrbitSpeed * uIsAnimating;
    
    // 计算轨道位置偏移
    vec3 orbitOffset = vec3(
        cos(orbitAngle) * aOrbitRadius,
        0.0,
        sin(orbitAngle) * aOrbitRadius
    );
    
    // 计算Y轴浮动
    float bobOffset = sin(uTime * uBobFrequency + aFloatPhase) * uBobAmplitude * uIsAnimating;
    
    // 应用偏移
    vec3 worldPos = aTargetPosition + orbitOffset + vec3(0.0, bobOffset, 0.0);
    vec3 worldPos = aTargetPosition + orbitOffset + vec3(0.0, bobOffset, 0.0);
    
    // 应用instance matrix的旋转和缩放（注意：instanceMatrix应该不包含位移）
    vec4 transformedPos = instanceMatrix * vec4(pos, 1.0);
    
    // 添加GPU计算的世界位置
    vec4 modelPosition = vec4(transformedPos.xyz + worldPos, 1.0);
    
    // 输出最终位置
    gl_Position = projectionMatrix * viewMatrix * modelPosition;    // 传递透明度（可在fragment shader中使用）
    vOpacity = 1.0;
}
`;

// Fragment Shader
export const photoInstanceFragmentShader = `
uniform sampler2D map;
uniform float uDevelop;
uniform float opacity;

varying vec2 vUv;
varying float vOpacity;

void main() {
    vec4 tex = texture2D(map, vUv);
    
    // Energy Card State: Warm White Glow
    vec3 energyColor = vec3(1.0, 0.98, 0.9);
    
    // Develop: Mix energy color with texture color
    vec3 finalColor = mix(energyColor, tex.rgb, uDevelop);
    
    // Add extra glow when in Energy state
    if (uDevelop < 0.99) {
        float glow = (1.0 - uDevelop) * 0.2;
        finalColor += vec3(glow);
    }
    
    gl_FragColor = vec4(finalColor, opacity * vOpacity);
}
`;

/**
 * 使用说明：
 * 
 * 1. 创建InstancedMesh时使用此Shader：
 * 
 * const material = new THREE.ShaderMaterial({
 *     vertexShader: photoInstanceVertexShader,
 *     fragmentShader: photoInstanceFragmentShader,
 *     uniforms: {
 *         uTime: { value: 0 },
 *         uOrbitSpeed: { value: 0.1 },
 *         uBobAmplitude: { value: 0.3 },
 *         uBobFrequency: { value: 0.5 },
 *         uIsAnimating: { value: 1.0 },
 *         map: { value: texture },
 *         uDevelop: { value: 1.0 },
 *         opacity: { value: 1.0 },
 *     }
 * });
 * 
 * 2. 在useFrame中只需更新时间：
 * 
 * useFrame((state) => {
 *     material.uniforms.uTime.value = state.clock.elapsedTime;
 * });
 * 
 * 3. CPU完全不再计算位置，全部由GPU处理
 */
