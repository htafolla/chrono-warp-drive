import React, { useEffect, useCallback, useRef, useState } from 'react';
import { usePerformanceOptimizer } from '@/contexts/PerformanceContext';

interface AsyncCalculationManagerProps {
  spectrumData: any;
  isActive: boolean;
  onSpectrumProcessed?: (processedSpectrum: any) => void;
  onNeuralDataReady?: (neuralData: any) => void;
}

interface QueueItem {
  id: string;
  type: 'spectrum' | 'neural';
  data: any;
  priority: number;
}

interface CalculationResult {
  processedSpectrum?: any;
  neuralData?: any;
}

export function AsyncCalculationManager({
  spectrumData,
  isActive,
  onSpectrumProcessed,
  onNeuralDataReady
}: AsyncCalculationManagerProps) {
  const performanceOptimizer = usePerformanceOptimizer();
  const [processingQueue, setProcessingQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastProcessTime = useRef(0);
  const processingThrottle = useRef(100); // ms
  const maxQueueSize = 50; // Prevent memory leaks from excessive queuing

  const queueSpectrumProcessing = useCallback((data: number[]) => {
    if (!data || data.length === 0) return;
    
    // Only process if data is large enough to benefit from decimation
    if (data.length > 1000) {
      const item: QueueItem = {
        id: `spectrum_${Date.now()}`,
        type: 'spectrum',
        data,
        priority: 1
      };
      
      setProcessingQueue(prev => {
        // Prevent queue overflow - remove oldest items if queue is full
        const newQueue = prev.length >= maxQueueSize ? prev.slice(1) : prev;
        return [...newQueue, item];
      });
    }
  }, [maxQueueSize]);

  const queueNeuralProcessing = useCallback((spectrum: any) => {
    if (!spectrum) return;
    
    const item: QueueItem = {
      id: `neural_${Date.now()}`,
      type: 'neural',
      data: spectrum,
      priority: 2 // Higher priority for neural processing
    };
    
    setProcessingQueue(prev => {
      // Prevent queue overflow - remove oldest items if queue is full
      const newQueue = prev.length >= maxQueueSize ? prev.slice(1) : prev;
      return [...newQueue, item];
    });
  }, [maxQueueSize]);

  const processQueue = useCallback(async () => {
    if (!performanceOptimizer || !isActive || isProcessing || processingQueue.length === 0) {
      return;
    }

    const now = performance.now();
    
    // Throttle processing to prevent overload - adaptive throttling based on performance
    const quality = performanceOptimizer.getAdaptiveQuality();
    const throttleTime = quality === 'high' ? 50 : quality === 'medium' ? 100 : 200;
    
    if (now - lastProcessTime.current < throttleTime) return;
    lastProcessTime.current = now;

    setIsProcessing(true);

    try {
      // Process highest priority item first
      const sortedQueue = [...processingQueue].sort((a, b) => b.priority - a.priority);
      const item = sortedQueue[0];
      
      if (item.type === 'spectrum' && item.data) {
        const decimated = await performanceOptimizer.decimateForVisualization(item.data, 1000);
        onSpectrumProcessed?.({
          intensities: decimated,
          originalSize: item.data.length,
          decimated: true,
          timestamp: Date.now()
        });
      } else if (item.type === 'neural' && item.data) {
        const neuralData = await performanceOptimizer.preprocessForNeural(item.data);
        onNeuralDataReady?.(neuralData);
      }

      // Remove processed item from queue
      setProcessingQueue(prev => prev.filter(queueItem => queueItem.id !== item.id));
      
    } catch (error) {
      console.warn('AsyncCalculationManager: Processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [performanceOptimizer, isActive, isProcessing, processingQueue, onSpectrumProcessed, onNeuralDataReady]);

  // Queue spectrum processing when data changes
  useEffect(() => {
    if (spectrumData?.intensities && isActive) {
      queueSpectrumProcessing(spectrumData.intensities);
    }
  }, [spectrumData, isActive, queueSpectrumProcessing]);

  // Queue neural processing when spectrum is available
  useEffect(() => {
    if (spectrumData && isActive) {
      queueNeuralProcessing(spectrumData);
    }
  }, [spectrumData, isActive, queueNeuralProcessing]);

  // Process queue periodically
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(processQueue, 200); // Process every 200ms
    return () => clearInterval(interval);
  }, [isActive, processQueue]);

  // Cache cleanup - clear cache periodically to prevent memory leaks
  useEffect(() => {
    if (!performanceOptimizer || !isActive) return;

    const cacheCleanupInterval = setInterval(() => {
      // Let PerformanceOptimizer handle its own cache management
      // We'll just trigger a small operation to keep it active
      if (performanceOptimizer.getAdaptiveQuality) {
        performanceOptimizer.getAdaptiveQuality();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(cacheCleanupInterval);
  }, [performanceOptimizer, isActive]);

  return null; // This is a processing component without UI
}

// Hook for easier integration
export function useAsyncCalculations(spectrumData: any, isActive: boolean) {
  const [processedSpectrum, setProcessedSpectrum] = useState<any>(null);
  const [neuralData, setNeuralData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSpectrumProcessed = useCallback((processed: any) => {
    setProcessedSpectrum(processed);
    setIsProcessing(false);
  }, []);

  const handleNeuralDataReady = useCallback((data: any) => {
    setNeuralData(data);
  }, []);

  const AsyncManager = useCallback(() => (
    <AsyncCalculationManager
      spectrumData={spectrumData}
      isActive={isActive}
      onSpectrumProcessed={handleSpectrumProcessed}
      onNeuralDataReady={handleNeuralDataReady}
    />
  ), [spectrumData, isActive, handleSpectrumProcessed, handleNeuralDataReady]);

  useEffect(() => {
    if (spectrumData) {
      setIsProcessing(true);
    }
  }, [spectrumData]);

  return {
    processedSpectrum,
    neuralData,
    isProcessing,
    AsyncManager
  };
}