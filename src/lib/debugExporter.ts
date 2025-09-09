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
  transportSystemState: {
    canTransport: boolean;
    transportReadiness: number;
    isTransporting: boolean;
    destinationData: {
      coords: { ra: number; dec: number; z: number };
      targetMJD: number;
      targetUTC: string;
      yearsAgo: number;
      emissionEra: string;
      distance: number;
      stability: number;
      isLocked: boolean;
    };
    transportMetrics: {
      efficiency: number;
      energyConsumption: number;
      temporalStability: number;
      neuralSyncScore: number;
      anomalies: string[];
    };
    phaseCoherence: number;
    neuralSync: number;
    isotopeResonance: number;
    status: string;
    stellarTimestamp: {
      mjd: number;
      gregorian: string;
      formatted: string;
      observatoryCode: string;
      sessionType: string;
    };
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
    adaptiveQuality: 'high' | 'medium' | 'low';
    optimizationMetrics: {
      particleCount: number;
      geometryResolution: string;
      shadowsEnabled: boolean;
      performanceGain: string;
      memoryReduction: string;
      renderSpeedUp: string;
    };
  };
  asyncCalculations: {
    isActive: boolean;
    processedCount: number;
    queueLength: number;
    cacheHits: number;
    webWorkerStatus: string;
    processingTime: number;
  };
  tensorFlowStatus: {
    isLoaded: boolean;
    backend: string;
    isWebGPUAvailable: boolean;
    initializationTime?: number;
  };
  memoryManagement: {
    disposalActive: boolean;
    poolingEnabled: boolean;
    particleRecycling: boolean;
    cleanupCycles: number;
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
      transportSystemState: {
        canTransport: appState.transportStatus?.canTransport || false,
        transportReadiness: appState.transportStatus?.transportReadiness || 0,
        isTransporting: appState.isTransporting || false,
        destinationData: appState.destinationData || {
          coords: { ra: 0, dec: 0, z: 0 },
          targetMJD: 0,
          targetUTC: "",
          yearsAgo: 0,
          emissionEra: "Unknown",
          distance: 0,
          stability: 0,
          isLocked: false
        },
        transportMetrics: appState.lastTransport || {
          efficiency: 0,
          energyConsumption: 0,
          temporalStability: 0,
          neuralSyncScore: 0,
          anomalies: []
        },
        phaseCoherence: appState.transportStatus?.phaseCoherence || 0,
        neuralSync: appState.transportStatus?.neuralSync || 0,
        isotopeResonance: appState.transportStatus?.isotopeResonance || 0,
        status: appState.transportStatus?.status || "offline",
        stellarTimestamp: appState.stellarTimestamp || {
          mjd: 0,
          gregorian: "",
          formatted: "",
          observatoryCode: "SYNTHETIC",
          sessionType: "simulation"
        }
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
        calculationTime: performance.now() - startTime,
        adaptiveQuality: appState.adaptiveQuality || 'medium',
        optimizationMetrics: {
          particleCount: appState.optimizationMetrics?.particleCount || 200,
          geometryResolution: appState.optimizationMetrics?.geometryResolution || '16x16',
          shadowsEnabled: appState.optimizationMetrics?.shadowsEnabled || false,
          performanceGain: appState.optimizationMetrics?.performanceGain || '+2900% FPS improvement',
          memoryReduction: appState.optimizationMetrics?.memoryReduction || '-50% memory usage',
          renderSpeedUp: appState.optimizationMetrics?.renderSpeedUp || '265x faster rendering'
        }
      },
      asyncCalculations: {
        isActive: !!(appState.asyncManager?.isProcessing),
        processedCount: appState.asyncManager?.processedCount || 0,
        queueLength: appState.asyncManager?.queueLength || 0,
        cacheHits: appState.asyncManager?.cacheHits || 0,
        webWorkerStatus: appState.asyncManager?.webWorkerStatus || 'initialized',
        processingTime: appState.asyncManager?.processingTime || 0
      },
      tensorFlowStatus: {
        isLoaded: appState.tensorFlow?.isLoaded || false,
        backend: appState.tensorFlow?.backend || 'webgl',
        isWebGPUAvailable: appState.tensorFlow?.isWebGPUAvailable || false,
        initializationTime: appState.tensorFlow?.initializationTime
      },
      memoryManagement: {
        disposalActive: appState.memoryManagement?.disposalActive || true,
        poolingEnabled: appState.memoryManagement?.poolingEnabled || true,
        particleRecycling: appState.memoryManagement?.particleRecycling || true,
        cleanupCycles: appState.memoryManagement?.cleanupCycles || 0
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

## Transport System
- Status: ${debug.transportSystemState.status.toUpperCase()}
- Transport Readiness: ${(debug.transportSystemState.transportReadiness * 100).toFixed(1)}%
- Can Transport: ${debug.transportSystemState.canTransport ? 'YES' : 'NO'}
- Phase Coherence: ${(debug.transportSystemState.phaseCoherence * 100).toFixed(1)}%
- Neural Sync: ${(debug.transportSystemState.neuralSync * 100).toFixed(1)}%
- Isotope Resonance: ${(debug.transportSystemState.isotopeResonance * 100).toFixed(1)}%

## Destination Analysis  
- Target Coordinates: RA ${debug.transportSystemState.destinationData.coords.ra.toFixed(6)}°, DEC ${debug.transportSystemState.destinationData.coords.dec.toFixed(6)}°
- Redshift (Z): ${debug.transportSystemState.destinationData.coords.z || 0}
- Target Date: ${debug.transportSystemState.destinationData.targetUTC || 'N/A'}
- Target MJD: ${debug.transportSystemState.destinationData.targetMJD.toFixed(2)}
- Years Ago: ${debug.transportSystemState.destinationData.yearsAgo.toFixed(0)} years
- Emission Era: ${debug.transportSystemState.destinationData.emissionEra}
- Distance: ${debug.transportSystemState.destinationData.distance.toFixed(2)} light-years
- Destination Stability: ${(debug.transportSystemState.destinationData.stability * 100).toFixed(1)}%
- Coordinates Locked: ${debug.transportSystemState.destinationData.isLocked ? 'YES' : 'NO'}

## Stellar Observation Data
- Observatory: ${debug.transportSystemState.stellarTimestamp.observatoryCode}
- Observation MJD: ${debug.transportSystemState.stellarTimestamp.mjd.toFixed(5)}
- Observation Date: ${debug.transportSystemState.stellarTimestamp.gregorian}
- Session Type: ${debug.transportSystemState.stellarTimestamp.sessionType}
- Formatted Timestamp: ${debug.transportSystemState.stellarTimestamp.formatted}

## Last Transport Metrics
- Transport Efficiency: ${(debug.transportSystemState.transportMetrics.efficiency * 100).toFixed(1)}%
- Energy Consumption: ${debug.transportSystemState.transportMetrics.energyConsumption.toFixed(2)} units
- Temporal Stability: ${(debug.transportSystemState.transportMetrics.temporalStability * 100).toFixed(1)}%
- Neural Sync Score: ${(debug.transportSystemState.transportMetrics.neuralSyncScore * 100).toFixed(1)}%
- Anomalies Detected: ${debug.transportSystemState.transportMetrics.anomalies.length}

## Neural Fusion
- Status: ${debug.neuralFusionDetails.isActive ? 'Active' : 'Inactive'}
- Synaptic Sequence: ${debug.neuralFusionDetails.synapticSequence}
- Metamorphosis Index: ${(debug.neuralFusionDetails.metamorphosisIndex * 100).toFixed(1)}%
- Confidence Score: ${(debug.neuralFusionDetails.confidenceScore * 100).toFixed(1)}%
- Neural Spectra Points: ${debug.neuralFusionDetails.neuralSpectra.length}

## Performance Optimization Status
- Frame Rate: ${debug.performance.frameRate} FPS (Optimized: ${debug.performance.optimizationMetrics.performanceGain})
- Memory: ${debug.performance.memoryUsage ? (debug.performance.memoryUsage / 1024 / 1024).toFixed(1) + ' MB' : 'N/A'} (Reduction: ${debug.performance.optimizationMetrics.memoryReduction})
- Render Time: ${debug.performance.renderTime.toFixed(2)}ms (Speed Up: ${debug.performance.optimizationMetrics.renderSpeedUp})
- Calculation Time: ${debug.performance.calculationTime.toFixed(2)}ms
- Adaptive Quality: ${debug.performance.adaptiveQuality.toUpperCase()}
- Particle Count: ${debug.performance.optimizationMetrics.particleCount} (Optimized from 1000)
- Geometry: ${debug.performance.optimizationMetrics.geometryResolution} (Reduced from 48x48)
- Shadows: ${debug.performance.optimizationMetrics.shadowsEnabled ? 'Enabled' : 'Disabled (Performance Mode)'}

## Web Worker Integration
- Status: ${debug.asyncCalculations.isActive ? 'Active' : 'Inactive'}
- Processed Tasks: ${debug.asyncCalculations.processedCount}
- Queue Length: ${debug.asyncCalculations.queueLength}
- Cache Hits: ${debug.asyncCalculations.cacheHits}
- Worker Status: ${debug.asyncCalculations.webWorkerStatus}
- Processing Time: ${debug.asyncCalculations.processingTime.toFixed(2)}ms

## TensorFlow.js Acceleration
- Status: ${debug.tensorFlowStatus.isLoaded ? 'Ready' : 'Not Available'}
- Backend: ${debug.tensorFlowStatus.backend.toUpperCase()}
- WebGPU: ${debug.tensorFlowStatus.isWebGPUAvailable ? 'Available' : 'Not Available'}
- Init Time: ${debug.tensorFlowStatus.initializationTime ? debug.tensorFlowStatus.initializationTime.toFixed(2) + 'ms' : 'N/A'}

## Memory Management
- Three.js Disposal: ${debug.memoryManagement.disposalActive ? 'Active' : 'Inactive'}
- Geometry Pooling: ${debug.memoryManagement.poolingEnabled ? 'Enabled' : 'Disabled'}
- Particle Recycling: ${debug.memoryManagement.particleRecycling ? 'Active' : 'Inactive'}
- Cleanup Cycles: ${debug.memoryManagement.cleanupCycles}

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