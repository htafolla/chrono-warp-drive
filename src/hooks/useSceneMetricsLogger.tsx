import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SceneMetrics {
  tdf_value: number;
  fps: number;
  memory_usage: number;
  vertex_count: number;
  cycle_number: number;
  breakthrough_validated: boolean;
  quality_setting: 'low' | 'medium' | 'high';
  particles_enabled: boolean;
  shadows_enabled: boolean;
}

export function useSceneMetricsLogger() {
  const logSceneMetrics = useCallback(async (metrics: SceneMetrics) => {
    try {
      // Generate session ID for grouping related metrics
      const sessionId = `scene_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Detect performance warnings
      const warnings: string[] = [];
      if (metrics.fps < 30) warnings.push('Low FPS detected');
      if (metrics.memory_usage > 500 * 1024 * 1024) warnings.push('High memory usage');
      if (metrics.tdf_value > 1e12) warnings.push('Extreme TDF values');
      if (metrics.vertex_count > 5000) warnings.push('High polygon count');
      
      // Attempt to log to Supabase backend
      const { error } = await supabase.from('scene_performance_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        tdf_value: metrics.tdf_value,
        fps: metrics.fps,
        memory_usage: metrics.memory_usage,
        vertex_count: metrics.vertex_count,
        cycle_number: metrics.cycle_number,
        breakthrough_validated: metrics.breakthrough_validated,
        quality_setting: metrics.quality_setting,
        particles_enabled: metrics.particles_enabled,
        shadows_enabled: metrics.shadows_enabled,
        session_id: sessionId,
        performance_warnings: warnings
      });
      
      if (error) {
        console.warn('Failed to log to backend, using client-side fallback:', error);
        
        // Client-side fallback - store in localStorage
        const fallbackData = {
          timestamp: new Date().toISOString(),
          metrics,
          warnings,
          sessionId
        };
        
        const existingLogs = JSON.parse(localStorage.getItem('scene_metrics_fallback') || '[]');
        existingLogs.push(fallbackData);
        
        // Keep only last 100 entries to prevent storage bloat
        if (existingLogs.length > 100) {
          existingLogs.splice(0, existingLogs.length - 100);
        }
        
        localStorage.setItem('scene_metrics_fallback', JSON.stringify(existingLogs));
      }
      
    } catch (error) {
      console.error('Scene metrics logging failed:', error);
      
      // Emergency fallback - just log to console for debugging
      console.log('Scene Metrics:', {
        TDF: metrics.tdf_value.toExponential(2),
        FPS: metrics.fps,
        Memory: `${(metrics.memory_usage / 1024 / 1024).toFixed(1)}MB`,
        Vertices: metrics.vertex_count,
        Cycle: metrics.cycle_number,
        Quality: metrics.quality_setting,
        Breakthrough: metrics.breakthrough_validated
      });
    }
  }, []);

  const exportFallbackMetrics = useCallback(() => {
    const fallbackData = localStorage.getItem('scene_metrics_fallback');
    if (fallbackData) {
      const blob = new Blob([fallbackData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scene_metrics_fallback_${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, []);

  const clearFallbackMetrics = useCallback(() => {
    localStorage.removeItem('scene_metrics_fallback');
  }, []);

  return {
    logSceneMetrics,
    exportFallbackMetrics,
    clearFallbackMetrics
  };
}
