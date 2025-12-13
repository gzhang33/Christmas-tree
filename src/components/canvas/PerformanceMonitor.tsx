import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// === PERFORMANCE MONITORING PANEL ===
// Displays:
// - Real-time FPS
// - Frame time

export interface PerformanceData {
  fps: number;
  frameTime: number;
  particleCount?: number;
  cameraPosition?: { x: number; y: number; z: number };
  resolution?: string;
  textureCount?: number;
  shaderCount?: number;
}



interface PerformanceMonitorProps {
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

      onUpdate({
        fps: avgFps,
        frameTime: Math.round(delta / frameCount.current * 100) / 100,
        cameraPosition: {
          x: Number(camera.position.x.toFixed(2)),
          y: Number(camera.position.y.toFixed(2)),
          z: Number(camera.position.z.toFixed(2)),
        },
        resolution: `${gl.domElement.width}x${gl.domElement.height}`,
        textureCount: info.memory?.textures ?? 0, shaderCount: info.programs?.length ?? 0,
      });

      frameCount.current = 0;
      lastTime.current = now;
    }
  });

  return null;
};

// Overlay UI component
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  visible = false,
}) => {
  const [data, setData] = useState<PerformanceData>({
    fps: 60,
    frameTime: 16.67,
  });

  const [isExpanded, setIsExpanded] = useState(true);



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
          <Row label="帧时间" value={`${data.frameTime}ms`} />
          {data.cameraPosition && (
            <Row
              label="相机位置"
              value={`${data.cameraPosition.x}, ${data.cameraPosition.y}, ${data.cameraPosition.z}`}
            />
          )}
          {data.resolution && <Row label="分辨率" value={data.resolution} />}
          {data.textureCount !== undefined && <Row label="纹理" value={String(data.textureCount)} />}
          {data.shaderCount !== undefined && <Row label="着色器" value={String(data.shaderCount)} />}
        </div>
      )}    </div>
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
  });

  const updateData = useCallback((newData: Partial<PerformanceData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  }, []);

  return { data, updateData, TrackerComponent: PerformanceTracker };
};

