// React Hook for Background Processing - Phase 9
import { useEffect, useRef, useCallback } from 'react';
import { BackgroundProcessingManager } from '@/lib/backgroundProcessingManager';

export interface UseBackgroundProcessingReturn {
  processNeuralFusion: (input: any) => Promise<any>;
  processTemporalCalculation: (inputData: any, constants: any) => Promise<any>;
  processMathematicalOperation: (operation: string, values: any) => Promise<any>;
  processSpectrumAnalysis: (data: any) => Promise<any>;
  isInitialized: boolean;
  status: {
    activeWorkers: number;
    queueLength: number;
    activePromises: number;
  };
}

export function useBackgroundProcessing(): UseBackgroundProcessingReturn {
  const managerRef = useRef<BackgroundProcessingManager | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const initializeManager = async () => {
      if (!managerRef.current) {
        managerRef.current = BackgroundProcessingManager.getInstance();
        
        try {
          await managerRef.current.initialize();
          isInitializedRef.current = true;
          console.log('Background processing initialized via hook');
        } catch (error) {
          console.error('Failed to initialize background processing:', error);
          isInitializedRef.current = false;
        }
      }
    };

    initializeManager();

    // Cleanup on unmount
    return () => {
      // Don't dispose here as it's a singleton used across components
    };
  }, []);

  const processNeuralFusion = useCallback(async (input: any) => {
    if (!managerRef.current || !isInitializedRef.current) {
      throw new Error('Background processing not initialized');
    }
    return managerRef.current.processNeuralFusion(input);
  }, []);

  const processTemporalCalculation = useCallback(async (inputData: any, constants: any) => {
    if (!managerRef.current || !isInitializedRef.current) {
      throw new Error('Background processing not initialized');
    }
    return managerRef.current.processTemporalCalculation(inputData, constants);
  }, []);

  const processMathematicalOperation = useCallback(async (operation: string, values: any) => {
    if (!managerRef.current || !isInitializedRef.current) {
      throw new Error('Background processing not initialized');
    }
    return managerRef.current.processMathematicalOperation(operation, values);
  }, []);

  const processSpectrumAnalysis = useCallback(async (data: any) => {
    if (!managerRef.current || !isInitializedRef.current) {
      throw new Error('Background processing not initialized');
    }
    return managerRef.current.processSpectrumAnalysis(data);
  }, []);

  const getStatus = useCallback(() => {
    if (!managerRef.current) {
      return { activeWorkers: 0, queueLength: 0, activePromises: 0 };
    }
    const status = managerRef.current.getStatus();
    return {
      activeWorkers: status.activeWorkers,
      queueLength: status.queueLength,
      activePromises: status.activePromises
    };
  }, []);

  return {
    processNeuralFusion,
    processTemporalCalculation,
    processMathematicalOperation,
    processSpectrumAnalysis,
    isInitialized: isInitializedRef.current,
    status: getStatus()
  };
}

// Performance monitoring hook
export function useBackgroundProcessingPerformance() {
  const executionTimesRef = useRef<number[]>([]);
  const averageExecutionTimeRef = useRef(0);

  const recordExecutionTime = useCallback((executionTime: number) => {
    executionTimesRef.current.push(executionTime);
    
    // Keep only last 100 measurements
    if (executionTimesRef.current.length > 100) {
      executionTimesRef.current.shift();
    }
    
    // Calculate rolling average
    const sum = executionTimesRef.current.reduce((a, b) => a + b, 0);
    averageExecutionTimeRef.current = sum / executionTimesRef.current.length;
  }, []);

  const getPerformanceMetrics = useCallback(() => {
    return {
      averageExecutionTime: averageExecutionTimeRef.current,
      totalTasks: executionTimesRef.current.length,
      recentExecutionTimes: executionTimesRef.current.slice(-10)
    };
  }, []);

  return {
    recordExecutionTime,
    getPerformanceMetrics
  };
}
