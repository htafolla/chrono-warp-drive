import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';

interface FPSData {
  current: number;
  average: number;
  min: number;
  max: number;
  history: number[];
  stability: 'excellent' | 'good' | 'degraded' | 'critical';
  targetFPS: number;
}

export function useFPSMonitor(historySize: number = 60) {
  const [fpsData, setFpsData] = useState<FPSData>({
    current: 60,
    average: 60,
    min: 60,
    max: 60,
    history: [],
    stability: 'good',
    targetFPS: 120
  });
  
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const fpsHistory = useRef<number[]>([]);
  const stableHighFPSCount = useRef(0);
  
  useFrame(() => {
    frameCount.current++;
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime.current;
    
    // Calculate FPS every 10 frames for stability
    if (frameCount.current >= 10) {
      const fps = Math.round((frameCount.current * 1000) / deltaTime);
      
      // Update history
      fpsHistory.current.push(fps);
      if (fpsHistory.current.length > historySize) {
        fpsHistory.current.shift();
      }
      
      // Calculate statistics
      const history = fpsHistory.current;
      const average = history.reduce((sum, fps) => sum + fps, 0) / history.length;
      const min = Math.min(...history);
      const max = Math.max(...history);
      
      // Determine stability and adaptive target FPS
      let stability: 'excellent' | 'good' | 'degraded' | 'critical';
      let targetFPS = fpsData.targetFPS;
      
      if (fps < 30) {
        stability = 'critical';
        targetFPS = 60; // Fallback to lower target
      } else if (fps < 50) {
        stability = 'degraded';
        targetFPS = 60;
      } else if (fps >= 60) {
        stability = 'good';
        // Track stable high FPS periods
        if (fps >= 60) {
          stableHighFPSCount.current++;
          // After 10 seconds (600 frames / 10 frames per measurement = 60 measurements) of stable 60+ FPS, try 90 FPS target
          if (stableHighFPSCount.current > 60 && targetFPS < 90) {
            targetFPS = 90;
          }
        } else {
          stableHighFPSCount.current = 0;
        }
      }
      
      if (average > 100) {
        stability = 'excellent';
        targetFPS = 120;
      }
      
      setFpsData({
        current: fps,
        average: Math.round(average),
        min,
        max,
        history: [...history],
        stability,
        targetFPS
      });
      
      // Reset counters
      frameCount.current = 0;
      lastTime.current = currentTime;
    }
  });
  
  return fpsData;
}