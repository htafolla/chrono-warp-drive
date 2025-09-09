// AsyncCalculationManager - Web Worker Integration for BLURRN v4.5
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { usePerformanceOptimizer } from '@/contexts/PerformanceContext';
import { SpectrumData } from '@/types/sdss';

interface AsyncCalculationManagerProps {
  spectrumData: SpectrumData | null;
  onSpectrumProcessed?: (processedData: any) => void;
  onNeuralProcessed?: (neuralData: any) => void;
  isActive: boolean;
}

interface CalculationResult {
  type: string;
  result: any;
  timestamp: number;
}

export function AsyncCalculationManager({ 
  spectrumData, 
  onSpectrumProcessed, 
  onNeuralProcessed,
  isActive 
}: AsyncCalculationManagerProps) {
  const performanceOptimizer = usePerformanceOptimizer();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const processingQueue = useRef<Array<() => void>>([]);
  const lastProcessTime = useRef(0);

  // Queue spectrum processing
  const queueSpectrumProcessing = useCallback(async () => {
    if (!performanceOptimizer || !spectrumData || !isActive) return;

    const now = performance.now();
    
    // Throttle processing to prevent overload
    if (now - lastProcessTime.current < 100) return;
    lastProcessTime.current = now;

    setIsProcessing(true);

    try {
      // Use PerformanceOptimizer's decimation for large spectra
      if (spectrumData.intensities.length > 1000) {
        const decimatedIntensities = await performanceOptimizer.decimateForVisualization(
          spectrumData.intensities, 
          1000
        );
        
        const decimatedWavelengths = await performanceOptimizer.decimateForVisualization(
          spectrumData.wavelengths, 
          1000
        );

        const processedSpectrum = {
          ...spectrumData,
          intensities: decimatedIntensities,
          wavelengths: decimatedWavelengths,
          originalSize: spectrumData.intensities.length,
          decimated: true
        };

        onSpectrumProcessed?.(processedSpectrum);
      } else {
        onSpectrumProcessed?.(spectrumData);
      }

      setProcessedCount(prev => prev + 1);
    } catch (error) {
      console.error('Spectrum processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [performanceOptimizer, spectrumData, onSpectrumProcessed, isActive]);

  // Queue neural preprocessing
  const queueNeuralProcessing = useCallback(async () => {
    if (!performanceOptimizer || !spectrumData || !isActive) return;

    try {
      const neuralData = await performanceOptimizer.preprocessForNeural(spectrumData);
      onNeuralProcessed?.(neuralData);
    } catch (error) {
      console.error('Neural preprocessing error:', error);
    }
  }, [performanceOptimizer, spectrumData, onNeuralProcessed, isActive]);

  // Process queued calculations based on performance
  const processQueue = useCallback(() => {
    if (!performanceOptimizer || !isActive) return;

    const quality = performanceOptimizer.getAdaptiveQuality();
    const maxConcurrentTasks = quality === 'high' ? 3 : quality === 'medium' ? 2 : 1;

    // Only process if we have good performance
    if (quality !== 'low' && processingQueue.current.length > 0) {
      const tasksToProcess = processingQueue.current.splice(0, maxConcurrentTasks);
      tasksToProcess.forEach(task => task());
    }
  }, [performanceOptimizer, isActive]);

  // Auto-process when spectrum data changes
  useEffect(() => {
    if (spectrumData && isActive) {
      // Add tasks to queue instead of executing immediately
      processingQueue.current.push(queueSpectrumProcessing);
      processingQueue.current.push(queueNeuralProcessing);
    }
  }, [spectrumData, isActive, queueSpectrumProcessing, queueNeuralProcessing]);

  // Process queue on performance changes
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(processQueue, 200); // Check every 200ms
    return () => clearInterval(interval);
  }, [processQueue, isActive]);

  // Clear cache periodically to prevent memory leaks
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      if (performanceOptimizer) {
        const cacheSize = performanceOptimizer.getCacheSize();
        if (cacheSize > 100) { // Clear if cache gets too large
          performanceOptimizer.clearCache();
          console.log('AsyncCalculationManager: Cache cleared to prevent memory leak');
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [performanceOptimizer, isActive]);

  // Render processing status for debugging
  if (process.env.NODE_ENV === 'development' && isActive) {
    return (
      <div className="fixed bottom-20 left-4 bg-card/95 backdrop-blur-md border border-border rounded-lg p-2 text-xs text-card-foreground shadow-lg z-50">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
            <span>Async Manager</span>
          </div>
          <div>Processed: {processedCount}</div>
          <div>Queue: {processingQueue.current.length}</div>
          <div>Cache: {performanceOptimizer?.getCacheSize() || 0}</div>
        </div>
      </div>
    );
  }

  return null;
}

// Hook for easy integration
export function useAsyncCalculations(spectrumData: SpectrumData | null, isActive = true) {
  const [processedSpectrum, setProcessedSpectrum] = useState<any>(null);
  const [neuralData, setNeuralData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSpectrumProcessed = useCallback((data: any) => {
    setProcessedSpectrum(data);
    setIsProcessing(false);
  }, []);

  const handleNeuralProcessed = useCallback((data: any) => {
    setNeuralData(data);
  }, []);

  useEffect(() => {
    if (spectrumData && isActive) {
      setIsProcessing(true);
    }
  }, [spectrumData, isActive]);

  return {
    processedSpectrum,
    neuralData,
    isProcessing,
    AsyncManager: () => (
      <AsyncCalculationManager
        spectrumData={spectrumData}
        onSpectrumProcessed={handleSpectrumProcessed}
        onNeuralProcessed={handleNeuralProcessed}
        isActive={isActive}
      />
    )
  };
}