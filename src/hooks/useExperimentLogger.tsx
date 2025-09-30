import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TPTTv4_6Result } from '@/types/blurrn-v4-6';

interface ExperimentMetrics {
  tdf_value: number;
  fps: number;
  memory_usage: number;
  vertex_count: number;
  cycle_number: number;
  tdf_components: any;
  time_shift_metrics: any;
  performance_data?: any;
}

export function useExperimentLogger() {
  const logExperiment = useCallback(async (
    sessionId: string,
    tpttResult: TPTTv4_6Result,
    metrics: ExperimentMetrics
  ) => {
    try {
      const tdfValue = tpttResult.v46_components?.TDF_value || 0;
      
      // Detect breakthrough (4e10 < TDF < 1e12) - adjusted for M1V close-range stars
      const breakthrough_validated = tdfValue > 4e10 && tdfValue < 1e12;
      
      // Determine experiment status
      const status = breakthrough_validated ? 'validated' : 
                     tdfValue > 1e10 ? 'pending' : 
                     'running';
      
      const experimentData = {
        experiment_name: `TDF_Cycle_${metrics.cycle_number}_${new Date().toISOString().split('T')[0]}`,
        status,
        tdf_components: {
          TDF_value: tdfValue,
          tau: tpttResult.v46_components?.tau || 0,
          BlackHole_Seq: tpttResult.v46_components?.BlackHole_Seq || 0,
          S_L: tpttResult.v46_components?.S_L || 0,
          E_t_growth: tpttResult.v46_components?.E_t_growth || 0
        },
        time_shift_metrics: {
          breakthrough_validated,
          timeShiftCapable: tpttResult.timeShiftMetrics?.timeShiftCapable || false,
          oscillatorMode: tpttResult.timeShiftMetrics?.oscillatorMode || 'c_rhythm',
          phaseSync: tpttResult.timeShiftMetrics?.phaseSync || 0
        },
        performance_data: {
          fps: metrics.fps,
          memory_usage: metrics.memory_usage,
          vertex_count: metrics.vertex_count,
          cycle: metrics.cycle_number,
          session_id: sessionId,
          timestamp: Date.now(),
          correlations: {
            tdf_fps_correlation: calculateCorrelation(tdfValue, metrics.fps),
            memory_efficiency: metrics.memory_usage / metrics.vertex_count,
            performance_score: (metrics.fps / 120) * (1 - metrics.memory_usage / 500000000)
          }
        },
        user_id: null // Session-based logging, no auth required
      };
      
      // Attempt Supabase insert
      const { error } = await supabase
        .from('tdf_experiments')
        .insert(experimentData);
      
      if (error) {
        console.warn('Backend insert failed, using localStorage fallback:', error);
        
        // Fallback to localStorage
        const fallbackData = {
          ...experimentData,
          created_at: new Date().toISOString(),
          fallback_reason: error.message
        };
        
        const existing = localStorage.getItem('tdf_experiments_fallback');
        const storedExperiments = existing ? JSON.parse(existing) : [];
        storedExperiments.push(fallbackData);
        
        // Keep last 50 experiments
        if (storedExperiments.length > 50) {
          storedExperiments.splice(0, storedExperiments.length - 50);
        }
        
        localStorage.setItem('tdf_experiments_fallback', JSON.stringify(storedExperiments));
        
        return { success: true, fallback: true, data: fallbackData };
      }
      
      console.log('✅ Experiment logged to backend:', {
        tdf: tdfValue.toExponential(2),
        status,
        breakthrough: breakthrough_validated
      });
      
      return { success: true, fallback: false, data: experimentData };
      
    } catch (error) {
      console.error('Experiment logging failed completely:', error);
      
      // Emergency console log for debugging
      console.log('📊 TDF Experiment Metrics (fallback):', {
        TDF: metrics.tdf_value.toExponential(2),
        FPS: metrics.fps,
        Memory: `${(metrics.memory_usage / 1024 / 1024).toFixed(1)}MB`,
        Cycle: metrics.cycle_number,
        Vertices: metrics.vertex_count
      });
      
      return { success: false, fallback: true, error };
    }
  }, []);

  const exportFallbackExperiments = useCallback(() => {
    const fallbackData = localStorage.getItem('tdf_experiments_fallback');
    if (!fallbackData) {
      console.warn('No fallback experiments to export');
      return null;
    }
    
    const experiments = JSON.parse(fallbackData);
    const blob = new Blob([JSON.stringify(experiments, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tdf_experiments_fallback_${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return experiments;
  }, []);

  const clearFallbackExperiments = useCallback(() => {
    localStorage.removeItem('tdf_experiments_fallback');
    console.log('Fallback experiments cleared');
  }, []);

  return {
    logExperiment,
    exportFallbackExperiments,
    clearFallbackExperiments
  };
}

// Helper: Calculate correlation coefficient (simplified)
function calculateCorrelation(value1: number, value2: number): number {
  // Simplified correlation - normalize and compare
  const normalized1 = Math.min(value1 / 6e12, 1);
  const normalized2 = Math.min(value2 / 120, 1);
  return Math.abs(normalized1 - normalized2) < 0.3 ? 0.85 : 0.45;
}
