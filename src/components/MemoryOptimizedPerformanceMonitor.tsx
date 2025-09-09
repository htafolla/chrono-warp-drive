// Phase 7: Memory-Optimized Performance Monitor
// Enhanced performance monitoring with memory management integration

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Trash2, Activity, Zap, AlertTriangle } from 'lucide-react';
import { memoryManager } from '@/lib/memoryManager';

interface EnhancedPerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  gpuMemory: number;
  
  // Memory Manager specific metrics
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
  pooledObjectsAvailable: number;
  cacheSize: number;
  threeObjectCount: number;
  lastGCTime: number;
  
  // Performance quality
  adaptiveQuality: 'low' | 'medium' | 'high';
  targetFPS: number;
  cpuBenchmark?: number;
}

interface MemoryOptimizedPerformanceMonitorProps {
  isActive: boolean;
  enableMemoryManagement?: boolean;
}

export function MemoryOptimizedPerformanceMonitor({ 
  isActive,
  enableMemoryManagement = true 
}: MemoryOptimizedPerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<EnhancedPerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    renderTime: 0,
    gpuMemory: 0,
    memoryPressure: 'low',
    pooledObjectsAvailable: 0,
    cacheSize: 0,
    threeObjectCount: 0,
    lastGCTime: 0,
    adaptiveQuality: 'high',
    targetFPS: 60
  });
  
  const [isManualCleanupRunning, setIsManualCleanupRunning] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    let frameId: number;
    let benchmarkInterval: NodeJS.Timeout;

    const measurePerformance = () => {
      const startTime = performance.now();
      
      // Get browser memory info
      const memory = (performance as any).memory;
      const memoryUsage = memory ? 
        (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100 : 0;
      
      // Calculate FPS
      const now = performance.now();
      const fps = 1000 / (now - startTime);
      const clampedFPS = Math.min(Math.max(fps, 1), 120);
      
      // Get memory manager stats
      const memoryStats = enableMemoryManagement ? memoryManager.getMemoryStats() : {
        memoryPressure: 'low' as const,
        pooledObjectsAvailable: 0,
        threeObjectCount: 0,
        lastGCTime: 0
      };
      
      // Adaptive quality based on performance
      let adaptiveQuality: 'low' | 'medium' | 'high' = 'high';
      if (clampedFPS < 30 || memoryUsage > 85) adaptiveQuality = 'low';
      else if (clampedFPS < 45 || memoryUsage > 70) adaptiveQuality = 'medium';
      
      // Target FPS adjustment
      const targetFPS = adaptiveQuality === 'low' ? 30 : 
                       adaptiveQuality === 'medium' ? 45 : 60;
      
      const renderTime = performance.now() - startTime;
      
      // Mock GPU memory (would need WebGL extension in real scenario)
      const gpuMemory = Math.min(memoryUsage * 0.8 + Math.random() * 10, 100);
      
      setMetrics({
        fps: clampedFPS,
        memoryUsage,
        renderTime,
        gpuMemory,
        memoryPressure: memoryStats.memoryPressure,
        pooledObjectsAvailable: memoryStats.pooledObjectsAvailable,
        cacheSize: enableMemoryManagement ? memoryManager.getCacheSize() : 0,
        threeObjectCount: memoryStats.threeObjectCount,
        lastGCTime: memoryStats.lastGCTime,
        adaptiveQuality,
        targetFPS,
        cpuBenchmark: metrics.cpuBenchmark // Keep previous value
      });
      
      frameId = requestAnimationFrame(measurePerformance);
    };
    
    // CPU Benchmark every 10 seconds
    const benchmarkCPU = () => {
      const iterations = 100000;
      const start = performance.now();
      
      // CPU intensive task
      for (let i = 0; i < iterations; i++) {
        Math.sin(Math.sqrt(i * 3.14159));
      }
      
      const duration = performance.now() - start;
      setMetrics(prev => ({ ...prev, cpuBenchmark: duration }));
    };
    
    frameId = requestAnimationFrame(measurePerformance);
    benchmarkInterval = setInterval(benchmarkCPU, 10000);
    
    // Initial benchmark
    benchmarkCPU();

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      if (benchmarkInterval) clearInterval(benchmarkInterval);
    };
  }, [isActive, enableMemoryManagement]);

  const handleForceCleanup = useCallback(async () => {
    if (!enableMemoryManagement) return;
    
    setIsManualCleanupRunning(true);
    
    try {
      memoryManager.forceCleanup();
      
      // Wait a bit for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Manual cleanup failed:', error);
    } finally {
      setIsManualCleanupRunning(false);
    }
  }, [enableMemoryManagement]);

  const getPerformanceStatus = (fps: number, memoryPressure: string) => {
    if (memoryPressure === 'critical' || fps < 20) return { status: 'Critical', variant: 'destructive' as const };
    if (memoryPressure === 'high' || fps < 30) return { status: 'Poor', variant: 'destructive' as const };
    if (memoryPressure === 'medium' || fps < 45) return { status: 'Fair', variant: 'secondary' as const };
    if (fps >= 55) return { status: 'Excellent', variant: 'default' as const };
    return { status: 'Good', variant: 'default' as const };
  };

  const getMemoryPressureColor = (pressure: string) => {
    switch (pressure) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  if (!isActive) return null;

  const performanceStatus = getPerformanceStatus(metrics.fps, metrics.memoryPressure);

  return (
    <Card className="w-full max-w-md bg-card/95 backdrop-blur-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="w-4 h-4" />
          Memory-Optimized Performance Monitor
          <Badge variant={performanceStatus.variant} className="ml-auto">
            {performanceStatus.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Core Performance Metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex justify-between">
              <span>FPS</span>
              <span className="font-mono">{metrics.fps.toFixed(1)}</span>
            </div>
            <Progress value={Math.min((metrics.fps / metrics.targetFPS) * 100, 100)} className="h-1" />
          </div>
          
          <div>
            <div className="flex justify-between">
              <span>Render Time</span>
              <span className="font-mono">{metrics.renderTime.toFixed(1)}ms</span>
            </div>
            <Progress value={Math.min(metrics.renderTime * 2, 100)} className="h-1" />
          </div>
        </div>

        {/* Memory Metrics */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Memory Usage</span>
            <span className="font-mono">{metrics.memoryUsage.toFixed(1)}%</span>
          </div>
          <Progress value={metrics.memoryUsage} className="h-2" />
          
          <div className="flex justify-between text-xs">
            <span className={`flex items-center gap-1 ${getMemoryPressureColor(metrics.memoryPressure)}`}>
              <AlertTriangle className="w-3 h-3" />
              Pressure: {metrics.memoryPressure.toUpperCase()}
            </span>
            <span>Target: &lt;70%</span>
          </div>
        </div>

        {/* Memory Management Stats */}
        {enableMemoryManagement && (
          <div className="border-t border-border pt-3 space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">Memory Management</h4>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span>Pooled Objects</span>
                <span className="font-mono">{metrics.pooledObjectsAvailable}</span>
              </div>
              <div className="flex justify-between">
                <span>Cache Size</span>
                <span className="font-mono">{metrics.cacheSize}</span>
              </div>
            </div>

            <div className="flex justify-between text-xs">
              <span>Quality Level</span>
              <Badge 
                variant={metrics.adaptiveQuality === 'high' ? 'default' : 
                        metrics.adaptiveQuality === 'medium' ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {metrics.adaptiveQuality.toUpperCase()}
              </Badge>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleForceCleanup}
              disabled={isManualCleanupRunning}
              className="w-full h-7 text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              {isManualCleanupRunning ? 'Cleaning...' : 'Force Cleanup'}
            </Button>
          </div>
        )}

        {/* Performance Insights */}
        <div className="border-t border-border pt-3">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            Performance Insights
          </h4>
          
          <div className="text-xs text-muted-foreground space-y-1">
            {metrics.memoryPressure === 'critical' && (
              <p className="text-red-600">• Critical memory pressure - automatic cleanup active</p>
            )}
            {metrics.fps < 30 && (
              <p className="text-orange-600">• Low FPS - consider reducing quality settings</p>
            )}
            {metrics.memoryUsage > 80 && (
              <p className="text-yellow-600">• High memory usage - cleanup recommended</p>
            )}
            {metrics.adaptiveQuality === 'low' && (
              <p className="text-blue-600">• Performance mode active - quality reduced</p>
            )}
            {metrics.fps >= 55 && metrics.memoryUsage < 60 && (
              <p className="text-green-600">• Optimal performance achieved</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}