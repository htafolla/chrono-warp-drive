import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Zap, TrendingUp } from 'lucide-react';
import { TPTTv4_6Result } from '@/types/blurrn-v4-6';

interface TDFPerformanceMetrics {
  fps: number;
  memoryUsage: number;
  tdfStability: number;
  extremeValueWarnings: string[];
  performanceScore: number;
}

interface TDFPerformanceMonitorProps {
  isActive: boolean;
  tpttV46Result?: TPTTv4_6Result | null;
  currentCycle: number;
}

export function TDFPerformanceMonitor({ 
  isActive, 
  tpttV46Result,
  currentCycle 
}: TDFPerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<TDFPerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    tdfStability: 100,
    extremeValueWarnings: [],
    performanceScore: 100
  });

  useEffect(() => {
    if (!isActive || !tpttV46Result) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const monitorTDFPerformance = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        const tdfValue = tpttV46Result?.v46_components.TDF_value || 0;
        
        // Memory usage approximation
        const memInfo = (performance as any).memory;
        const memoryUsage = memInfo ? Math.round((memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100) : 0;

        // TDF-specific warnings
        const warnings: string[] = [];
        
        // Extreme TDF value warnings
        if (tdfValue > 1e12) {
          warnings.push('TDF > 1e12: Ultra-high temporal displacement detected');
        }
        if (tdfValue > 5e12) {
          warnings.push('TDF > 5e12: Breakthrough range - monitor stability');
        }
        if (currentCycle > 500) {
          warnings.push(`Cycle ${currentCycle}: Extended computation - check performance`);
        }

        // Performance degradation warnings
        if (fps < 30 && tdfValue > 1e11) {
          warnings.push('FPS < 30: TDF calculations impacting frame rate');
        }
        if (memoryUsage > 80 && tdfValue > 1e10) {
          warnings.push('Memory > 80%: TDF computations consuming resources');
        }

        // TDF stability calculation (based on value consistency)
        const tdfStability = Math.max(0, 100 - Math.min(50, (tdfValue / 1e13) * 20));
        
        // Overall performance score
        const fpsScore = Math.min(100, (fps / 60) * 100);
        const memoryScore = Math.max(0, 100 - memoryUsage);
        const performanceScore = Math.round((fpsScore + memoryScore + tdfStability) / 3);

        setMetrics({
          fps,
          memoryUsage,
          tdfStability,
          extremeValueWarnings: warnings,
          performanceScore
        });

        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(monitorTDFPerformance);
    };

    monitorTDFPerformance();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isActive, tpttV46Result, currentCycle]);

  if (!isActive || !tpttV46Result) return null;

  const tdfValue = tpttV46Result.v46_components.TDF_value;
  const getPerformanceColor = () => {
    if (metrics.performanceScore >= 80) return 'text-green-500';
    if (metrics.performanceScore >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          TDF Performance Monitor
          <Badge variant={metrics.performanceScore >= 80 ? 'default' : 'destructive'}>
            Score: {metrics.performanceScore}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Performance Metrics Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">FPS</span>
              <span className={`font-mono text-sm ${metrics.fps < 30 ? 'text-red-500' : 'text-green-500'}`}>
                {metrics.fps}
              </span>
            </div>
            <Progress value={Math.min((metrics.fps / 60) * 100, 100)} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Memory</span>
              <span className={`font-mono text-sm ${metrics.memoryUsage > 80 ? 'text-red-500' : 'text-green-500'}`}>
                {metrics.memoryUsage}%
              </span>
            </div>
            <Progress value={metrics.memoryUsage} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">TDF Stability</span>
              <span className={`font-mono text-sm ${getPerformanceColor()}`}>
                {metrics.tdfStability.toFixed(0)}%
              </span>
            </div>
            <Progress value={metrics.tdfStability} className="h-2" />
          </div>
        </div>

        {/* TDF Value Display */}
        <div className="bg-muted/50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Current TDF Analysis</span>
          </div>
          <div className="text-xs space-y-1">
            <div>TDF Value: <span className="font-mono">{tdfValue.toExponential(3)}</span></div>
            <div>Cycle: <span className="font-mono">{currentCycle}</span></div>
            <div>Status: {tdfValue > 1e12 ? 
              <span className="text-primary font-medium">Breakthrough Range</span> : 
              <span className="text-muted-foreground">Normal Range</span>
            }</div>
          </div>
        </div>

        {/* Warnings Section */}
        {metrics.extremeValueWarnings.length > 0 && (
          <div className="space-y-2">
            {metrics.extremeValueWarnings.map((warning, index) => (
              <Alert key={index} className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {warning}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Performance Recommendations */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
          {metrics.fps < 30 && tdfValue > 1e11 && (
            <div>💡 Recommendation: Consider reducing growth_rate_multiplier or enabling adaptive quality</div>
          )}
          {metrics.performanceScore > 90 && (
            <div>✨ Excellent: System handling TDF calculations optimally</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}