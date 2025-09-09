// Background Processing Integration for existing components - Phase 9
import { BackgroundProcessingManager } from './backgroundProcessingManager';

// Global initialization function
export async function initializeBackgroundProcessing(): Promise<void> {
  try {
    const manager = BackgroundProcessingManager.getInstance();
    await manager.initialize();
    
    // Make it globally available for fallback access
    if (typeof window !== 'undefined') {
      (window as any).backgroundProcessingManager = manager;
    }
    
    console.log('Global background processing initialized');
  } catch (error) {
    console.error('Failed to initialize global background processing:', error);
  }
}

// Enhanced spectrum processing with background support
export async function processSpectrumInBackground(
  spectrumData: any,
  operation: 'DOWNSAMPLE' | 'SMOOTH' | 'NORMALIZE' = 'DOWNSAMPLE',
  options: any = {}
): Promise<any> {
  try {
    const manager = BackgroundProcessingManager.getInstance();
    return await manager.processSpectrumAnalysis({
      wavelengths: spectrumData.wavelengths,
      intensities: spectrumData.intensities,
      operation,
      ...options
    });
  } catch (error) {
    console.warn('Background spectrum processing failed, using fallback:', error);
    
    // Fallback processing
    switch (operation) {
      case 'DOWNSAMPLE':
        return downsampleSpectrumSync(spectrumData.intensities, options.targetSize || 1000);
      case 'NORMALIZE':
        return normalizeSpectrumSync(spectrumData.intensities);
      case 'SMOOTH':
        return smoothSpectrumSync(spectrumData.intensities, options.windowSize || 5);
      default:
        return spectrumData.intensities;
    }
  }
}

// Enhanced mathematical operations with background support
export async function performMathInBackground(
  operation: 'VARIANCE' | 'CORRELATION' | 'FFT' | 'STATISTICS',
  data: any
): Promise<any> {
  try {
    const manager = BackgroundProcessingManager.getInstance();
    return await manager.processMathematicalOperation(operation, data);
  } catch (error) {
    console.warn('Background math processing failed, using fallback:', error);
    
    // Fallback processing
    switch (operation) {
      case 'VARIANCE':
        return calculateVarianceSync(data);
      case 'CORRELATION':
        return calculateCorrelationSync(data.arr1, data.arr2);
      case 'STATISTICS':
        return calculateStatisticsSync(data);
      default:
        throw new Error('Unknown math operation');
    }
  }
}

// Fallback synchronous functions
function downsampleSpectrumSync(intensities: number[], targetSize: number): number[] {
  if (intensities.length <= targetSize) return intensities;
  const step = intensities.length / targetSize;
  const downsampled: number[] = [];
  for (let i = 0; i < targetSize; i++) {
    downsampled.push(intensities[Math.floor(i * step)]);
  }
  return downsampled;
}

function normalizeSpectrumSync(intensities: number[]): number[] {
  const max = Math.max(...intensities);
  const min = Math.min(...intensities);
  const range = max - min;
  if (range === 0) return intensities.map(() => 0.5);
  return intensities.map(val => (val - min) / range);
}

function smoothSpectrumSync(intensities: number[], windowSize: number): number[] {
  const smoothed: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);
  
  for (let i = 0; i < intensities.length; i++) {
    let sum = 0;
    let count = 0;
    
    for (let j = Math.max(0, i - halfWindow); j <= Math.min(intensities.length - 1, i + halfWindow); j++) {
      sum += intensities[j];
      count++;
    }
    
    smoothed.push(sum / count);
  }
  
  return smoothed;
}

function calculateVarianceSync(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b) / values.length;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b) / values.length;
}

function calculateCorrelationSync(arr1: number[], arr2: number[]): number {
  const n = Math.min(arr1.length, arr2.length);
  if (n < 2) return 0;
  
  const mean1 = arr1.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
  const mean2 = arr2.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
  
  let numerator = 0;
  let sumSq1 = 0;
  let sumSq2 = 0;
  
  for (let i = 0; i < n; i++) {
    const diff1 = arr1[i] - mean1;
    const diff2 = arr2[i] - mean2;
    numerator += diff1 * diff2;
    sumSq1 += diff1 * diff1;
    sumSq2 += diff2 * diff2;
  }
  
  const denominator = Math.sqrt(sumSq1 * sumSq2);
  return denominator > 0 ? numerator / denominator : 0;
}

function calculateStatisticsSync(values: number[]): any {
  if (values.length === 0) return {};
  
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b) / values.length;
  const variance = calculateVarianceSync(values);
  const stdDev = Math.sqrt(variance);
  
  return {
    mean,
    median: sorted[Math.floor(sorted.length / 2)],
    variance,
    stdDev,
    min: Math.min(...values),
    max: Math.max(...values),
    range: Math.max(...values) - Math.min(...values)
  };
}

// Initialize background processing when this module is imported
if (typeof window !== 'undefined') {
  initializeBackgroundProcessing().catch(console.error);
}