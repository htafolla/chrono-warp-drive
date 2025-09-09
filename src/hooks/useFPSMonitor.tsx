import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';

interface FPSData {
  current: number;
  average: number;
  min: number;
  max: number;
  history: number[];
}

export function useFPSMonitor(historySize: number = 60) {
  const [fpsData, setFpsData] = useState<FPSData>({
    current: 60,
    average: 60,
    min: 60,
    max: 60,
    history: []
  });
  
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const fpsHistory = useRef<number[]>([]);
  
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
      
      setFpsData({
        current: fps,
        average: Math.round(average),
        min,
        max,
        history: [...history]
      });
      
      // Reset counters
      frameCount.current = 0;
      lastTime.current = currentTime;
    }
  });
  
  return fpsData;
}