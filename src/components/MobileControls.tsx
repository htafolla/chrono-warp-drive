import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Tablet, RotateCcw, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface MobileControlsProps {
  onRotate: (deltaX: number, deltaY: number) => void;
  onZoom: (delta: number) => void;
  onPan: (deltaX: number, deltaY: number) => void;
  isActive: boolean;
}

interface TouchState {
  touches: Touch[];
  lastDistance: number;
  lastCenter: { x: number; y: number };
}

export function MobileControls({ onRotate, onZoom, onPan, isActive }: MobileControlsProps) {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [touchState, setTouchState] = useState<TouchState>({
    touches: [],
    lastDistance: 0,
    lastCenter: { x: 0, y: 0 }
  });
  const [gestureMode, setGestureMode] = useState<'rotate' | 'zoom' | 'pan'>('rotate');

  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      const isTouchDevice = 'ontouchstart' in window;
      
      if (isTouchDevice) {
        if (width < 768) {
          setDeviceType('mobile');
        } else if (width < 1024) {
          setDeviceType('tablet');
        } else {
          setDeviceType('desktop');
        }
      } else {
        setDeviceType('desktop');
      }
    };

    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);
    window.addEventListener('orientationchange', checkDeviceType);

    return () => {
      window.removeEventListener('resize', checkDeviceType);
      window.removeEventListener('orientationchange', checkDeviceType);
    };
  }, []);

  useEffect(() => {
    if (!isActive || deviceType === 'desktop') return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touches = Array.from(e.touches);
      
      if (touches.length === 1) {
        setTouchState(prev => ({
          ...prev,
          touches,
          lastCenter: { x: touches[0].clientX, y: touches[0].clientY }
        }));
      } else if (touches.length === 2) {
        const distance = Math.sqrt(
          Math.pow(touches[1].clientX - touches[0].clientX, 2) +
          Math.pow(touches[1].clientY - touches[0].clientY, 2)
        );
        
        const center = {
          x: (touches[0].clientX + touches[1].clientX) / 2,
          y: (touches[0].clientY + touches[1].clientY) / 2
        };

        setTouchState({
          touches,
          lastDistance: distance,
          lastCenter: center
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touches = Array.from(e.touches);

      if (touches.length === 1 && touchState.touches.length === 1) {
        // Single finger - rotate or pan based on mode
        const deltaX = touches[0].clientX - touchState.lastCenter.x;
        const deltaY = touches[0].clientY - touchState.lastCenter.y;

        if (gestureMode === 'rotate') {
          onRotate(deltaX * 0.01, deltaY * 0.01);
        } else if (gestureMode === 'pan') {
          onPan(deltaX * 0.01, deltaY * 0.01);
        }

        setTouchState(prev => ({
          ...prev,
          lastCenter: { x: touches[0].clientX, y: touches[0].clientY }
        }));
      } else if (touches.length === 2 && touchState.touches.length === 2) {
        // Two finger - zoom and rotate
        const distance = Math.sqrt(
          Math.pow(touches[1].clientX - touches[0].clientX, 2) +
          Math.pow(touches[1].clientY - touches[0].clientY, 2)
        );

        const center = {
          x: (touches[0].clientX + touches[1].clientX) / 2,
          y: (touches[0].clientY + touches[1].clientY) / 2
        };

        // Zoom based on distance change
        if (touchState.lastDistance > 0) {
          const zoomDelta = (distance - touchState.lastDistance) * 0.01;
          onZoom(zoomDelta);
        }

        // Rotate based on center movement
        const deltaX = center.x - touchState.lastCenter.x;
        const deltaY = center.y - touchState.lastCenter.y;
        onRotate(deltaX * 0.005, deltaY * 0.005);

        setTouchState({
          touches,
          lastDistance: distance,
          lastCenter: center
        });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      setTouchState({
        touches: [],
        lastDistance: 0,
        lastCenter: { x: 0, y: 0 }
      });
    };

    // Add touch event listeners to the scene container
    const sceneElement = document.querySelector('[data-testid="temporal-scene"]') || document.body;
    
    sceneElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    sceneElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    sceneElement.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      sceneElement.removeEventListener('touchstart', handleTouchStart);
      sceneElement.removeEventListener('touchmove', handleTouchMove);
      sceneElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isActive, deviceType, touchState, gestureMode, onRotate, onZoom, onPan]);

  if (deviceType === 'desktop') {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle>Mobile Controls</CardTitle>
          <CardDescription>Touch controls available on mobile and tablet devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Use mouse to interact with the temporal scene on desktop devices.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cosmic-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Touch Controls
          <Badge variant="outline">
            {deviceType === 'mobile' ? <Smartphone className="h-3 w-3" /> : <Tablet className="h-3 w-3" />}
            {deviceType}
          </Badge>
        </CardTitle>
        <CardDescription>
          Optimized controls for {deviceType} interaction with temporal visualization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gesture Mode Selection */}
        <div>
          <div className="text-sm font-medium mb-2">Single Touch Gesture</div>
          <div className="flex gap-2">
            <Button
              variant={gestureMode === 'rotate' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGestureMode('rotate')}
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Rotate
            </Button>
            <Button
              variant={gestureMode === 'pan' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGestureMode('pan')}
              className="flex items-center gap-1"
            >
              <Move className="h-3 w-3" />
              Pan
            </Button>
          </div>
        </div>

        {/* Control Instructions */}
        <div className="space-y-3 text-sm">
          <div className="p-3 bg-muted rounded-lg">
            <div className="font-medium mb-1">Touch Gestures</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>• Single finger: {gestureMode === 'rotate' ? 'Rotate scene' : 'Pan view'}</div>
              <div>• Two fingers: Pinch to zoom + rotate</div>
              <div>• Long press: Context menu (future feature)</div>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="font-medium mb-1">Quick Actions</div>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onZoom(0.5)}
                className="flex items-center gap-1"
              >
                <ZoomIn className="h-3 w-3" />
                Zoom In
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onZoom(-0.5)}
                className="flex items-center gap-1"
              >
                <ZoomOut className="h-3 w-3" />
                Zoom Out
              </Button>
            </div>
          </div>
        </div>

        {/* Device Optimization */}
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="text-xs text-primary font-medium flex items-center gap-2">
            <Smartphone className="h-3 w-3" />
            {deviceType === 'mobile' 
              ? 'Mobile Optimized: Reduced particle count for better performance'
              : 'Tablet Optimized: Enhanced touch precision for detailed interaction'
            }
          </div>
        </div>

        {/* Active Touch Feedback */}
        {touchState.touches.length > 0 && (
          <div className="p-2 bg-accent/20 border border-accent/30 rounded">
            <div className="text-xs text-accent">
              Active touches: {touchState.touches.length}
              {touchState.touches.length === 2 && ' (Zoom + Rotate mode)'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}