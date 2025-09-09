// TensorFlow.js Initializer for BLURRN v4.5 Performance Enhancement
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface TensorFlowStatus {
  isLoaded: boolean;
  backend: string;
  isWebGPUAvailable: boolean;
  error?: string;
}

export function useTensorFlowInitializer() {
  const [status, setStatus] = useState<TensorFlowStatus>({
    isLoaded: false,
    backend: 'cpu',
    isWebGPUAvailable: false
  });

  useEffect(() => {
    let mounted = true;

    const initializeTensorFlow = async () => {
      try {
        // Dynamically import TensorFlow.js to reduce initial bundle size
        const tf = await import('@tensorflow/tfjs');
        
        if (!mounted) return;

        // Set backend preference: webgl > webgpu > cpu
        let backend = 'cpu';
        let isWebGPUAvailable = false;

        try {
          // Try WebGL first (most compatible)
          if (await tf.setBackend('webgl')) {
            backend = 'webgl';
            console.log('TensorFlow.js: WebGL backend activated');
          }
        } catch (webglError) {
          console.warn('TensorFlow.js: WebGL backend failed, trying CPU', webglError);
        }

        // Check WebGPU availability for future use
        try {
          if ('gpu' in navigator) {
            isWebGPUAvailable = true;
            console.log('TensorFlow.js: WebGPU is available but not activated (experimental)');
          }
        } catch (webgpuError) {
          console.log('TensorFlow.js: WebGPU not available');
        }

        await tf.ready();

        if (mounted) {
          setStatus({
            isLoaded: true,
            backend,
            isWebGPUAvailable,
          });

          toast.success(`Neural acceleration: ${backend.toUpperCase()} ready`, {
            description: `Performance boost ${backend === 'webgl' ? 'high' : 'standard'}`,
            duration: 3000,
          });
        }

      } catch (error) {
        console.error('TensorFlow.js initialization failed:', error);
        
        if (mounted) {
          setStatus(prev => ({
            ...prev,
            error: error instanceof Error ? error.message : 'Unknown error',
          }));

          toast.warning('Neural acceleration unavailable', {
            description: 'Falling back to CPU calculations',
            duration: 5000,
          });
        }
      }
    };

    // Initialize with a slight delay to avoid blocking the main thread
    const timeoutId = setTimeout(initializeTensorFlow, 500);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  return status;
}

// Optional component for debugging TensorFlow status
export function TensorFlowStatus() {
  const status = useTensorFlowInitializer();

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 right-20 bg-card/95 backdrop-blur-md border border-border rounded-lg p-2 text-xs text-card-foreground shadow-lg z-50">
      <div className="space-y-1">
        <div className="font-medium">TensorFlow.js</div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status.isLoaded ? 'bg-green-400' : status.error ? 'bg-red-400' : 'bg-yellow-400'}`} />
          <span>{status.isLoaded ? 'Ready' : status.error ? 'Error' : 'Loading...'}</span>
        </div>
        {status.isLoaded && (
          <>
            <div>Backend: {status.backend.toUpperCase()}</div>
            {status.isWebGPUAvailable && (
              <div className="text-blue-400">WebGPU Available</div>
            )}
          </>
        )}
        {status.error && (
          <div className="text-red-400 text-xs">{status.error}</div>
        )}
      </div>
    </div>
  );
}