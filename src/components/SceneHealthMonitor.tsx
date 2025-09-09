import React, { useEffect, useState } from 'react';
import { useBackgroundProcessing } from '@/hooks/useBackgroundProcessing';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface SceneHealthMonitorProps {
  onReset?: () => void;
}

export function SceneHealthMonitor({ onReset }: SceneHealthMonitorProps) {
  const { isInitialized, status } = useBackgroundProcessing();
  const [renderHealth, setRenderHealth] = useState<'healthy' | 'degraded' | 'critical'>('healthy');
  const [lastRenderCheck, setLastRenderCheck] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastCheck = now - lastRenderCheck;
      
      // Check if rendering has stopped (no updates for 5 seconds)
      if (timeSinceLastCheck > 5000) {
        setRenderHealth('critical');
      } else if (timeSinceLastCheck > 2000) {
        setRenderHealth('degraded');
      } else {
        setRenderHealth('healthy');
      }
      
      setLastRenderCheck(now);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastRenderCheck]);

  const handleReset = () => {
    console.log('[SCENE HEALTH] Manual scene reset triggered');
    setRenderHealth('healthy');
    setLastRenderCheck(Date.now());
    onReset?.();
  };

  if (renderHealth === 'healthy' && isInitialized) {
    return null;
  }

  return (
    <div className="absolute top-20 left-4 max-w-md">
      {!isInitialized && (
        <Alert className="mb-2">
          <AlertDescription>
            Background processing is initializing...
          </AlertDescription>
        </Alert>
      )}
      
      {renderHealth !== 'healthy' && (
        <Alert variant={renderHealth === 'critical' ? 'destructive' : 'default'} className="mb-2">
          <AlertDescription className="flex items-center justify-between">
            <span>
              {renderHealth === 'critical' 
                ? 'Rendering appears frozen' 
                : 'Rendering performance degraded'}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset}
              className="ml-2"
            >
              Reset
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}