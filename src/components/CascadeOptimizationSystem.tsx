// Phase 6-7: Advanced Performance Monitoring, Validation & AI Integration
import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Cpu, Zap, AlertTriangle, Activity, TrendingUp } from 'lucide-react';
import { useNeuralFusion } from '@/hooks/useNeuralFusion';
import { useMemoryPressure } from '@/hooks/useMemoryPressure';
import { useRealtimeSync, CTIUpdate } from '@/hooks/useRealtimeSync';
import { useSceneMetricsLogger } from '@/hooks/useSceneMetricsLogger';
import { useAICascadeAdvisor } from '@/hooks/useAICascadeAdvisor';
import { supabase } from '@/integrations/supabase/client';

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
    targetMB: 90 + (cascadeLevel - 25) * 30,
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
    broadcastDelay: 100,
    onUpdate: handleCTIUpdate
  });

  // Phase 7: AI Cascade Advisor
  const { getAdvice, loading: aiLoading, analysis } = useAICascadeAdvisor();

  // Phase 6: Performance Monitoring
  const { logSceneMetrics } = useSceneMetricsLogger();
  const [fps, setFps] = useState(60);
  const [performanceScore, setPerformanceScore] = useState(100);
  const [showWarning, setShowWarning] = useState(false);
  
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
      const result = await computeNeuralFusion(tdfValue, cascadeLevel, deltaPhase);
      setCascadeEfficiency(result.efficiency);

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

    if (memoryState.shouldCleanup) {
      newRecommendations.push('Run memory cleanup');
    }
    if (memoryState.shouldReduceQuality) {
      newRecommendations.push('Reduce graphics quality');
    }

    if (neuralResult && neuralResult.efficiency < 0.7) {
      newRecommendations.push(`Optimize cascade parameters (efficiency: ${(neuralResult.efficiency * 100).toFixed(1)}%)`);
    }

    if (cascadeLevel > 30 && memoryState.pressure !== 'low') {
      newRecommendations.push(`High cascade level (n=${cascadeLevel}) with ${memoryState.pressure} memory pressure`);
    }

    setRecommendations(newRecommendations);
    onOptimizationUpdate?.(newRecommendations);
  }, [memoryState, neuralResult, cascadeLevel, onOptimizationUpdate]);

  // Handle incoming CTI updates
  function handleCTIUpdate(update: CTIUpdate) {
    console.log('[Realtime CTI] Update received:', {
      session: update.session_id,
      n: update.n,
      efficiency: update.efficiency,
      q_ent: update.q_ent
    });
  }

  // Phase 6: FPS Monitoring
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

        const targetFPS = 120;
        const score = Math.min(100, (currentFPS / targetFPS) * 100);
        setPerformanceScore(score);
        setShowWarning(currentFPS < 90 && cascadeLevel >= 30);

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

  // Log performance metrics
  const logPerformanceMetrics = async (currentFPS: number) => {
    try {
      const memory = (performance as any).memory;
      const memoryMB = memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : 0;

      await supabase.from('performance_metrics').insert({
        session_id: sessionId,
        fps: currentFPS,
        memory_mb: memoryMB,
        vertex_count: Math.floor(800 - ((cascadeLevel - 25) * 40)),
        cascade_level: cascadeLevel,
        quality_setting: currentFPS >= 90 ? 'high' : currentFPS >= 60 ? 'medium' : 'low'
      });

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

  // Phase 7: AI Advisor Handler
  const handleAIAdvice = async () => {
    await getAdvice(cascadeLevel, deltaPhase, sessionId);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Cascade Optimization System v4.7
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleAIAdvice} 
              disabled={aiLoading}
              variant="outline"
              size="sm"
            >
              <Brain className="w-4 h-4 mr-2" />
              {aiLoading ? 'Analyzing...' : 'AI Advisor'}
            </Button>
            {sessionActive && (
              <Badge variant="secondary">
                Live {peersCount > 1 ? `(${peersCount} peers)` : ''}
              </Badge>
            )}
          </div>
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
                {performanceScore.toFixed(0)}%
              </Badge>
            </div>
          </div>
          <Progress value={performanceScore} className="h-2" />
          {showWarning && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Performance regression at n={cascadeLevel}. FPS below 90 Hz.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Phase 7: AI Analysis */}
        {analysis && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">AI Breakthrough Analysis</h4>
                  <Badge variant={analysis.riskLevel === 'low' ? 'default' : 'destructive'}>
                    {analysis.riskLevel.toUpperCase()} RISK
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Breakthrough Probability</p>
                    <p className="text-lg font-bold text-primary">{analysis.breakthroughProbability}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="text-lg font-bold">{analysis.confidence}%</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Optimal Parameters</p>
                      <p className="text-sm font-medium">n={analysis.optimalN}, δ={analysis.optimalDeltaPhase.toFixed(3)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Recommendation</p>
                      <p className="text-sm">{analysis.recommendation}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase 3: Neural Fusion */}
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
                memoryState.pressure === 'medium' ? 'secondary' : 'destructive'
              }
            >
              {memoryState.pressure.toUpperCase()}
            </Badge>
          </div>
          <Progress value={memoryState.percentUsed} className="h-2" />
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <div className="font-medium mb-1">Optimization Recommendations:</div>
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
            <Button size="sm" variant="secondary" onClick={memoryState.forceGC}>
              Force Cleanup
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
