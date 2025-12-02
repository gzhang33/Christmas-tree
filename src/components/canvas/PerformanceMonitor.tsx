import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// === PERFORMANCE MONITORING PANEL ===
// Displays:
// - Real-time FPS
// - DrawCall count
// - VRAM usage estimate
// - Particle count
// - LOD level

interface PerformanceData {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  particleCount: number;
  lodLevel: string;
  memoryUsage: number;
}

interface PerformanceMonitorProps {
  particleCount: number;
  visible?: boolean;
}

// Internal 3D component for gathering renderer stats
const PerformanceTracker: React.FC<{
  onUpdate: (data: Partial<PerformanceData>) => void;
}> = ({ onUpdate }) => {
  const { gl, camera } = useThree();
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const fpsHistory = useRef<number[]>([]);

  useFrame(() => {
    frameCount.current++;

    const now = performance.now();
    const delta = now - lastTime.current;

    // Update every 500ms for smoother readings
    if (delta >= 500) {
      const fps = Math.round((frameCount.current * 1000) / delta);
      fpsHistory.current.push(fps);
      if (fpsHistory.current.length > 10) {
        fpsHistory.current.shift();
      }

      const avgFps = Math.round(
        fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length
      );

      const info = gl.info;

      // Determine LOD level based on camera distance
      const distance = camera.position.length();
      let lodLevel = 'High';
      if (distance > 35) lodLevel = 'Low';
      else if (distance > 20) lodLevel = 'Medium';

      onUpdate({
        fps: avgFps,
        frameTime: Math.round(delta / frameCount.current * 100) / 100,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        lodLevel,
      });

      frameCount.current = 0;
      lastTime.current = now;
    }
  });

  return null;
};

// Overlay UI component
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  particleCount,
  visible = false,
}) => {
  const [data, setData] = useState<PerformanceData>({
    fps: 60,
    frameTime: 16.67,
    drawCalls: 0,
    triangles: 0,
    particleCount: 0,
    lodLevel: 'High',
    memoryUsage: 0,
  });

  const [isExpanded, setIsExpanded] = useState(true);

  // Estimate memory usage
  useEffect(() => {
    // Rough estimate: each particle uses ~64 bytes (position, color, size, etc.)
    const memMB = Math.round((particleCount * 64) / (1024 * 1024) * 100) / 100;
    setData((prev) => ({ ...prev, particleCount, memoryUsage: memMB }));
  }, [particleCount]);

  const handleUpdate = useCallback((newData: Partial<PerformanceData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  }, []);

  if (!visible) return null;

  // Determine FPS color
  const getFpsColor = (fps: number) => {
    if (fps >= 55) return '#4CAF50'; // Green
    if (fps >= 40) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };

  // Device tier based on FPS
  const getDeviceTier = (fps: number) => {
    if (fps >= 55) return { tier: 'High-end', limit: '35,000', color: '#4CAF50' };
    if (fps >= 40) return { tier: 'Mid-range', limit: '18,000', color: '#FFC107' };
    return { tier: 'Low-end', limit: '10,000', color: '#F44336' };
  };

  const deviceInfo = getDeviceTier(data.fps);

  return (
    <>
      {/* Performance Tracker (3D context) - rendered inside Canvas */}
      <PerformanceTracker onUpdate={handleUpdate} />

      {/* Overlay Panel (rendered in portal or as sibling) */}
    </>
  );
};

// Separate overlay component to be rendered outside Canvas
export const PerformanceOverlay: React.FC<{
  visible: boolean;
  data: PerformanceData;
}> = ({ visible, data }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!visible) return null;

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return '#4CAF50';
    if (fps >= 40) return '#FFC107';
    return '#F44336';
  };

  const getDeviceTier = (fps: number) => {
    if (fps >= 55) return { tier: 'High-end', limit: '35,000', color: '#4CAF50' };
    if (fps >= 40) return { tier: 'Mid-range', limit: '18,000', color: '#FFC107' };
    return { tier: 'Low-end', limit: '10,000', color: '#F44336' };
  };

  const deviceInfo = getDeviceTier(data.fps);

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        background: 'rgba(0, 0, 0, 0.85)',
        border: '1px solid rgba(255, 182, 193, 0.3)',
        borderRadius: '8px',
        padding: isExpanded ? '12px 16px' : '8px 12px',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 1000,
        minWidth: isExpanded ? '200px' : 'auto',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: isExpanded ? '8px' : 0,
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span style={{ color: '#FFB6C1', fontWeight: 'bold' }}>
          ⚡ Performance
        </span>
        <span
          style={{
            color: getFpsColor(data.fps),
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          {data.fps} FPS
        </span>
      </div>

      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
            <Row label="Frame Time" value={`${data.frameTime}ms`} />
            <Row label="Draw Calls" value={data.drawCalls.toString()} />
            <Row label="Triangles" value={formatNumber(data.triangles)} />
            <Row label="Particles" value={formatNumber(data.particleCount)} />
            <Row label="VRAM Est." value={`~${data.memoryUsage}MB`} />
            <Row label="LOD Level" value={data.lodLevel} />
          </div>

          <div
            style={{
              marginTop: '4px',
              padding: '6px 8px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '4px',
              borderLeft: `3px solid ${deviceInfo.color}`,
            }}
          >
            <div style={{ color: deviceInfo.color, fontWeight: 'bold', fontSize: '11px' }}>
              {deviceInfo.tier} Device
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px' }}>
              Recommended: ≤{deviceInfo.limit} particles
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper components
const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '2px 0',
    }}
  >
    <span style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</span>
    <span style={{ color: '#fff' }}>{value}</span>
  </div>
);

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

// Hook for performance monitoring in Canvas
export const usePerformanceMonitor = () => {
  const [data, setData] = useState<PerformanceData>({
    fps: 60,
    frameTime: 16.67,
    drawCalls: 0,
    triangles: 0,
    particleCount: 0,
    lodLevel: 'High',
    memoryUsage: 0,
  });

  const updateData = useCallback((newData: Partial<PerformanceData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  }, []);

  return { data, updateData, TrackerComponent: PerformanceTracker };
};

