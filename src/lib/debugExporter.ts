// BLURRN v4.6 Debug State Exporter
// Comprehensive state dump for AI debugging assistance

import { SpectrumData, TPTTv4Result, NeuralOutput } from '@/types/sdss';
import { TPTTv4_6Result, TDFComponents, TimeShiftMetrics, BlackHoleLightData, BlurrnV46Config, ExperimentLog } from '@/types/blurrn-v4-6';
import { Isotope } from './temporalCalculator';

export interface DebugState {
  timestamp: string;
  version: string;
  systemStatus: {
    isV4Initialized: boolean;
    isV46Breakthrough: boolean;
    systemStatusMessage: string;
    errors: string[];
    warnings: string[];
    ethicsScore: number;
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
  // v4.6 TDF Breakthrough Data
  tdfBreakthrough?: {
    components: TDFComponents;
    timeShiftMetrics: TimeShiftMetrics;
    blackHoleLightData?: BlackHoleLightData;
    v46Config: BlurrnV46Config;
    calculationBreakdown: {
      tdfFormula: string;
      intermediateValues: {
        tau_calculation: number;
        blackhole_seq_steps: any;
        s_l_dynamic: number;
        e_t_growth_factor: number;
      };
    };
    validationProofs: string[];
    experimentData: {
      roundNumber: number;
      timestamp: number;
      validationStatus: 'pending' | 'validated' | 'failed';
    };
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
  // v4.6 Component States
  componentStates?: {
    timeShiftDisplay?: {
      isActive: boolean;
      currentTDF: number;
      breakthroughProgress: number;
      pulseIntensity: number;
      displayMode: string;
    };
    blackHoleLightVisualizer?: {
      isActive: boolean;
      activePatterns: string[];
      lightCaptureData: any;
      patternMode: 'spiral' | 'radial' | 'spherical';
      renderingMetrics: {
        particleCount: number;
        frameRate: number;
      };
    };
    tdfPerformanceMonitor?: {
      isActive: boolean;
      currentMetrics: any;
      extremeValueWarnings: string[];
      performanceScore: number;
    };
    experimentLogger?: {
      currentExperiment?: ExperimentLog;
      totalExperiments: number;
      recentExports: number;
    };
  };
  enhancedTemporalScene?: {
    isActive: boolean;
    renderMode: 'tdf' | 'legacy';
    particleCount: number;
    wavePointCount: number;
    sceneComplexity: 'low' | 'medium' | 'high';
    tdfVisualizationActive: boolean;
    hiddenLightPatterns: number;
    displacementFieldActive: boolean;
  };
  lodSystem?: {
    currentLOD: 'high' | 'medium' | 'low' | 'veryLow';
    lodDistance: number;
    autoAdjustment: boolean;
    performanceThresholds: {
      highToMedium: number;
      mediumToLow: number;
      lowToVeryLow: number;
    };
    geometryOptimization: {
      segmentReduction: number;
      particleReduction: number;
    };
  };
  performance: {
    frameRate: number;
    memoryUsage?: number;
    renderTime: number;
    calculationTime: number;
    tdfPerformanceCorrelation?: {
      tdfStability: number;
      extremeValueImpact: number;
      memoryPressure: number;
    };
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

    // Check for v4.6 breakthrough data
    const tpttV46Result = appState.tpttV46Result as TPTTv4_6Result;
    const hasV46Breakthrough = !!(tpttV46Result?.v46_components);

    const debugState: DebugState = {
      timestamp: new Date().toISOString(),
      version: "BLURRN v4.6",
      systemStatus: {
        isV4Initialized: appState.isV4Initialized || false,
        isV46Breakthrough: hasV46Breakthrough,
        systemStatusMessage: appState.systemStatus || "Unknown",
        errors: this.logs.filter(l => l.level === 'error').map(l => l.message),
        warnings: this.logs.filter(l => l.level === 'warn').map(l => l.message),
        ethicsScore: appState.ethicsScore || 0.8
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
      // v4.6 TDF Breakthrough Data
      tdfBreakthrough: hasV46Breakthrough ? {
        components: tpttV46Result.v46_components,
        timeShiftMetrics: tpttV46Result.timeShiftMetrics,
        blackHoleLightData: tpttV46Result.blackHoleLightData,
        v46Config: {
          growth_rate_multiplier: appState.v46Config?.growth_rate_multiplier || 1.0,
          tau: tpttV46Result.v46_components.tau,
          oscillator_frequency: appState.v46Config?.oscillator_frequency || 528,
          tdf_overflow_clamp: appState.v46Config?.tdf_overflow_clamp || 1e15,
          ethics_score_threshold: appState.v46Config?.ethics_score_threshold || 0.8
        },
        calculationBreakdown: {
          tdfFormula: "TDF = (tPTT * τ * BlackHole_Seq) / (c^2 * Δt)",
          intermediateValues: {
            tau_calculation: tpttV46Result.v46_components.tau,
            blackhole_seq_steps: {
              voids: appState.voids || 1,
              n: appState.n || 1,
              phi: appState.phi || 1.666,
              sequence: tpttV46Result.v46_components.BlackHole_Seq
            },
            s_l_dynamic: tpttV46Result.v46_components.S_L,
            e_t_growth_factor: tpttV46Result.v46_components.E_t_growth
          }
        },
        validationProofs: tpttV46Result.experimentData?.validationProofs || [],
        experimentData: {
          roundNumber: tpttV46Result.experimentData?.roundNumber || 0,
          timestamp: tpttV46Result.experimentData?.timestamp || Date.now(),
          validationStatus: tpttV46Result.timeShiftMetrics?.breakthrough_validated ? 'validated' : 'pending'
        }
      } : undefined,
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
      // v4.6 Component States
      componentStates: {
        timeShiftDisplay: {
          isActive: !!(appState.timeShiftDisplayActive),
          currentTDF: hasV46Breakthrough ? tpttV46Result.v46_components.TDF_value : 0,
          breakthroughProgress: hasV46Breakthrough ? (tpttV46Result.v46_components.TDF_value / 5.781e12) : 0,
          pulseIntensity: appState.timeShiftPulseIntensity || 0,
          displayMode: appState.timeShiftDisplayMode || 'standard'
        },
        blackHoleLightVisualizer: {
          isActive: !!(appState.blackHoleLightVisualizerActive),
          activePatterns: appState.activePatterns || [],
          lightCaptureData: hasV46Breakthrough ? tpttV46Result.blackHoleLightData : null,
          patternMode: appState.patternMode || 'spiral',
          renderingMetrics: {
            particleCount: appState.particleCount || 0,
            frameRate: this.calculateFrameRate()
          }
        },
        tdfPerformanceMonitor: {
          isActive: !!(appState.tdfPerformanceMonitorActive),
          currentMetrics: appState.tdfPerformanceMetrics || {},
          extremeValueWarnings: appState.tdfExtremeValueWarnings || [],
          performanceScore: appState.tdfPerformanceScore || 0
        },
        experimentLogger: {
          currentExperiment: appState.currentExperiment,
          totalExperiments: appState.experiments?.length || 0,
          recentExports: appState.recentExports || 0
        }
      },
      enhancedTemporalScene: {
        isActive: !!appState.tpttV46Result,
        renderMode: appState.tpttV46Result ? 'tdf' : 'legacy',
        particleCount: appState.tpttV46Result?.timeShiftMetrics?.hiddenLightRevealed?.length * 10 || 0,
        wavePointCount: appState.performanceSettings?.quality === 'high' ? 48*48*8 : appState.performanceSettings?.quality === 'medium' ? 32*32*5 : 24*24*3,
        sceneComplexity: appState.performanceSettings?.quality || 'high',
        tdfVisualizationActive: !!(appState.tpttV46Result?.v46_components),
        hiddenLightPatterns: appState.tpttV46Result?.timeShiftMetrics?.hiddenLightRevealed?.length || 0,
        displacementFieldActive: !!(appState.tpttV46Result?.timeShiftMetrics?.breakthrough_validated)
      },
      lodSystem: {
        currentLOD: this.calculateLODLevel(appState.currentFPS, appState.performanceSettings?.targetFPS || 60),
        lodDistance: 15, // Default camera distance for LOD calculations
        autoAdjustment: appState.performanceSettings?.autoAdjust || false,
        performanceThresholds: {
          highToMedium: 45,
          mediumToLow: 30,
          lowToVeryLow: 20
        },
        geometryOptimization: {
          segmentReduction: appState.currentFPS < 30 ? 0.5 : 0,
          particleReduction: appState.currentFPS < 20 ? 0.7 : 0
        }
      },
      performance: {
        frameRate: this.calculateFrameRate(),
        memoryUsage: (performance as any).memory?.usedJSHeapSize || undefined,
        renderTime: performance.now(),
        calculationTime: performance.now() - startTime,
        tdfPerformanceCorrelation: hasV46Breakthrough ? {
          tdfStability: appState.tdfStability || 0,
          extremeValueImpact: tpttV46Result.v46_components.TDF_value > 1e12 ? 0.8 : 0.2,
          memoryPressure: ((performance as any).memory?.usedJSHeapSize || 0) / 1024 / 1024 / 100
        } : undefined
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
- v4.6 Breakthrough: ${debug.systemStatus.isV46Breakthrough ? 'ACTIVE' : 'Inactive'}
- v4.5 Initialized: ${debug.systemStatus.isV4Initialized}
- Ethics Score: ${(debug.systemStatus.ethicsScore * 100).toFixed(1)}%
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

## v4.6 TDF Breakthrough Values
${debug.tdfBreakthrough ? `
- TDF Value: ${debug.tdfBreakthrough.components.TDF_value.toExponential(3)}
- τ (Tau): ${debug.tdfBreakthrough.components.tau.toFixed(3)}
- BlackHole_Seq: ${debug.tdfBreakthrough.components.BlackHole_Seq.toFixed(6)}
- S_L (Dynamic): ${debug.tdfBreakthrough.components.S_L.toFixed(3)}
- E_t_growth: ${debug.tdfBreakthrough.components.E_t_growth.toFixed(3)}
- Time Shift Capable: ${debug.tdfBreakthrough.timeShiftMetrics.timeShiftCapable ? 'YES' : 'NO'}
- Oscillator Mode: ${debug.tdfBreakthrough.timeShiftMetrics.oscillatorMode}
- Phase Sync: ${(debug.tdfBreakthrough.timeShiftMetrics.phaseSync * 100).toFixed(1)}%
- Breakthrough Validated: ${debug.tdfBreakthrough.timeShiftMetrics.breakthrough_validated ? 'YES' : 'NO'}
- Validation Status: ${debug.tdfBreakthrough.experimentData.validationStatus.toUpperCase()}
- Round Number: ${debug.tdfBreakthrough.experimentData.roundNumber}` : 'v4.6 Breakthrough Not Active'}

## Enhanced 3D Temporal Scene
${debug.enhancedTemporalScene ? `
- Scene Mode: ${debug.enhancedTemporalScene.renderMode.toUpperCase()}
- TDF Visualization: ${debug.enhancedTemporalScene.tdfVisualizationActive ? 'ACTIVE' : 'INACTIVE'}
- Particle Count: ${debug.enhancedTemporalScene.particleCount}
- Wave Resolution: ${debug.enhancedTemporalScene.wavePointCount} points
- Scene Complexity: ${debug.enhancedTemporalScene.sceneComplexity.toUpperCase()}
- Hidden Light Patterns: ${debug.enhancedTemporalScene.hiddenLightPatterns}
- Displacement Field: ${debug.enhancedTemporalScene.displacementFieldActive ? 'ACTIVE' : 'INACTIVE'}` : 'Scene data not available'}

## LOD Performance System
${debug.lodSystem ? `
- Current LOD: ${debug.lodSystem.currentLOD.toUpperCase()}
- LOD Distance: ${debug.lodSystem.lodDistance}m
- Auto Adjustment: ${debug.lodSystem.autoAdjustment ? 'ENABLED' : 'DISABLED'}
- Performance Thresholds: High>${debug.lodSystem.performanceThresholds.highToMedium} Med>${debug.lodSystem.performanceThresholds.mediumToLow} Low>${debug.lodSystem.performanceThresholds.lowToVeryLow}
- Geometry Optimization: ${(debug.lodSystem.geometryOptimization.segmentReduction * 100).toFixed(1)}% reduction
- Particle Optimization: ${(debug.lodSystem.geometryOptimization.particleReduction * 100).toFixed(1)}% reduction` : 'LOD system data not available'}

## Enhanced 3D Temporal Scene
${debug.enhancedTemporalScene ? `
- Scene Mode: ${debug.enhancedTemporalScene.renderMode.toUpperCase()}
- TDF Visualization: ${debug.enhancedTemporalScene.tdfVisualizationActive ? 'ACTIVE' : 'INACTIVE'}
- Particle Count: ${debug.enhancedTemporalScene.particleCount}
- Wave Resolution: ${debug.enhancedTemporalScene.wavePointCount} points
- Scene Complexity: ${debug.enhancedTemporalScene.sceneComplexity.toUpperCase()}
- Hidden Light Patterns: ${debug.enhancedTemporalScene.hiddenLightPatterns}
- Displacement Field: ${debug.enhancedTemporalScene.displacementFieldActive ? 'ACTIVE' : 'INACTIVE'}` : 'Scene data not available'}

## LOD Performance System
${debug.lodSystem ? `
- Current LOD: ${debug.lodSystem.currentLOD.toUpperCase()}
- LOD Distance: ${debug.lodSystem.lodDistance}m
- Auto Adjustment: ${debug.lodSystem.autoAdjustment ? 'ENABLED' : 'DISABLED'}
- Performance Thresholds: High>${debug.lodSystem.performanceThresholds.highToMedium} Med>${debug.lodSystem.performanceThresholds.mediumToLow} Low>${debug.lodSystem.performanceThresholds.lowToVeryLow}
- Geometry Optimization: ${(debug.lodSystem.geometryOptimization.segmentReduction * 100).toFixed(1)}% reduction
- Particle Optimization: ${(debug.lodSystem.geometryOptimization.particleReduction * 100).toFixed(1)}% reduction` : 'LOD system data not available'}

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

## Performance
- Frame Rate: ${debug.performance.frameRate} FPS
- Memory: ${debug.performance.memoryUsage ? (debug.performance.memoryUsage / 1024 / 1024).toFixed(1) + ' MB' : 'N/A'}
- Calculation Time: ${debug.performance.calculationTime.toFixed(2)}ms
${debug.performance.tdfPerformanceCorrelation ? `
- TDF Stability: ${(debug.performance.tdfPerformanceCorrelation.tdfStability * 100).toFixed(1)}%
- Extreme Value Impact: ${(debug.performance.tdfPerformanceCorrelation.extremeValueImpact * 100).toFixed(1)}%
- Memory Pressure: ${debug.performance.tdfPerformanceCorrelation.memoryPressure.toFixed(1)}%` : ''}

## v4.6 Component States
${debug.componentStates ? `
### Time Shift Display
- Active: ${debug.componentStates.timeShiftDisplay?.isActive ? 'YES' : 'NO'}
- Current TDF: ${debug.componentStates.timeShiftDisplay?.currentTDF?.toExponential(3) || 'N/A'}
- Breakthrough Progress: ${((debug.componentStates.timeShiftDisplay?.breakthroughProgress || 0) * 100).toFixed(1)}%
- Display Mode: ${debug.componentStates.timeShiftDisplay?.displayMode || 'N/A'}

### Black Hole Light Visualizer
- Active: ${debug.componentStates.blackHoleLightVisualizer?.isActive ? 'YES' : 'NO'}
- Pattern Mode: ${debug.componentStates.blackHoleLightVisualizer?.patternMode || 'N/A'}
- Active Patterns: ${debug.componentStates.blackHoleLightVisualizer?.activePatterns?.length || 0}
- Particle Count: ${debug.componentStates.blackHoleLightVisualizer?.renderingMetrics?.particleCount || 0}

### TDF Performance Monitor
- Active: ${debug.componentStates.tdfPerformanceMonitor?.isActive ? 'YES' : 'NO'}
- Performance Score: ${((debug.componentStates.tdfPerformanceMonitor?.performanceScore || 0) * 100).toFixed(1)}%
- Extreme Value Warnings: ${debug.componentStates.tdfPerformanceMonitor?.extremeValueWarnings?.length || 0}

### Experiment Logger
- Total Experiments: ${debug.componentStates.experimentLogger?.totalExperiments || 0}
- Recent Exports: ${debug.componentStates.experimentLogger?.recentExports || 0}
- Current Experiment: ${debug.componentStates.experimentLogger?.currentExperiment ? 'Active' : 'None'}` : 'Component states not available'}

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

  static calculateLODLevel(currentFPS: number, targetFPS: number): 'high' | 'medium' | 'low' | 'veryLow' {
    const performanceRatio = currentFPS / targetFPS;
    
    if (performanceRatio >= 0.75) return 'high';
    if (performanceRatio >= 0.5) return 'medium';
    if (performanceRatio >= 0.33) return 'low';
    return 'veryLow';
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