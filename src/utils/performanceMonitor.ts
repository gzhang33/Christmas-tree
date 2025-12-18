/**
 * 性能监控工具 - 用于对比优化前后的性能差异
 * 
 * 使用方法：
 * 1. 在TreeParticles.tsx中导入此Hook
 * 2. 调用 usePerformanceMonitor('PhotoWall')
 * 3. 打开浏览器控制台查看性能报告
 * 
 * 监控指标：
 * - FPS (帧率)
 * - Frame Time (帧耗时)
 * - CPU Time (JavaScript执行时间)
 * - Memory Usage (内存占用)
 */

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PerformanceStats {
    fps: number;
    frameTime: number;
    cpuTime: number;
    memory: number;
    drawCalls: number;
}

class PerformanceMonitor {
    private samples: number[] = [];
    private cpuSamples: number[] = [];
    private sampleSize = 60; // 1秒采样（60fps）
    private lastReportTime = 0;
    private reportInterval = 5000; // 每5秒报告一次

    update(delta: number, renderer: THREE.WebGLRenderer) {
        const frameTime = delta * 1000; // 转换为毫秒
        this.samples.push(frameTime);

        if (this.samples.length > this.sampleSize) {
            this.samples.shift();
        }

        // 检查是否需要报告
        const now = performance.now();
        if (now - this.lastReportTime > this.reportInterval) {
            this.report(renderer);
            this.lastReportTime = now;
        }
    }

    private report(renderer: THREE.WebGLRenderer) {
        if (this.samples.length === 0) return;

        // 计算统计数据
        const avgFrameTime = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
        const fps = 1000 / avgFrameTime;
        const minFrameTime = Math.min(...this.samples);
        const maxFrameTime = Math.max(...this.samples);

        // 获取渲染器信息
        const info = renderer.info;

        // 获取内存信息（如果可用）
        let memoryMB = 0;
        if ((performance as any).memory) {
            memoryMB = (performance as any).memory.usedJSHeapSize / 1048576;
        }

        console.group('🎄 Performance Report');
        console.log(`📊 FPS: ${fps.toFixed(1)} (Target: 60)`);
        console.log(`⏱️  Frame Time: ${avgFrameTime.toFixed(2)}ms (Min: ${minFrameTime.toFixed(2)}ms, Max: ${maxFrameTime.toFixed(2)}ms)`);
        console.log(`🎨 Draw Calls: ${info.render.calls}`);
        console.log(`🔺 Triangles: ${info.render.triangles.toLocaleString()}`);
        console.log(`🖼️  Textures: ${info.memory.textures}`);
        console.log(`📦 Geometries: ${info.memory.geometries}`);
        if (memoryMB > 0) {
            console.log(`💾 Memory: ${memoryMB.toFixed(1)}MB`);
        }

        // 性能评级
        if (fps >= 58) {
            console.log('✅ Performance: Excellent');
        } else if (fps >= 50) {
            console.log('⚠️  Performance: Good');
        } else if (fps >= 40) {
            console.log('🟡 Performance: Acceptable');
        } else {
            console.log('❌ Performance: Poor');
        }

        console.groupEnd();
    }

    reset() {
        this.samples = [];
        this.cpuSamples = [];
    }
}

export const usePerformanceMonitor = (label: string = 'Scene') => {
    const monitorRef = useRef<PerformanceMonitor>(new PerformanceMonitor());
    const enabled = useRef(true); // 可通过全局变量控制

    useEffect(() => {
        console.log(`🚀 Performance Monitor Started: ${label}`);
        console.log('📝 Reports will be logged every 5 seconds');

        return () => {
            console.log(`🛑 Performance Monitor Stopped: ${label}`);
        };
    }, [label]);

    useFrame((state, delta) => {
        if (!enabled.current) return;
        monitorRef.current.update(delta, state.gl);
    });

    return {
        reset: () => monitorRef.current.reset(),
        enable: () => { enabled.current = true; },
        disable: () => { enabled.current = false; },
    };
};

/**
 * 手动性能测试工具
 * 
 * 使用方法：
 * 
 * import { measurePerformance } from './performanceMonitor';
 * 
 * measurePerformance('My Function', () => {
 *     // 你的代码
 * });
 */
export const measurePerformance = (label: string, fn: () => void, iterations = 1000) => {
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
        fn();
    }

    const end = performance.now();
    const total = end - start;
    const average = total / iterations;

    console.group(`⏱️  Performance Test: ${label}`);
    console.log(`Iterations: ${iterations}`);
    console.log(`Total Time: ${total.toFixed(2)}ms`);
    console.log(`Average Time: ${average.toFixed(4)}ms`);
    console.groupEnd();

    return { total, average };
};

/**
 * 对比测试工具
 * 
 * 使用方法：
 * 
 * comparePerformance(
 *     'Original vs Optimized',
 *     () => { /* 原版代码 *​/ },
 *     () => { /* 优化代码 *​/ }
 * );
 */
export const comparePerformance = (
    label: string,
    fnA: () => void,
    fnB: () => void,
    iterations = 1000
) => {
    console.group(`🆚 Performance Comparison: ${label}`);

    const resultA = measurePerformance('Version A', fnA, iterations);
    const resultB = measurePerformance('Version B', fnB, iterations);

    const improvement = ((resultA.average - resultB.average) / resultA.average) * 100;

    console.log('\n📊 Comparison Result:');
    if (improvement > 0) {
        console.log(`✅ Version B is ${improvement.toFixed(1)}% faster`);
    } else {
        console.log(`❌ Version B is ${Math.abs(improvement).toFixed(1)}% slower`);
    }

    console.groupEnd();

    return { improvement, resultA, resultB };
};
