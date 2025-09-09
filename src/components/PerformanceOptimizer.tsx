// Performance Optimizer for BLURRN v4.5 - Web Workers & Decimation
import React, { useEffect, useRef } from 'react';

// Web Worker for heavy calculations
const createCalculationWorker = (): Worker => {
  const workerCode = `
    // Web Worker for BLURRN v4.5 calculations
    self.onmessage = function(e) {
      const { type, data } = e.data;
      
      try {
        switch (type) {
          case 'DECIMATE_SPECTRUM':
            const result = decimateArray(data.array, data.targetSize);
            self.postMessage({ type: 'DECIMATION_COMPLETE', result });
            break;
            
          case 'CALCULATE_VARIANCE':
            const variance = calculateVariance(data.values);
            self.postMessage({ type: 'VARIANCE_COMPLETE', result: variance });
            break;
            
          case 'NEURAL_PREPROCESSING':
            const processed = preprocessNeuralData(data.spectrum);
            self.postMessage({ type: 'NEURAL_PREPROCESSING_COMPLETE', result: processed });
            break;
            
          default:
            self.postMessage({ type: 'ERROR', error: 'Unknown operation type' });
        }
      } catch (error) {
        self.postMessage({ type: 'ERROR', error: error.message });
      }
    };
    
    function decimateArray(array, targetSize) {
      if (array.length <= targetSize) return array;
      
      const step = array.length / targetSize;
      const decimated = [];
      
      for (let i = 0; i < targetSize; i++) {
        const index = Math.floor(i * step);
        decimated.push(array[index]);
      }
      
      return decimated;
    }
    
    function calculateVariance(values) {
      if (values.length === 0) return 0;
      
      const mean = values.reduce((a, b) => a + b) / values.length;
      const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
      return squaredDiffs.reduce((a, b) => a + b) / values.length;
    }
    
    function preprocessNeuralData(spectrum) {
      const { wavelengths, intensities } = spectrum;
      
      // Normalize intensities
      const max = Math.max(...intensities);
      const min = Math.min(...intensities);
      const range = max - min;
      
      const normalized = intensities.map(val => range > 0 ? (val - min) / range : 0.5);
      
      // Sample to fixed size for neural network
      const sampled = decimateArray(normalized, 200);
      
      return {
        normalized: sampled,
        originalSize: intensities.length,
        wavelengthRange: [Math.min(...wavelengths), Math.max(...wavelengths)]
      };
    }
  `;
  
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private worker: Worker | null = null;
  private frameTimeTarget = 16.67; // 60 FPS target
  private lastFrameTime = 0;
  private frameCount = 0;
  private cache = new Map<string, any>();

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  initialize(): void {
    try {
      this.worker = createCalculationWorker();
      console.log('Performance Optimizer: Web Worker initialized');
    } catch (error) {
      console.warn('Performance Optimizer: Web Worker failed, using main thread:', error);
      this.worker = null;
    }
  }

  // Decimate large arrays for visualization performance
  decimateForVisualization(array: number[], maxPoints = 1000): Promise<number[]> {
    return new Promise((resolve) => {
      if (array.length <= maxPoints) {
        resolve(array);
        return;
      }

      const cacheKey = `decimate_${array.length}_${maxPoints}`;
      if (this.cache.has(cacheKey)) {
        resolve(this.cache.get(cacheKey));
        return;
      }

      if (this.worker) {
        const handler = (e: MessageEvent) => {
          if (e.data.type === 'DECIMATION_COMPLETE') {
            this.worker!.removeEventListener('message', handler);
            this.cache.set(cacheKey, e.data.result);
            resolve(e.data.result);
          }
        };
        
        this.worker.addEventListener('message', handler);
        this.worker.postMessage({
          type: 'DECIMATE_SPECTRUM',
          data: { array, targetSize: maxPoints }
        });
      } else {
        // Fallback to main thread
        const result = this.decimateArraySync(array, maxPoints);
        this.cache.set(cacheKey, result);
        resolve(result);
      }
    });
  }

  // Optimized frame rate controller
  shouldProcessFrame(): boolean {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    
    if (deltaTime >= this.frameTimeTarget) {
      this.lastFrameTime = now;
      this.frameCount++;
      return true;
    }
    
    return false;
  }

  // Get current FPS estimate
  getCurrentFPS(): number {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    return deltaTime > 0 ? 1000 / deltaTime : 60;
  }

  // Adaptive quality based on performance
  getAdaptiveQuality(): 'high' | 'medium' | 'low' {
    const fps = this.getCurrentFPS();
    
    if (fps >= 50) return 'high';
    if (fps >= 30) return 'medium';
    return 'low';
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  // Optimized neural preprocessing
  preprocessForNeural(spectrum: any): Promise<any> {
    return new Promise((resolve) => {
      if (this.worker) {
        const handler = (e: MessageEvent) => {
          if (e.data.type === 'NEURAL_PREPROCESSING_COMPLETE') {
            this.worker!.removeEventListener('message', handler);
            resolve(e.data.result);
          }
        };
        
        this.worker.addEventListener('message', handler);
        this.worker.postMessage({
          type: 'NEURAL_PREPROCESSING',
          data: { spectrum }
        });
      } else {
        // Fallback preprocessing
        resolve(this.preprocessNeuralSync(spectrum));
      }
    });
  }

  private decimateArraySync(array: number[], targetSize: number): number[] {
    if (array.length <= targetSize) return array;
    
    const step = array.length / targetSize;
    const decimated: number[] = [];
    
    for (let i = 0; i < targetSize; i++) {
      const index = Math.floor(i * step);
      decimated.push(array[index]);
    }
    
    return decimated;
  }

  private preprocessNeuralSync(spectrum: any): any {
    const { wavelengths, intensities } = spectrum;
    
    // Normalize intensities
    const max = Math.max(...intensities);
    const min = Math.min(...intensities);
    const range = max - min;
    
    const normalized = intensities.map((val: number) => range > 0 ? (val - min) / range : 0.5);
    
    // Sample to fixed size for neural network
    const sampled = this.decimateArraySync(normalized, 200);
    
    return {
      normalized: sampled,
      originalSize: intensities.length,
      wavelengthRange: [Math.min(...wavelengths), Math.max(...wavelengths)]
    };
  }

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.cache.clear();
  }
}

// React hook for performance optimization
export function usePerformanceOptimizer() {
  const optimizerRef = useRef<PerformanceOptimizer | null>(null);

  useEffect(() => {
    if (!optimizerRef.current) {
      optimizerRef.current = PerformanceOptimizer.getInstance();
      optimizerRef.current.initialize();
    }

    return () => {
      // Don't dispose here as it's a singleton
    };
  }, []);

  return optimizerRef.current;
}