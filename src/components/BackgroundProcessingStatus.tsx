// Background Processing Status Display - Phase 9
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useBackgroundProcessing, useBackgroundProcessingPerformance } from '@/hooks/useBackgroundProcessing';
import { Activity, Cpu, Clock, Zap } from 'lucide-react';

interface BackgroundProcessingStatusProps {
  className?: string;
}

export function BackgroundProcessingStatus({ className = '' }: BackgroundProcessingStatusProps) {
  const { isInitialized, status } = useBackgroundProcessing();
  const { getPerformanceMetrics } = useBackgroundProcessingPerformance();
  
  const performanceMetrics = getPerformanceMetrics();
  const utilizationPercentage = Math.min((status.activePromises / Math.max(status.activeWorkers, 1)) * 100, 100);

  return (
    <Card className={`${className} border-primary/20`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Cpu className="h-4 w-4 text-primary" />
          Background Processing
          <Badge variant={isInitialized ? 'default' : 'secondary'} className="ml-auto">
            {isInitialized ? 'Active' : 'Offline'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Worker Status */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Workers:</span>
            <span className="font-mono">{status.activeWorkers}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Queue:</span>
            <span className="font-mono">{status.queueLength}</span>
          </div>
        </div>

        {/* Utilization */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Utilization</span>
            <span className="font-mono">{utilizationPercentage.toFixed(1)}%</span>
          </div>
          <Progress 
            value={utilizationPercentage} 
            className="h-2"
          />
        </div>

        {/* Performance Metrics */}
        {performanceMetrics.totalTasks > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Avg Time:</span>
              <span className="font-mono">
                {performanceMetrics.averageExecutionTime.toFixed(1)}ms
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Total Tasks: {performanceMetrics.totalTasks}
            </div>
          </div>
        )}

        {/* Active Processes */}
        {status.activePromises > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-muted-foreground">
                {status.activePromises} active process{status.activePromises !== 1 ? 'es' : ''}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}