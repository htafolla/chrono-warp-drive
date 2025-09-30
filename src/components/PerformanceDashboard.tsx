// Phase 6: Real-time Performance Dashboard
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Cpu, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceDashboardProps {
  sessionId: string;
  cascadeLevel: number;
  isActive: boolean;
}

interface PerformanceMetric {
  fps: number;
  memory_mb: number;
  vertex_count: number;
  quality_setting: string;
  timestamp: string;
}

export function PerformanceDashboard({ 
  sessionId, 
  cascadeLevel,
  isActive 
}: PerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [avgFPS, setAvgFPS] = useState(0);
  const [avgMemory, setAvgMemory] = useState(0);
  const [performanceStatus, setPerformanceStatus] = useState<'excellent' | 'good' | 'degraded' | 'critical'>('excellent');

  useEffect(() => {
    if (!isActive) return;

    // Load recent metrics
    loadMetrics();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('performance_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'performance_metrics',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const newMetric = payload.new as PerformanceMetric;
          setMetrics(prev => [...prev.slice(-19), newMetric]); // Keep last 20
          updateAverages([...metrics.slice(-19), newMetric]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isActive, sessionId]);

  const loadMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        setMetrics(data.reverse());
        updateAverages(data);
      }
    } catch (error) {
      console.error('[Performance Dashboard] Load error:', error);
    }
  };

  const updateAverages = (data: PerformanceMetric[]) => {
    if (data.length === 0) return;

    const totalFPS = data.reduce((sum, m) => sum + m.fps, 0);
    const totalMemory = data.reduce((sum, m) => sum + m.memory_mb, 0);

    const fps = totalFPS / data.length;
    const memory = totalMemory / data.length;

    setAvgFPS(fps);
    setAvgMemory(memory);

    // Determine performance status
    const targetFPS = cascadeLevel >= 30 ? 90 : 120;
    const targetMemory = 90 + (cascadeLevel - 25) * 30;

    if (fps >= targetFPS && memory <= targetMemory * 1.1) {
      setPerformanceStatus('excellent');
    } else if (fps >= targetFPS * 0.9 && memory <= targetMemory * 1.3) {
      setPerformanceStatus('good');
    } else if (fps >= targetFPS * 0.7 || memory <= targetMemory * 1.5) {
      setPerformanceStatus('degraded');
    } else {
      setPerformanceStatus('critical');
    }
  };

  if (!isActive) return null;

  const getStatusIcon = () => {
    switch (performanceStatus) {
      case 'excellent':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'good':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusVariant = (): "default" | "secondary" | "destructive" => {
    switch (performanceStatus) {
      case 'excellent':
      case 'good':
        return 'default';
      case 'degraded':
        return 'secondary';
      case 'critical':
        return 'destructive';
    }
  };

  const targetFPS = cascadeLevel >= 30 ? 90 : 120;
  const targetMemory = 90 + (cascadeLevel - 25) * 30;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Performance Dashboard
          </div>
          <Badge variant={getStatusVariant()}>
            {performanceStatus.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Real-time Metrics */}
        <div className="grid grid-cols-2 gap-4">
          {/* FPS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Average FPS</span>
              </div>
              {getStatusIcon()}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current:</span>
                <span className={`font-mono ${avgFPS >= targetFPS ? 'text-green-500' : 'text-yellow-500'}`}>
                  {avgFPS.toFixed(0)} / {targetFPS}
                </span>
              </div>
              <Progress 
                value={(avgFPS / targetFPS) * 100} 
                className="h-2"
              />
            </div>
          </div>

          {/* Memory */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                <span className="text-sm font-medium">Memory Usage</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current:</span>
                <span className={`font-mono ${avgMemory <= targetMemory ? 'text-green-500' : 'text-yellow-500'}`}>
                  {avgMemory.toFixed(0)} / {targetMemory}MB
                </span>
              </div>
              <Progress 
                value={(avgMemory / targetMemory) * 100} 
                className="h-2"
              />
            </div>
          </div>
        </div>

        {/* Performance Trend */}
        {metrics.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Performance Trend</div>
            <div className="h-20 flex items-end gap-1">
              {metrics.map((metric, i) => {
                const heightPercent = (metric.fps / targetFPS) * 100;
                const color = metric.fps >= targetFPS ? 'bg-green-500' : 
                             metric.fps >= targetFPS * 0.9 ? 'bg-yellow-500' : 'bg-red-500';
                return (
                  <div 
                    key={i}
                    className={`flex-1 ${color} rounded-t transition-all`}
                    style={{ height: `${Math.min(heightPercent, 100)}%` }}
                    title={`${metric.fps} FPS at ${new Date(metric.timestamp).toLocaleTimeString()}`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Oldest</span>
              <span>Latest</span>
            </div>
          </div>
        )}

        {/* Cascade Info */}
        <div className="pt-4 border-t text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Cascade Level:</span>
              <span className="ml-2 font-mono">n={cascadeLevel}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Data Points:</span>
              <span className="ml-2 font-mono">{metrics.length}/20</span>
            </div>
          </div>
        </div>

        {/* Performance Warnings */}
        {performanceStatus === 'degraded' || performanceStatus === 'critical' ? (
          <div className={`p-3 rounded ${performanceStatus === 'critical' ? 'bg-red-500/10' : 'bg-yellow-500/10'} text-sm`}>
            <div className="font-medium mb-1">Performance Issues Detected</div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              {avgFPS < targetFPS && (
                <li>FPS below target ({avgFPS.toFixed(0)} / {targetFPS})</li>
              )}
              {avgMemory > targetMemory && (
                <li>Memory usage above target ({avgMemory.toFixed(0)} / {targetMemory}MB)</li>
              )}
              {performanceStatus === 'critical' && (
                <li>Consider reducing cascade level or quality settings</li>
              )}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
