import { useRef, useEffect } from 'react';

interface StabilityMetrics {
  memoryLeakDetected: boolean;
  tdfStuck: boolean;
  performanceDegraded: boolean;
  lastMemoryCheck: number;
  lastTDFValue: number;
  lastTDFChange: number;
}

interface StabilityActions {
  triggerMemoryCleanup: () => void;
  regenerateCycle: () => void;
  reduceQuality: () => void;
}

export function useStabilityMonitor(
  currentMemory: number,
  currentTDF: number,
  currentFPS: number,
  actions: StabilityActions
) {
  const metricsRef = useRef<StabilityMetrics>({
    memoryLeakDetected: false,
    tdfStuck: false,
    performanceDegraded: false,
    lastMemoryCheck: currentMemory,
    lastTDFValue: currentTDF,
    lastTDFChange: Date.now()
  });
  
  const memoryCheckInterval = useRef<NodeJS.Timeout>();
  const tdfCheckInterval = useRef<NodeJS.Timeout>();

  // Memory leak detection - check every 60 seconds
  useEffect(() => {
    memoryCheckInterval.current = setInterval(() => {
      const memoryDiff = currentMemory - metricsRef.current.lastMemoryCheck;
      const memoryIncreaseMB = memoryDiff / (1024 * 1024);
      
      // If memory increased by >20MB in 60 seconds, potential leak
      if (memoryIncreaseMB > 20) {
        console.warn('[STABILITY] Memory leak detected:', {
          increase: `${memoryIncreaseMB.toFixed(1)}MB`,
          current: `${(currentMemory / 1024 / 1024).toFixed(1)}MB`
        });
        metricsRef.current.memoryLeakDetected = true;
        actions.triggerMemoryCleanup();
      }
      
      metricsRef.current.lastMemoryCheck = currentMemory;
    }, 60000); // Every 60 seconds

    return () => {
      if (memoryCheckInterval.current) {
        clearInterval(memoryCheckInterval.current);
      }
    };
  }, [currentMemory, actions]);

  // TDF stuck detection - check every 60 seconds
  useEffect(() => {
    tdfCheckInterval.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastChange = now - metricsRef.current.lastTDFChange;
      
      // If TDF hasn't changed in 60 seconds, it's stuck
      if (timeSinceLastChange > 60000 && currentTDF === metricsRef.current.lastTDFValue) {
        console.warn('[STABILITY] TDF calculation stuck:', {
          value: currentTDF.toExponential(2),
          stuckFor: `${(timeSinceLastChange / 1000).toFixed(0)}s`
        });
        metricsRef.current.tdfStuck = true;
        actions.regenerateCycle();
      }
    }, 60000); // Every 60 seconds

    return () => {
      if (tdfCheckInterval.current) {
        clearInterval(tdfCheckInterval.current);
      }
    };
  }, [currentTDF, actions]);

  // Track TDF changes
  useEffect(() => {
    if (currentTDF !== metricsRef.current.lastTDFValue) {
      metricsRef.current.lastTDFValue = currentTDF;
      metricsRef.current.lastTDFChange = Date.now();
      metricsRef.current.tdfStuck = false;
    }
  }, [currentTDF]);

  // Performance degradation detection
  useEffect(() => {
    const memoryPressureMB = currentMemory / (1024 * 1024);
    
    // Automatic fallback if FPS drops below 30
    if (currentFPS < 30 && !metricsRef.current.performanceDegraded) {
      console.warn('[STABILITY] Critical performance degradation:', {
        fps: currentFPS,
        memory: `${memoryPressureMB.toFixed(1)}MB`
      });
      metricsRef.current.performanceDegraded = true;
      actions.reduceQuality();
    }
    
    // Recovery detection
    if (currentFPS >= 50 && metricsRef.current.performanceDegraded) {
      console.log('[STABILITY] Performance recovered:', { fps: currentFPS });
      metricsRef.current.performanceDegraded = false;
    }
    
    // Memory pressure detection (>85MB)
    if (memoryPressureMB > 85 && currentFPS < 60) {
      console.warn('[STABILITY] High memory pressure:', {
        memory: `${memoryPressureMB.toFixed(1)}MB`,
        fps: currentFPS
      });
      actions.triggerMemoryCleanup();
    }
  }, [currentFPS, currentMemory, actions]);

  return metricsRef.current;
}
