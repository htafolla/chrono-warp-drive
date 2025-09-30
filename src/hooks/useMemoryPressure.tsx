// Memory Pressure Detection Hook (Codex v4.7 Phase 4)
import { useState, useEffect, useCallback } from 'react';

export interface MemoryPressureState {
  usedMB: number;
  limitMB: number;
  percentUsed: number;
  pressure: 'low' | 'medium' | 'high' | 'critical';
  shouldReduceQuality: boolean;
  shouldCleanup: boolean;
}

/**
 * Memory pressure detection hook
 * Implements Codex v4.7 Phase 4: Advanced Memory Management
 * Target: <360MB for optimal performance
 */
export function useMemoryPressure(options: {
  targetMB?: number;
  criticalMB?: number;
  pollInterval?: number;
  enabled?: boolean;
} = {}) {
  const {
    targetMB = 360,
    criticalMB = 450,
    pollInterval = 2000,
    enabled = true
  } = options;

  const [memoryState, setMemoryState] = useState<MemoryPressureState>({
    usedMB: 0,
    limitMB: 0,
    percentUsed: 0,
    pressure: 'low',
    shouldReduceQuality: false,
    shouldCleanup: false
  });

  const checkMemory = useCallback(() => {
    if (!enabled) return;

    // Check if performance.memory is available (Chromium-based browsers)
    const memoryInfo = (performance as any).memory;
    if (memoryInfo) {
      const usedBytes = memoryInfo.usedJSHeapSize;
      const limitBytes = memoryInfo.jsHeapSizeLimit;
      
      const usedMB = usedBytes / 1024 / 1024;
      const limitMB = limitBytes / 1024 / 1024;
      const percentUsed = (usedMB / limitMB) * 100;

      // Determine pressure level
      let pressure: MemoryPressureState['pressure'] = 'low';
      let shouldReduceQuality = false;
      let shouldCleanup = false;

      if (usedMB >= criticalMB) {
        pressure = 'critical';
        shouldReduceQuality = true;
        shouldCleanup = true;
      } else if (usedMB >= targetMB * 1.2) {
        pressure = 'high';
        shouldReduceQuality = true;
        shouldCleanup = true;
      } else if (usedMB >= targetMB) {
        pressure = 'medium';
        shouldReduceQuality = true;
        shouldCleanup = false;
      }

      setMemoryState({
        usedMB,
        limitMB,
        percentUsed,
        pressure,
        shouldReduceQuality,
        shouldCleanup
      });

      // Log critical memory pressure
      if (pressure === 'critical') {
        console.warn(
          `[Memory Pressure] CRITICAL: ${usedMB.toFixed(0)}MB / ${limitMB.toFixed(0)}MB (${percentUsed.toFixed(1)}%)`
        );
      }
    } else {
      // Fallback for non-Chromium browsers
      // Estimate based on target
      setMemoryState({
        usedMB: 0,
        limitMB: 0,
        percentUsed: 0,
        pressure: 'low',
        shouldReduceQuality: false,
        shouldCleanup: false
      });
    }
  }, [enabled, targetMB, criticalMB]);

  useEffect(() => {
    if (!enabled) return;

    // Initial check
    checkMemory();

    // Poll memory usage
    const interval = setInterval(checkMemory, pollInterval);

    return () => clearInterval(interval);
  }, [enabled, pollInterval, checkMemory]);

  /**
   * Force garbage collection (if available)
   * Note: Only works in Chrome with --js-flags=--expose-gc
   */
  const forceGC = useCallback(() => {
    if (typeof (window as any).gc === 'function') {
      console.log('[Memory Pressure] Forcing garbage collection');
      (window as any).gc();
    } else {
      console.warn('[Memory Pressure] GC not available (run Chrome with --js-flags=--expose-gc)');
    }
  }, []);

  /**
   * Get memory recommendations
   */
  const getRecommendations = useCallback((): string[] => {
    const recommendations: string[] = [];

    if (memoryState.shouldCleanup) {
      recommendations.push('Run memory cleanup');
    }

    if (memoryState.shouldReduceQuality) {
      recommendations.push('Reduce graphics quality');
    }

    if (memoryState.pressure === 'critical') {
      recommendations.push('Disable particle effects');
      recommendations.push('Reduce LOD complexity');
      recommendations.push('Clear unused geometries');
    }

    if (memoryState.pressure === 'high') {
      recommendations.push('Reduce mesh density');
      recommendations.push('Enable aggressive LOD');
    }

    return recommendations;
  }, [memoryState]);

  return {
    ...memoryState,
    forceGC,
    getRecommendations,
    refresh: checkMemory
  };
}
