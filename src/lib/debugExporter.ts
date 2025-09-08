// BLURRN Debug State Exporter
// Comprehensive state dump for AI debugging assistance

import { SpectrumData, TPTTv4Result, NeuralOutput } from '@/types/sdss';
import { Isotope } from './temporalCalculator';

export interface DebugState {
  timestamp: string;
  version: string;
  systemStatus: {
    isV4Initialized: boolean;
    systemStatusMessage: string;
    errors: string[];
    warnings: string[];
  };
  engineConstants: {
    PHI: number;
    FREQ: number;
    C: number;
    DELTA_T: number;
    PHASE_UPDATE_FACTOR: number;
    L: number;
  };
  temporalState: {
    time: number;
    phases: number[];
    fractalToggle: boolean;
    timeline: number;
    isotope: Isotope;
    cycle: number;
    e_t: number;
    phi: number;
    delta_t: number;
    tPTT_value: number;
    lightWave: number;
    rippel: string;
    waves: number[];
  };
  calculationBreakdown: {
    T_c: number;
    P_s: number;
    E_t: number;
    v4Components?: {
      W_c: number;
      C_m: number;
      K_l: number;
      F_r: number;
      S_l: number;
      Syn_c: number;
      Q_e: number;
      Sp_g: number;
      N_s: number;
      G_r: number;
    };
    tPTTFormula: string;
    intermediateSteps: any;
  };
  spectrumAnalysis: {
    fullSpectrumData: SpectrumData | null;
    wavelengthRange: { min: number; max: number; count: number };
    intensityStats: { min: number; max: number; mean: number; variance: number };
    granularity: number;
    spectralBands: any[];
  };
  neuralFusionDetails: {
    isActive: boolean;
    modelInfo?: {
      inputShape: number[];
      layerCount: number;
      parameters: number;
    };
    synapticSequence: string;
    neuralSpectra: number[];
    metamorphosisIndex: number;
    confidenceScore: number;
  };
  performance: {
    frameRate: number;
    memoryUsage?: number;
    renderTime: number;
    calculationTime: number;
  };
  browserInfo: {
    userAgent: string;
    webglSupport: boolean;
    tensorflowReady: boolean;
  };
  consoleLogs: {
    errors: string[];
    warnings: string[];
    info: string[];
  };
}

export class DebugExporter {
  private static logs: { level: string; message: string; timestamp: number }[] = [];
  
  static initialize() {
    // Capture console logs
    const originalConsole = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      log: console.log
    };

    console.error = (...args) => {
      this.logs.push({ level: 'error', message: args.join(' '), timestamp: Date.now() });
      originalConsole.error(...args);
    };

    console.warn = (...args) => {
      this.logs.push({ level: 'warn', message: args.join(' '), timestamp: Date.now() });
      originalConsole.warn(...args);
    };

