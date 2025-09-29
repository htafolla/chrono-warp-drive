import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { deterministicRandom, generateCycle } from '@/lib/deterministicUtils';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  gpuMemory: number;
  adaptiveQuality?: 'high' | 'medium' | 'low';
  targetFPS?: number;
  cpuBenchmark?: number;
}

interface PerformanceMonitorProps {
  isActive: boolean;
}

export function PerformanceMonitor({ isActive }: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    renderTime: 16.67,
    gpuMemory: 0
  });

  useEffect(() => {
    if (!isActive) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;
    let benchmarkInterval: NodeJS.Timeout;
    let cpuResult = 0;

    // Phase 4: Reduce CPU benchmark frequency from continuous to every 5 seconds
    const benchmarkCPU = (): number => {
      const start = performance.now();
      let result = 0;
      // Phase 4: Reduced from 100,000 to 10,000 iterations for better performance
      for (let i = 0; i < 10000; i++) {
        result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
      }
      return performance.now() - start;
    };

    // Run CPU benchmark every 5 seconds instead of every frame
    benchmarkInterval = setInterval(() => {
      cpuResult = benchmarkCPU();
    }, 5000);

    const measurePerformance = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        // Memory usage (approximation)
        const memInfo = (performance as any).memory;
        const memoryUsage = memInfo ? Math.round((memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100) : 0;
        
        // Render time calculation
        const renderTime = 1000 / fps;

        // Phase 4: Adaptive FPS targeting (30fps minimum, 60fps preferred)
        const targetFPS = fps < 25 ? 30 : 60;
        const adaptiveQuality = fps >= 55 ? 'high' : fps >= 30 ? 'medium' : 'low';

        setMetrics(prev => ({
          ...prev,
          fps: Math.min(fps, 60),
          memoryUsage,
          renderTime,
          gpuMemory: deterministicRandom(generateCycle(), 0) * 30 + 10, // Mock GPU memory usage
          adaptiveQuality,
          targetFPS,
          cpuBenchmark: cpuResult
        }));

        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(measurePerformance);
    };

    measurePerformance();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (benchmarkInterval) {
        clearInterval(benchmarkInterval);
      }
    };
  }, [isActive]);

  if (!isActive) return null;

  const getPerformanceStatus = () => {
    if (metrics.fps >= 55) return { status: "Excellent", variant: "default" as const };
    if (metrics.fps >= 45) return { status: "Good", variant: "secondary" as const };
    if (metrics.fps >= 30) return { status: "Fair", variant: "outline" as const };
    return { status: "Poor", variant: "destructive" as const };
  };

  const performanceStatus = getPerformanceStatus();

  return (
    <Card className="cosmic-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Performance Monitor
          <Badge variant={performanceStatus.variant}>
            {performanceStatus.status}
          </Badge>
        </CardTitle>
        <CardDescription>Real-time performance metrics for temporal simulation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Frame Rate</span>
              <span className="font-mono text-sm">{metrics.fps} FPS</span>
            </div>
            <Progress value={(metrics.fps / 60) * 100} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Render Time</span>
              <span className="font-mono text-sm">{metrics.renderTime.toFixed(1)}ms</span>
            </div>
            <Progress value={Math.min((metrics.renderTime / 33.33) * 100, 100)} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Memory Usage</span>
              <span className="font-mono text-sm">{metrics.memoryUsage}%</span>
            </div>
            <Progress value={metrics.memoryUsage} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">GPU Memory</span>
              <span className="font-mono text-sm">{metrics.gpuMemory.toFixed(1)}MB</span>
            </div>
            <Progress value={Math.min(metrics.gpuMemory, 100)} className="h-2" />
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">Phase 4: Enhanced Optimization Status</div>
          <div className="text-sm space-y-1">
            {metrics.fps >= 55 && "✅ Temporal simulation running optimally"}
            {metrics.fps >= 45 && metrics.fps < 55 && "⚡ Good performance - minor optimizations possible"}
            {metrics.fps >= 30 && metrics.fps < 45 && "⚠️ Consider reducing wave plane count or resolution"}
            {metrics.fps < 30 && "🔴 Performance critical - optimization recommended"}
            
            <div className="text-xs mt-2 space-y-1">
              <div>Quality: <span className="font-mono">{metrics.adaptiveQuality || 'unknown'}</span></div>
              <div>Target: <span className="font-mono">{metrics.targetFPS || 60} FPS</span></div>
              {metrics.cpuBenchmark && (
                <div>CPU: <span className="font-mono">{metrics.cpuBenchmark.toFixed(1)}ms</span></div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}