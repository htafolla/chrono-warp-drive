import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { PerformanceOptimizer } from '@/components/PerformanceOptimizer';

interface PerformanceContextType {
  optimizer: PerformanceOptimizer | null;
  isReady: boolean;
}

const PerformanceContext = createContext<PerformanceContextType>({
  optimizer: null,
  isReady: false,
});

interface PerformanceProviderProps {
  children: ReactNode;
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  const optimizerRef = useRef<PerformanceOptimizer | null>(null);
  const [isReady, setIsReady] = React.useState(false);
  const initializationRef = useRef(false); // Prevent double initialization in StrictMode

  useEffect(() => {
    let isMounted = true;

    const initializeOptimizer = async () => {
      // Prevent multiple initializations in React StrictMode
      if (initializationRef.current) return;
      initializationRef.current = true;

      try {
        if (!optimizerRef.current) {
          optimizerRef.current = PerformanceOptimizer.getInstance();
          await optimizerRef.current.initialize();
          
          if (isMounted) {
            setIsReady(true);
          }
        }
      } catch (error) {
        console.warn('Failed to initialize PerformanceOptimizer:', error);
        if (isMounted) {
          setIsReady(true); // Still set ready to avoid blocking
        }
      }
    };

    initializeOptimizer();

    return () => {
      isMounted = false;
      // Reset initialization flag on cleanup for proper re-mounting
      initializationRef.current = false;
    };
  }, []);

  // Cleanup on unmount - only dispose if this is the last provider
  useEffect(() => {
    return () => {
      // Only dispose the singleton when the app is shutting down
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
          PerformanceOptimizer.disposeInstance();
        });
      }
    };
  }, []);

  return (
    <PerformanceContext.Provider value={{ 
      optimizer: optimizerRef.current, 
      isReady 
    }}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformanceOptimizer(): PerformanceOptimizer | null {
  const context = useContext(PerformanceContext);
  
  if (!context) {
    throw new Error('usePerformanceOptimizer must be used within a PerformanceProvider');
  }

  return context.optimizer;
}

export function usePerformanceReady(): boolean {
  const context = useContext(PerformanceContext);
  
  if (!context) {
    throw new Error('usePerformanceReady must be used within a PerformanceProvider');
  }

  return context.isReady;
}