    console.info = (...args) => {
      this.logs.push({ level: 'info', message: args.join(' '), timestamp: Date.now() });
      originalConsole.info(...args);
    };
  }

  static captureDebugState(appState: any): DebugState {
    const startTime = performance.now();
    
    // Import constants for debugging
    const { PHI, FREQ, C, DELTA_T, PHASE_UPDATE_FACTOR } = appState.constants || {
      PHI: 1.666, FREQ: 528, C: 3e8, DELTA_T: 1e-6, PHASE_UPDATE_FACTOR: 0.016
    };

    const debugState: DebugState = {
      timestamp: new Date().toISOString(),
      version: "BLURRN v4.5",
      systemStatus: {
        isV4Initialized: appState.isV4Initialized || false,
        systemStatusMessage: appState.systemStatus || "Unknown",
        errors: this.logs.filter(l => l.level === 'error').map(l => l.message),
        warnings: this.logs.filter(l => l.level === 'warn').map(l => l.message)
      },
      engineConstants: {
        PHI,
        FREQ,
        C,
        DELTA_T,
        PHASE_UPDATE_FACTOR,
        L: 3 // Trinity constant
      },
      temporalState: {
        time: appState.time || 0,
        phases: appState.phases || [0, 0, 0],
        fractalToggle: appState.fractalToggle || false,
        timeline: appState.timeline || 0,
        isotope: appState.isotope || { type: "C-12", factor: 1.0 },
        cycle: appState.cycle || 0,
        e_t: appState.e_t || 0.5,
        phi: appState.phi || 1.666,
        delta_t: appState.delta_t || 1e-6,
        tPTT_value: appState.tPTT_value || 0,
        lightWave: appState.lightWave || 0,
        rippel: appState.rippel || "",
        waves: appState.waves || []
      },
      calculationBreakdown: {
        T_c: appState.T_c || 0,
        P_s: appState.P_s || 0,
        E_t: appState.e_t || 0,
        v4Components: appState.tpttV4Result?.components || undefined,
        tPTTFormula: appState.isV4Initialized 
          ? "T_c * (P_s/E_t) * φ * (c/Δt) * W_c * C_m * K_l * F_r * S_l * Syn_c * Q_e * Sp_g * N_s * G_r"
          : "tPTT = T_c * (P_s / E_t) * φ / Δt",
        intermediateSteps: {
          kuramoto_phases: appState.phases,
          wave_calculations: appState.waves,
          spectral_analysis: appState.spectrumData ? "SDSS Real Data" : "Synthetic Data"
        }
      },
      spectrumAnalysis: {
        fullSpectrumData: appState.spectrumData || null,
        wavelengthRange: appState.spectrumData ? {
          min: Math.min(...appState.spectrumData.wavelengths),
          max: Math.max(...appState.spectrumData.wavelengths),
          count: appState.spectrumData.wavelengths.length
        } : { min: 0, max: 0, count: 0 },
        intensityStats: appState.spectrumData ? this.calculateStats(appState.spectrumData.intensities) : {
          min: 0, max: 0, mean: 0, variance: 0
        },
        granularity: appState.spectrumData?.granularity || 1.0,
        spectralBands: appState.spectralBands || []
      },
      neuralFusionDetails: {
        isActive: !!(appState.tpttV4Result?.neuralOutput),
        modelInfo: appState.neuralModelInfo || undefined,
        synapticSequence: appState.tpttV4Result?.neuralOutput?.synapticSequence || "",
        neuralSpectra: appState.tpttV4Result?.neuralOutput?.neuralSpectra || [],
        metamorphosisIndex: appState.tpttV4Result?.neuralOutput?.metamorphosisIndex || 0,
        confidenceScore: appState.tpttV4Result?.neuralOutput?.confidenceScore || 0
      },
      performance: {
        frameRate: this.calculateFrameRate(),
        memoryUsage: (performance as any).memory?.usedJSHeapSize || undefined,
        renderTime: performance.now(),
        calculationTime: performance.now() - startTime
      },
      browserInfo: {
        userAgent: navigator.userAgent,
        webglSupport: this.checkWebGLSupport(),
        tensorflowReady: this.checkTensorFlowReady()
      },
      consoleLogs: {
        errors: this.logs.filter(l => l.level === 'error').slice(-10).map(l => l.message),
        warnings: this.logs.filter(l => l.level === 'warn').slice(-10).map(l => l.message),
        info: this.logs.filter(l => l.level === 'info').slice(-10).map(l => l.message)
      }
    };

    return debugState;
  }

  static exportDebugJSON(appState: any): string {
    const debugState = this.captureDebugState(appState);
    return JSON.stringify(debugState, null, 2);
  }

  static exportDebugSummary(appState: any): string {
    const debug = this.captureDebugState(appState);
    
    return `# BLURRN Debug Report
Generated: ${debug.timestamp}

## System Status
- Version: ${debug.version}
- v4.5 Initialized: ${debug.systemStatus.isV4Initialized}
- Status: ${debug.systemStatus.systemStatusMessage}
- Errors: ${debug.systemStatus.errors.length}
- Warnings: ${debug.systemStatus.warnings.length}

## Engine Constants
- PHI (Trinitarium): ${debug.engineConstants.PHI}
- FREQ (Core): ${debug.engineConstants.FREQ} Hz
- C (Light Speed): ${debug.engineConstants.C} m/s
- DELTA_T: ${debug.engineConstants.DELTA_T}
- L (Trinity): ${debug.engineConstants.L}

## Temporal Engine
- Time: ${debug.temporalState.time.toFixed(2)}
- Phases: [${debug.temporalState.phases.map(p => p.toFixed(2)).join(', ')}]
- tPTT Value: ${debug.temporalState.tPTT_value.toFixed(2)}
- E_t: ${debug.temporalState.e_t.toFixed(3)}
- Isotope: ${debug.temporalState.isotope.type}
- Cycle: ${debug.temporalState.cycle}
- Light Wave: ${debug.temporalState.lightWave.toFixed(3)}

## Calculation Formula
${debug.calculationBreakdown.tPTTFormula}

## v4.5 Component Values
${debug.calculationBreakdown.v4Components ? `
- T_c: ${debug.calculationBreakdown.T_c.toFixed(3)}
- P_s: ${debug.calculationBreakdown.P_s.toFixed(3)}
- E_t: ${debug.calculationBreakdown.E_t.toFixed(3)}
- W_c: ${debug.calculationBreakdown.v4Components.W_c}
- C_m: ${debug.calculationBreakdown.v4Components.C_m}
- K_l: ${debug.calculationBreakdown.v4Components.K_l}
- F_r: ${debug.calculationBreakdown.v4Components.F_r}
- S_l: ${debug.calculationBreakdown.v4Components.S_l}
- Syn_c: ${debug.calculationBreakdown.v4Components.Syn_c}
- Q_e: ${debug.calculationBreakdown.v4Components.Q_e}
- Sp_g: ${debug.calculationBreakdown.v4Components.Sp_g}
- N_s: ${debug.calculationBreakdown.v4Components.N_s}
- G_r: ${debug.calculationBreakdown.v4Components.G_r}` : 'Legacy v3.6 Mode'}

## Spectrum Analysis
- Data Source: ${debug.spectrumAnalysis.fullSpectrumData?.source || 'SYNTHETIC'}
- Wavelength Range: ${debug.spectrumAnalysis.wavelengthRange.min.toFixed(1)} - ${debug.spectrumAnalysis.wavelengthRange.max.toFixed(1)} Å
- Data Points: ${debug.spectrumAnalysis.wavelengthRange.count}
- Granularity: ${debug.spectrumAnalysis.granularity.toFixed(2)} Å/pixel
- Intensity Stats: min=${debug.spectrumAnalysis.intensityStats.min.toFixed(2)}, max=${debug.spectrumAnalysis.intensityStats.max.toFixed(2)}, mean=${debug.spectrumAnalysis.intensityStats.mean.toFixed(2)}

## Neural Fusion
- Status: ${debug.neuralFusionDetails.isActive ? 'Active' : 'Inactive'}
- Synaptic Sequence: ${debug.neuralFusionDetails.synapticSequence}
- Metamorphosis Index: ${(debug.neuralFusionDetails.metamorphosisIndex * 100).toFixed(1)}%
- Confidence Score: ${(debug.neuralFusionDetails.confidenceScore * 100).toFixed(1)}%
- Neural Spectra Points: ${debug.neuralFusionDetails.neuralSpectra.length}

## Performance
- Frame Rate: ${debug.performance.frameRate} FPS
- Memory: ${debug.performance.memoryUsage ? (debug.performance.memoryUsage / 1024 / 1024).toFixed(1) + ' MB' : 'N/A'}
- Calculation Time: ${debug.performance.calculationTime.toFixed(2)}ms

## Browser Environment
- WebGL: ${debug.browserInfo.webglSupport ? 'Supported' : 'Not Available'}
- TensorFlow: ${debug.browserInfo.tensorflowReady ? 'Ready' : 'Not Ready'}

## Recent Issues
${debug.systemStatus.errors.length > 0 ? '### Errors:\n' + debug.systemStatus.errors.map(e => `- ${e}`).join('\n') : 'No errors'}
${debug.systemStatus.warnings.length > 0 ? '\n### Warnings:\n' + debug.systemStatus.warnings.slice(-5).map(w => `- ${w}`).join('\n') : ''}

## Complete Calculation Data
${JSON.stringify(debug.calculationBreakdown.v4Components || {}, null, 2)}

## Full Spectrum Data Summary
${debug.spectrumAnalysis.fullSpectrumData ? `Points: ${debug.spectrumAnalysis.fullSpectrumData.wavelengths.length}, Source: ${debug.spectrumAnalysis.fullSpectrumData.source}` : 'No spectrum data available'}
`;
  }

  private static frameCount = 0;
  private static lastFrameTime = performance.now();

  private static calculateFrameRate(): number {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFrameTime >= 1000) {
      const fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
      return fps;
    }
    return 60; // Default assumption
  }

  private static checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  private static checkTensorFlowReady(): boolean {
    return typeof window !== 'undefined' && !!(window as any).tf;
  }

  private static calculateStats(values: number[]): { min: number; max: number; mean: number; variance: number } {
    if (values.length === 0) return { min: 0, max: 0, mean: 0, variance: 0 };
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return { min, max, mean, variance };
  }

  static downloadDebugReport(appState: any, format: 'json' | 'summary' = 'summary') {
    const content = format === 'json' 
      ? this.exportDebugJSON(appState)
      : this.exportDebugSummary(appState);
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blurrn-debug-${Date.now()}.${format === 'json' ? 'json' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Initialize debug capture on module load
DebugExporter.initialize();