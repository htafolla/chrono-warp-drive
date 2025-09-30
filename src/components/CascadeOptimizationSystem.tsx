// Phase 6: Advanced Performance Monitoring & Validation
// Integrated FPS tracking, scene logging, and performance validation
import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Cpu, Zap, AlertTriangle, CheckCircle, Activity, TrendingUp } from 'lucide-react';
import { useNeuralFusion } from '@/hooks/useNeuralFusion';
import { useMemoryPressure } from '@/hooks/useMemoryPressure';
import { useRealtimeSync, CTIUpdate } from '@/hooks/useRealtimeSync';
import { useSceneMetricsLogger } from '@/hooks/useSceneMetricsLogger';
import { supabase } from '@/integrations/supabase/client';
import { useFrame } from '@react-three/fiber';

interface CascadeOptimizationSystemProps {
  cascadeLevel: number;
  tdfValue?: number;
  deltaPhase: number;
  sessionId: string;
  onOptimizationUpdate?: (recommendations: string[]) => void;
}

export function CascadeOptimizationSystem({
  cascadeLevel,
  tdfValue = 0,
  deltaPhase,
  sessionId,
  onOptimizationUpdate
}: CascadeOptimizationSystemProps) {
  // Phase 3: Neural Fusion Integration
  const {
    isInitialized: neuralInitialized,
    isComputing: neuralComputing,
    lastResult: neuralResult,
    computeFull: computeNeuralFusion
  } = useNeuralFusion({ enabled: true, autoInitialize: true });

  // Phase 4: Memory Pressure Monitoring
  const memoryState = useMemoryPressure({
    targetMB: 90 + (cascadeLevel - 25) * 30, // 90MB at n=25 → 360MB at n=34
    criticalMB: 450,
    pollInterval: 2000,
    enabled: true
  });

  // Phase 2: Realtime Sync Integration
  const {
    isConnected: realtimeConnected,
    peersCount,
    broadcastUpdate,
    trackPresence
  } = useRealtimeSync({
    sessionId,
    enabled: true,
    broadcastDelay: 100, // 120 FPS compliance (8.33ms per frame)
    onUpdate: handleCTIUpdate
  });

  // Phase 6: Performance Monitoring Integration
  const { logSceneMetrics } = useSceneMetricsLogger();
  const [fps, setFps] = useState(60);
  const [lastFrameTime, setLastFrameTime] = useState(performance.now());
  const [performanceScore, setPerformanceScore] = useState(100);
  
  const [cascadeEfficiency, setCascadeEfficiency] = useState(0);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [sessionActive, setSessionActive] = useState(false);

  // Initialize realtime session
  useEffect(() => {
    if (realtimeConnected && !sessionActive) {
      initializeSession();
    }
  }, [realtimeConnected, sessionActive]);

  const initializeSession = async () => {
    try {
      // Create CTI session in database
      const { error } = await supabase
        .from('cti_sessions')
        .insert({
          session_id: sessionId,
          cascade_level: cascadeLevel,
          tdf_value: tdfValue,
          status: 'active',
          metadata: {
            neural_fusion_enabled: neuralInitialized,
            memory_target_mb: memoryState.usedMB,
            realtime_enabled: realtimeConnected
          }
        });

      if (error) throw error;

      // Track presence
      await trackPresence({
        cascade_level: cascadeLevel,
        neural_active: neuralInitialized
      });

      setSessionActive(true);
    } catch (error) {
      console.error('[Cascade Optimization] Session init error:', error);
    }
  };

  // Phase 3: Neural Fusion Computation
  const runNeuralOptimization = useCallback(async () => {
    if (!neuralInitialized) return;

    try {
      const result = await computeNeuralFusion(
        tdfValue,
        cascadeLevel,
        deltaPhase
      );

      setCascadeEfficiency(result.efficiency);

      // Broadcast CTI update via realtime
      if (realtimeConnected) {
        broadcastUpdate({
          cascade_index: result.cascade_index,
          cti_value: result.q_ent * result.cascade_index,
          q_ent: result.q_ent,
          delta_phase: deltaPhase,
          n: cascadeLevel,
          tdf_value: tdfValue,
          efficiency: result.efficiency
        });

        // Store cascade update in database
        await supabase.from('cascade_updates').insert({
          session_id: sessionId,
          cascade_index: result.cascade_index,
          cti_value: result.q_ent * result.cascade_index,
          q_ent: result.q_ent,
          delta_phase: deltaPhase,
          n: cascadeLevel,
          tdf_value: tdfValue,
          efficiency: result.efficiency
        });
      }
    } catch (error) {
      console.error('[Neural Fusion] Computation error:', error);
    }
  }, [neuralInitialized, tdfValue, cascadeLevel, deltaPhase, realtimeConnected]);

  // Phase 4: Memory & Performance Optimization
  useEffect(() => {
    const newRecommendations: string[] = [];

    // Memory recommendations
    if (memoryState.shouldCleanup) {
      newRecommendations.push('Run memory cleanup');
    }
    if (memoryState.shouldReduceQuality) {
      newRecommendations.push('Reduce graphics quality');
    }

    // Neural recommendations
    if (neuralResult && neuralResult.efficiency < 0.7) {
      newRecommendations.push(`Optimize cascade parameters (efficiency: ${(neuralResult.efficiency * 100).toFixed(1)}%)`);
    }

    // Cascade-level recommendations
    if (cascadeLevel > 30 && memoryState.pressure !== 'low') {
      newRecommendations.push(`High cascade level (n=${cascadeLevel}) with ${memoryState.pressure} memory pressure`);
    }

    setRecommendations(newRecommendations);
    onOptimizationUpdate?.(newRecommendations);
  }, [memoryState, neuralResult, cascadeLevel, onOptimizationUpdate]);

  // Handle incoming CTI updates from other sessions
  function handleCTIUpdate(update: CTIUpdate) {
    console.log('[Realtime CTI] Update received:', {
      session: update.session_id,
      n: update.n,
      efficiency: update.efficiency,
      q_ent: update.q_ent
    });
  }

  // Phase 6: FPS Monitoring & Performance Logging
  useEffect(() => {
    let frameId: number;
    let frameCount = 0;
    const startTime = performance.now();

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      const elapsed = currentTime - startTime;

      if (elapsed >= 1000) {
        const currentFPS = Math.round((frameCount * 1000) / elapsed);
        setFps(currentFPS);

        // Calculate performance score
        const targetFPS = 120;
        const score = Math.min(100, (currentFPS / targetFPS) * 100);
        setPerformanceScore(score);

        // Log to database every 5 seconds
        if (Math.floor(elapsed / 5000) !== Math.floor((elapsed - 1000) / 5000)) {
          logPerformanceMetrics(currentFPS);
        }

        frameCount = 0;
      }

      frameId = requestAnimationFrame(measureFPS);
    };

    frameId = requestAnimationFrame(measureFPS);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [cascadeLevel]);

  // Log performance metrics to database
  const logPerformanceMetrics = async (currentFPS: number) => {
    try {
      const memory = (performance as any).memory;
      const memoryMB = memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : 0;

      await supabase.from('performance_metrics').insert({
        session_id: sessionId,
        fps: currentFPS,
        memory_mb: memoryMB,
        vertex_count: Math.floor(800 - ((cascadeLevel - 25) * 40)), // Cascade-optimized
        cascade_level: cascadeLevel,
        quality_setting: currentFPS >= 90 ? 'high' : currentFPS >= 60 ? 'medium' : 'low'
      });

      // Also log scene metrics
      await logSceneMetrics({
        tdf_value: tdfValue,
        fps: currentFPS,
        memory_usage: memoryMB * 1024 * 1024,
        vertex_count: Math.floor(800 - ((cascadeLevel - 25) * 40)),
        cycle_number: Date.now(),
        breakthrough_validated: false,
        quality_setting: currentFPS >= 90 ? 'high' : currentFPS >= 60 ? 'medium' : 'low',
        particles_enabled: true,
        shadows_enabled: true
      });
    } catch (error) {
      console.error('[Performance Logging] Error:', error);
    }
  };

  // Run neural optimization on cascade changes
  useEffect(() => {
    if (neuralInitialized && tdfValue > 0) {
      runNeuralOptimization();
    }
  }, [cascadeLevel, tdfValue, deltaPhase, neuralInitialized]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Cascade Optimization System
          {sessionActive && (
            <Badge variant="secondary" className="ml-2">
              Live Session {peersCount > 1 ? `(${peersCount} peers)` : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phase 6: Performance Metrics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">Performance</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={fps >= 120 ? 'default' : fps >= 90 ? 'secondary' : 'destructive'}>
                {fps} FPS
              </Badge>
              <Badge variant={performanceScore >= 95 ? 'default' : performanceScore >= 80 ? 'secondary' : 'destructive'}>
                {performanceScore.toFixed(0)}% Score
              </Badge>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target (n={cascadeLevel}):</span>
              <span className="font-mono">{cascadeLevel >= 30 ? '90-120 FPS' : '120+ FPS'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vertices:</span>
              <span className="font-mono">{Math.floor(800 - ((cascadeLevel - 25) * 40))}</span>
            </div>
            <Progress value={performanceScore} className="h-2" />
          </div>
          {fps < 90 && cascadeLevel >= 30 && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Performance regression detected at n={cascadeLevel}. FPS below 90 Hz.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Phase 3: Neural Fusion Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span className="text-sm font-medium">Neural Fusion</span>
            </div>
            <Badge variant={neuralInitialized ? 'default' : 'outline'}>
              {neuralInitialized ? 'Active' : 'Initializing'}
            </Badge>
          </div>
          {neuralResult && (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Q_ent:</span>
                <span className="font-mono">{neuralResult.q_ent.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Efficiency:</span>
                <span className="font-mono">{(neuralResult.efficiency * 100).toFixed(1)}%</span>
              </div>
              <Progress value={neuralResult.efficiency * 100} className="h-2" />
            </div>
          )}
        </div>

        {/* Phase 4: Memory Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              <span className="text-sm font-medium">Memory Pressure</span>
            </div>
            <Badge 
              variant={
                memoryState.pressure === 'low' ? 'default' :
                memoryState.pressure === 'medium' ? 'secondary' :
                memoryState.pressure === 'high' ? 'destructive' : 'destructive'
              }
            >
              {memoryState.pressure.toUpperCase()}
            </Badge>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Used:</span>
              <span className="font-mono">{memoryState.usedMB.toFixed(0)}MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target (n={cascadeLevel}):</span>
              <span className="font-mono">{(90 + (cascadeLevel - 25) * 30).toFixed(0)}MB</span>
            </div>
            <Progress value={memoryState.percentUsed} className="h-2" />
          </div>
        </div>

        {/* Phase 2: Realtime Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">Realtime Sync</span>
            </div>
            <Badge variant={realtimeConnected ? 'default' : 'outline'}>
              {realtimeConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          {realtimeConnected && (
            <div className="text-sm text-muted-foreground">
              Session: {sessionId.slice(0, 8)}... • Peers: {peersCount}
            </div>
          )}
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="space-y-1">
              <div className="font-medium">Optimization Recommendations:</div>
              <ul className="text-sm list-disc list-inside space-y-1">
                {recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={runNeuralOptimization}
            disabled={!neuralInitialized || neuralComputing}
          >
            {neuralComputing ? 'Computing...' : 'Run Neural Optimization'}
          </Button>
          {memoryState.shouldCleanup && (
            <Button
              size="sm"
              variant="secondary"
              onClick={memoryState.forceGC}
            >
              Force Cleanup
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
