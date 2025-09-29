import { TPTTv4_6Result } from '@/types/blurrn-v4-6';
import { SpectrumData } from '@/types/sdss';

interface ScenePerformanceMetrics {
  fps: number;
  memoryUsage: number;
  vertexCount: number;
  renderTime: number;
  tdfStability: number;
  extremeValueWarnings: string[];
}

interface EnhancedDebugState {
  temporal: {
    time: number;
    phases: number[];
    isotope: { type: string; factor: number };
    tPTT_value: number;
    phi: number;
    lightWave: number;
  };
  tdfV46?: TPTTv4_6Result;
  spectrum?: SpectrumData;
  scene: {
    activeTab: string;
    qualitySettings: {
      quality: 'low' | 'medium' | 'high';
      particles: boolean;
      shadows: boolean;
    };
    performance: ScenePerformanceMetrics;
    bandCount: number;
    cameraPosition: [number, number, number];
  };
  experiment: {
    sessionId: string;
    startTime: string;
    duration: number;
    breakthroughAchieved: boolean;
    performanceCorrelations: Array<{
      tdfValue: number;
      fps: number;
      correlation: number;
    }>;
  };
}

export class EnhancedDebugExporter {
  private static instance: EnhancedDebugExporter;
  private performanceHistory: Array<{
    timestamp: number;
    tdfValue: number;
    fps: number;
    memoryUsage: number;
  }> = [];

  static getInstance(): EnhancedDebugExporter {
    if (!this.instance) {
      this.instance = new EnhancedDebugExporter();
    }
    return this.instance;
  }

  recordPerformancePoint(tdfValue: number, fps: number, memoryUsage: number) {
    this.performanceHistory.push({
      timestamp: Date.now(),
      tdfValue,
      fps,
      memoryUsage
    });

    // Keep only last 100 points
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }
  }

  calculatePerformanceCorrelations() {
    if (this.performanceHistory.length < 10) return [];

    const correlations: Array<{ tdfValue: number; fps: number; correlation: number }> = [];
    
    // Group by TDF value ranges and calculate average FPS
    const tdfRanges = new Map<number, number[]>();
    
    this.performanceHistory.forEach(point => {
      const tdfRange = Math.floor(point.tdfValue / 1e11) * 1e11;
      if (!tdfRanges.has(tdfRange)) {
        tdfRanges.set(tdfRange, []);
      }
      tdfRanges.get(tdfRange)!.push(point.fps);
    });

    tdfRanges.forEach((fpsValues, tdfValue) => {
      const avgFps = fpsValues.reduce((sum, fps) => sum + fps, 0) / fpsValues.length;
      const correlation = this.calculateCorrelation(fpsValues);
      
      correlations.push({
        tdfValue,
        fps: avgFps,
        correlation
      });
    });

    return correlations.sort((a, b) => a.tdfValue - b.tdfValue);
  }

  private calculateCorrelation(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return variance > 0 ? 1 / (1 + variance) : 1;
  }

  exportEnhancedDebugState(debugState: EnhancedDebugState): string {
    const timestamp = new Date().toISOString();
    const performanceCorrelations = this.calculatePerformanceCorrelations();
    
    const enhancedState = {
      ...debugState,
      experiment: {
        ...debugState.experiment,
        performanceCorrelations
      },
      exportMetadata: {
        exportedAt: timestamp,
        version: '4.6-enhanced',
        performanceHistorySize: this.performanceHistory.length,
        systemInfo: {
          userAgent: navigator.userAgent,
          memory: (performance as any).memory ? {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize,
            limit: (performance as any).memory.jsHeapSizeLimit
          } : 'unavailable',
          concurrency: navigator.hardwareConcurrency || 'unknown'
        }
      },
      analysis: {
        performanceSummary: this.generatePerformanceSummary(debugState.scene.performance),
        tdfAnalysis: this.analyzeTDFPerformance(debugState.tdfV46),
        sceneOptimizationSuggestions: this.generateOptimizationSuggestions(debugState.scene)
      }
    };

    return JSON.stringify(enhancedState, null, 2);
  }

  private generatePerformanceSummary(performance: ScenePerformanceMetrics) {
    return {
      overall: performance.fps >= 60 ? 'excellent' : 
               performance.fps >= 30 ? 'good' : 
               performance.fps >= 15 ? 'fair' : 'poor',
      bottlenecks: [
        ...(performance.fps < 30 ? ['Low FPS'] : []),
        ...(performance.memoryUsage > 500 * 1024 * 1024 ? ['High memory usage'] : []),
        ...(performance.vertexCount > 5000 ? ['High polygon count'] : []),
        ...(performance.renderTime > 16.67 ? ['Slow render time'] : [])
      ],
      stability: performance.tdfStability,
      warnings: performance.extremeValueWarnings
    };
  }

  private analyzeTDFPerformance(tdfV46?: TPTTv4_6Result) {
    if (!tdfV46) return { status: 'no_tdf_data' };

    const tdfValue = tdfV46.v46_components.TDF_value;
    const tau = tdfV46.v46_components.tau;
    const breakthrough = tdfV46.timeShiftMetrics.breakthrough_validated;

    return {
      tdfMagnitude: tdfValue > 1e12 ? 'extreme' : tdfValue > 1e11 ? 'high' : 'normal',
      stability: tau > 0.8 ? 'stable' : tau > 0.5 ? 'moderate' : 'unstable',
      breakthrough: breakthrough,
      performanceImpact: tdfValue > 5e12 ? 'severe' : tdfValue > 1e12 ? 'moderate' : 'minimal',
      recommendations: [
        ...(tdfValue > 5e12 ? ['Consider reducing quality settings'] : []),
        ...(tau < 0.5 ? ['TDF instability detected - monitor tau values'] : []),
        ...(breakthrough ? ['Breakthrough achieved - monitor for performance spikes'] : [])
      ]
    };
  }

  private generateOptimizationSuggestions(scene: any) {
    const suggestions: string[] = [];

    if (scene.performance.fps < 30) {
      suggestions.push('Reduce quality setting to medium or low');
      suggestions.push('Disable particles if not essential');
      suggestions.push('Reduce band count');
    }

    if (scene.performance.vertexCount > 5000) {
      suggestions.push('Use lower polygon geometries');
      suggestions.push('Implement LOD (Level of Detail) system');
    }

    if (scene.performance.memoryUsage > 500 * 1024 * 1024) {
      suggestions.push('Implement geometry disposal');
      suggestions.push('Reduce texture sizes');
      suggestions.push('Use object pooling for particles');
    }

    if (scene.qualitySettings.quality === 'high' && scene.performance.fps < 45) {
      suggestions.push('Auto-adjust quality based on performance');
    }

    return suggestions;
  }

  downloadEnhancedDebugState(debugState: EnhancedDebugState, filename?: string) {
    const debugJson = this.exportEnhancedDebugState(debugState);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalFilename = filename || `blurrn_v46_enhanced_debug_${timestamp}.json`;
    
    const blob = new Blob([debugJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearPerformanceHistory() {
    this.performanceHistory = [];
  }
}

export const enhancedDebugExporter = EnhancedDebugExporter.getInstance();
