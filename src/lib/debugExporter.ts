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
  };
  v4EnhancedState: {
    spectrumData: SpectrumData | null;
    tpttV4Result: TPTTv4Result | null;
    neuralFusionActive: boolean;
    sdssConnectionStatus: string;
  };
  performance: {
    frameRate: number;
    memoryUsage?: number;
    renderTime: number;
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
    const debugState: DebugState = {
      timestamp: new Date().toISOString(),
      version: "BLURRN v4.5",
      systemStatus: {
        isV4Initialized: appState.isV4Initialized || false,
        systemStatusMessage: appState.systemStatus || "Unknown",
        errors: this.logs.filter(l => l.level === 'error').map(l => l.message),
        warnings: this.logs.filter(l => l.level === 'warn').map(l => l.message)
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
        rippel: appState.rippel || ""
      },
      v4EnhancedState: {
        spectrumData: appState.spectrumData || null,
        tpttV4Result: appState.tpttV4Result || null,
        neuralFusionActive: !!(appState.tpttV4Result?.neuralOutput),
        sdssConnectionStatus: appState.spectrumData?.source || "SYNTHETIC"
      },
      performance: {
        frameRate: this.calculateFrameRate(),
        memoryUsage: (performance as any).memory?.usedJSHeapSize || undefined,
        renderTime: performance.now()
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

## Temporal Engine
- Time: ${debug.temporalState.time.toFixed(2)}
- Phases: [${debug.temporalState.phases.map(p => p.toFixed(2)).join(', ')}]
- tPTT Value: ${debug.temporalState.tPTT_value.toFixed(2)}
- E_t: ${debug.temporalState.e_t.toFixed(3)}
- Isotope: ${debug.temporalState.isotope.type}
- Cycle: ${debug.temporalState.cycle}

## v4.5 Enhanced Features
- SDSS Data: ${debug.v4EnhancedState.spectrumData ? 'Connected' : 'Synthetic'}
- Data Source: ${debug.v4EnhancedState.sdssConnectionStatus}
- Neural Fusion: ${debug.v4EnhancedState.neuralFusionActive ? 'Active' : 'Inactive'}
- Spectrum Points: ${debug.v4EnhancedState.spectrumData?.wavelengths.length || 'N/A'}

## Performance
- Frame Rate: ${debug.performance.frameRate} FPS
- Memory: ${debug.performance.memoryUsage ? (debug.performance.memoryUsage / 1024 / 1024).toFixed(1) + ' MB' : 'N/A'}

## Browser Environment
- WebGL: ${debug.browserInfo.webglSupport ? 'Supported' : 'Not Available'}
- TensorFlow: ${debug.browserInfo.tensorflowReady ? 'Ready' : 'Not Ready'}

## Recent Issues
${debug.systemStatus.errors.length > 0 ? '### Errors:\n' + debug.systemStatus.errors.map(e => `- ${e}`).join('\n') : 'No errors'}
${debug.systemStatus.warnings.length > 0 ? '\n### Warnings:\n' + debug.systemStatus.warnings.slice(-5).map(w => `- ${w}`).join('\n') : ''}

## Component State Details
${JSON.stringify(debug.v4EnhancedState.tpttV4Result?.components || {}, null, 2)}
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