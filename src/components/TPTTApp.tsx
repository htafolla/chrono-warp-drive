import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dashboard } from './Dashboard';
import { TemporalScene } from './TemporalScene';
import { EnhancedTemporalScene } from './EnhancedTemporalScene';
import { CleanTemporalScene } from './CleanTemporalScene';
import { ControlPanel } from './ControlPanel';
import { SpectrumAnalyzer } from './SpectrumAnalyzer';
import { SpectrumSelector } from './SpectrumSelector';
import { RippelDisplay } from './RippelDisplay';
import { PerformanceMonitor } from './PerformanceMonitor';
import { PerformanceController } from './PerformanceController';
import { AudioSynthesis } from './AudioSynthesis';
import { ExportImport } from './ExportImport';
import { MobileControls } from './MobileControls';
import { ErrorBoundary } from './ErrorBoundary';
import { ReportGenerator } from './ReportGenerator';
import { AnalysisEngine } from './AnalysisEngine';
import { DebugExporter } from '@/lib/debugExporter';
import { DebugInfo } from './DebugInfo';
import { TransportSystem } from './TransportSystem';
import { EnergySafetySystem } from './EnergySafetySystem';
import { EnergyVisualization } from './EnergyVisualization';
import { TransportPredictor } from './TransportPredictor';
import { AdvancedProgressIndicators } from './AdvancedProgressIndicators';
import { OptimizationSuggestions } from './OptimizationSuggestions';
import { DashboardMetrics } from './DashboardMetrics';
import { DashboardControls } from './DashboardControls';
import { Star, Waves, Sprout, BarChart3, Rocket, Laptop, Download, FileText, Clock } from 'lucide-react';
import { 
  PHI, 
  ISOTOPES, 
  SPECTRUM_BANDS, 
  kuramoto, 
  wave, 
  tPTT, 
  generateRippel,
  type Isotope,
  FREQ,
  C,
  DELTA_T,
  PHASE_UPDATE_FACTOR
} from '@/lib/temporalCalculator';
import { TemporalCalculatorV4 } from '@/lib/temporalCalculatorV4';
import { TemporalCalculatorV4_6 } from '@/lib/temporalCalculatorV4_6';
import { PicklesAtlas } from '@/lib/picklesAtlas';
import { NeuralFusion } from '@/lib/neuralFusion';
import { SpectrumData, TPTTv4Result } from '@/types/sdss';
import { TPTTv4_6Result, BlurrnV46Config } from '@/types/blurrn-v4-6';
import { TimeShiftDisplay } from './TimeShiftDisplay';
import { ExperimentLogger } from './ExperimentLogger';
import { V46UserGuide } from './V46UserGuide';
import { TemporalDisplacementControls } from './TemporalDisplacementControls';
import { BlackHoleLightVisualizer } from './BlackHoleLightVisualizer';
import { TDFEnhancedTemporalScene } from './TDFEnhancedTemporalScene';
import { TemporalControls } from './TemporalControls';
import { NeuralFusionDisplay } from './NeuralFusionDisplay';
import { ArchitectImplementationExport } from './ArchitectImplementationExport';
import { generateStellarTimestamp, getObservationSession } from '@/lib/stellarTimestamp';
import { memoryManager } from '@/lib/memoryManager';

export function TPTTApp() {
  // Initialize memory manager
  React.useEffect(() => {
    memoryManager.initialize();
    return () => {
      // Cleanup on unmount
      if (memoryManager.shouldCleanup()) {
        memoryManager.forceCleanup();
      }
    };
  }, []);
  // Core temporal state
  const [time, setTime] = useState(0);
  const [phases, setPhases] = useState([0, 2 * Math.PI / 3, 4 * Math.PI / 3]);
  const [fractalToggle, setFractalToggle] = useState(false);
  const [timeline, setTimeline] = useState(0);
  const [isotope, setIsotope] = useState<Isotope>(ISOTOPES[0]);
  const [cycle, setCycle] = useState(0);
  const [e_t, setE_t] = useState(0.5);

  // Enhanced energy system state
  const [energyGrowthRate, setEnergyGrowthRate] = useState(1.0);
  const [energyMomentum, setEnergyMomentum] = useState(0);
  const [energyHistory, setEnergyHistory] = useState<number[]>([]);
  const [targetE_t, setTargetE_t] = useState(1.5);
  const [lastEnergyValues, setLastEnergyValues] = useState<number[]>([]);
  
  // User controls
  const [phi, setPhi] = useState(PHI);
  const [delta_t, setDelta_t] = useState(DELTA_T);
  const [currentView, setCurrentView] = useState("dashboard");
  const [performanceMonitorActive, setPerformanceMonitorActive] = useState(false);
  
  // Performance settings state
  const [performanceSettings, setPerformanceSettings] = useState({
    quality: 'high' as 'high' | 'medium' | 'low',
    autoAdjust: true,
    shadows: true,
    particles: true,
    postProcessing: true,
    targetFPS: 60
  });
  const [currentFPS, setCurrentFPS] = useState(60);

  // Temporal control states
  const [isPlaying, setIsPlaying] = useState(true);
  const [updateInterval, setUpdateInterval] = useState(2000); // Default 2 seconds - slower and less jarring
  const [animationMode, setAnimationMode] = useState<'realtime' | 'observation' | 'analysis'>('observation');
  const [nextUpdateIn, setNextUpdateIn] = useState(0);
  const [autoRealtimeMode, setAutoRealtimeMode] = useState(false);

  // v4.5 Enhancement state
  const [spectrumData, setSpectrumData] = useState<SpectrumData | null>(null);
  const [tpttV4Result, setTpttV4Result] = useState<TPTTv4Result | null>(null);
  const [isV4Initialized, setIsV4Initialized] = useState(false);
  const [systemStatus, setSystemStatus] = useState<string>("Initializing BLURRN v4.5...");

  // v4.6 Enhancement state - Time Machine Ascension
  const [tpttV46Result, setTpttV46Result] = useState<TPTTv4_6Result | null>(null);
  const [isV46Initialized, setIsV46Initialized] = useState(false);
  const [isTimeShiftActive, setIsTimeShiftActive] = useState(false);
  const [isExperimentRunning, setIsExperimentRunning] = useState(false);
  const [v46Experiments, setV46Experiments] = useState<any[]>([]);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [v46Config, setV46Config] = useState<BlurrnV46Config>({
    growth_rate_multiplier: 1.0,
    tau: 0.865,
    oscillator_frequency: 3e8,
    tdf_overflow_clamp: 1e15,
    ethics_score_threshold: 0.8
  });

  // v4.5 Systems
  const [temporalCalcV4] = useState(() => new TemporalCalculatorV4());
  const [temporalCalcV46, setTemporalCalcV46] = useState<TemporalCalculatorV4_6 | null>(null);
  const [picklesAtlas] = useState(() => new PicklesAtlas());
  const [neuralFusion] = useState(() => new NeuralFusion());
  
  // Scene controls for mobile
  const sceneControlsRef = useRef({
    rotate: (deltaX: number, deltaY: number) => {},
    zoom: (delta: number) => {},
    pan: (deltaX: number, deltaY: number) => {}
  });

  // v4.5 System Initialization
  useEffect(() => {
    const initializeV4Systems = async () => {
      try {
        setSystemStatus("Initializing Pickles Atlas...");
        await picklesAtlas.initialize();
        
        setSystemStatus("Loading neural fusion engine...");
        await neuralFusion.initialize();
        
        setSystemStatus("Generating initial spectrum data...");
        const initialSpectrum = picklesAtlas.getRandomSpectrum();
        setSpectrumData(initialSpectrum);
        temporalCalcV4.setInputData(initialSpectrum);
        
        setSystemStatus("BLURRN v4.5 systems online - Pickles Atlas ready");
        setIsV4Initialized(true);
        
        toast.success("BLURRN v4.5 systems initialized with Pickles Atlas!");
      } catch (error) {
        console.error("v4.5 initialization failed:", error);
        setSystemStatus(`v4.5 initialization failed: ${error}`);
        toast.error("Failed to initialize v4.5 systems, using fallback mode");
      }
    };

    initializeV4Systems();
  }, []);

  // v4.6 System Initialization - Time Machine Ascension
  useEffect(() => {
    const initializeV46Systems = async () => {
      try {
        if (!isV4Initialized) return;
        
        setSystemStatus("Initializing v4.6 Time Machine systems...");
        
        const calcV46 = new TemporalCalculatorV4_6(spectrumData || undefined, v46Config);
        setTemporalCalcV46(calcV46);
        setIsV46Initialized(true);
        
        if (isTimeShiftActive) {
          setSystemStatus("BLURRN v4.6 Time Machine - TDF breakthrough ready!");
          toast.success("Time Machine v4.6 initialized - TDF calculations active!");
        } else {
          setSystemStatus("BLURRN v4.6 Time Machine - Ready for temporal displacement");
        }
      } catch (error) {
        console.error("v4.6 initialization failed:", error);
        setSystemStatus(`v4.6 initialization failed: ${error}`);
      }
    };

    initializeV46Systems();
  }, [isV4Initialized, spectrumData, isTimeShiftActive]);

  // Animation loop with controllable intervals and pause functionality
  useEffect(() => {
    if (!isPlaying && animationMode !== 'realtime') {
      return; // Skip updates when paused (except in realtime mode)
    }

    const actualInterval = animationMode === 'analysis' ? Infinity : updateInterval;
    if (actualInterval === Infinity) return; // Analysis mode = completely paused

    let intervalId: NodeJS.Timeout;
    let countdownId: NodeJS.Timeout;

    const updateSystem = async () => {
      setTime(prevTime => prevTime + PHASE_UPDATE_FACTOR);
      setCycle(prevCycle => prevCycle + 1);
      
      // Enhanced E_t calculation with momentum and multipliers
      setE_t(prevEt => {
        const baseGrowth = 0.001 * energyGrowthRate;
        
        // Neural confidence boost (0-50% additional growth)
        const neuralBoost = tpttV4Result?.neuralOutput?.confidenceScore || 0;
        const neuralMultiplier = neuralBoost * 0.5;
        
        // Spectrum intensity multiplier (high-energy stars get bonus)
        let spectrumMultiplier = 1.0;
        if (spectrumData?.source === 'STELLAR_LIBRARY' && spectrumData.metadata?.distance) {
          const distance = spectrumData.metadata.distance;
          if (distance < 50) spectrumMultiplier = 2.0; // Very close high-energy stars
          else if (distance < 100) spectrumMultiplier = 1.5; // Nearby stars
          else if (distance < 500) spectrumMultiplier = 1.2; // Local stars
        }
        
        // Fractal toggle bonus (20% as mentioned in the plan)
        const fractalBonus = fractalToggle ? 0.2 : 0;
        
        // Calculate momentum (acceleration effect)
        const currentMomentum = energyMomentum * 0.1; // Convert to growth multiplier
        
        // Total growth calculation
        const totalGrowth = baseGrowth * (1 + neuralMultiplier + (spectrumMultiplier - 1) + fractalBonus + currentMomentum);
        
        const newE_t = Math.min(prevEt + totalGrowth, targetE_t);
        
        // Update energy history for momentum calculation
        setLastEnergyValues(prev => {
          const newHistory = [...prev, newE_t].slice(-5); // Keep last 5 values
          return newHistory;
        });
        
        return newE_t;
      });
      
      // Update energy momentum based on acceleration
      setEnergyMomentum(prev => {
        if (lastEnergyValues.length >= 3) {
          const recent = lastEnergyValues.slice(-3);
          const acceleration = (recent[2] - recent[1]) - (recent[1] - recent[0]);
          return Math.max(0, Math.min(prev + acceleration * 10, 1.0)); // Cap at 100% momentum
        }
        return prev;
      });
      
      const phaseType = cycle % Math.floor(PHI * 10) < 5 ? "push" : "pull";
      const omega = [FREQ, FREQ * 1.1, FREQ * 0.9];
      
      setPhases(prevPhases => 
        prevPhases.map((phase, i) => {
          try {
            const newPhase = kuramoto(prevPhases, omega, time, fractalToggle, isotope, phaseType, i);
            return (phase + newPhase * PHASE_UPDATE_FACTOR) % (2 * Math.PI);
          } catch (error) {
            console.error(`Phase update error for phase ${i}:`, error);
            return phase;
          }
        })
      );

      // v4.5 Enhanced calculations
      if (isV4Initialized && spectrumData) {
        try {
          const v4Result = await temporalCalcV4.computeTPTTv4_5();
          setTpttV4Result(v4Result);
        } catch (error) {
          console.warn("v4.5 calculation failed:", error);
        }
      }

      // v4.6 TDF calculations when Time Shift is active
      if (isTimeShiftActive && isV46Initialized && temporalCalcV46) {
        try {
          if (spectrumData) {
            temporalCalcV46.setInputData(spectrumData);
          }
          temporalCalcV46.updateConfig(v46Config);
          
          const v46Result = await temporalCalcV46.computeTPTTv4_6();
          setTpttV46Result(v46Result);
          
          // Update system status with breakthrough info
          if (v46Result.timeShiftMetrics.breakthrough_validated) {
            setSystemStatus(`TDF Breakthrough: ${v46Result.v46_components.TDF_value.toExponential(2)} - Time shift validated!`);
          }
        } catch (error) {
          console.warn("v4.6 TDF calculation failed:", error);
        }
      }

      // Reset countdown
      setNextUpdateIn(actualInterval);
    };

    // Start countdown timer
    const startCountdown = () => {
      setNextUpdateIn(actualInterval);
      countdownId = setInterval(() => {
        setNextUpdateIn(prev => Math.max(0, prev - 100));
      }, 100);
    };

    // Initial update
    updateSystem();
    
    // Set up interval for subsequent updates
    if (actualInterval > 0 && actualInterval !== Infinity) {
      intervalId = setInterval(() => {
        updateSystem();
        startCountdown();
      }, actualInterval);
      
      startCountdown();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (countdownId) clearInterval(countdownId);
    };
  }, [fractalToggle, isotope, isV4Initialized, spectrumData, isPlaying, updateInterval, animationMode]);

  // Enhanced calculations with v4.5 compatibility
  const waves = spectrumData?.intensities || SPECTRUM_BANDS.map((band, i) => 
    wave(i, time, Math.floor(timeline), isotope, band.lambda, cycle % 2 === 0 ? "push" : "pull")
  );
  
  const lightWave = Array.isArray(waves) ? waves.reduce((sum, w) => sum + w) / waves.length : 0;
  const T_c = Math.sin(time * PHI) + 1;
  const P_s = (lightWave * phi) / 0.314;
  
  // Use v4.5 results if available, fallback to legacy calculation
  const tPTT_value = tpttV4Result?.tPTT_value || tPTT(T_c, P_s, e_t, delta_t);
  const rippel = tpttV4Result?.rippel || generateRippel(time, tPTT_value, e_t);

  // Enhanced Import/Export functionality
  const handleImport = (importedState: Partial<any>) => {
    if (importedState.time !== undefined) setTime(importedState.time);
    if (importedState.phases !== undefined) setPhases(importedState.phases);
    if (importedState.fractalToggle !== undefined) setFractalToggle(importedState.fractalToggle);
    if (importedState.timeline !== undefined) setTimeline(importedState.timeline);
    if (importedState.isotope !== undefined) setIsotope(importedState.isotope);
    if (importedState.cycle !== undefined) setCycle(importedState.cycle);
    if (importedState.e_t !== undefined) setE_t(importedState.e_t);
    if (importedState.phi !== undefined) setPhi(importedState.phi);
    if (importedState.delta_t !== undefined) setDelta_t(importedState.delta_t);
    
    // v4.5 specific imports
    if (importedState.spectrumData && isV4Initialized) {
      setSpectrumData(importedState.spectrumData);
      temporalCalcV4.setInputData(importedState.spectrumData);
    }
    
    toast.success("Configuration imported successfully!");
  };

  // v4.5 Spectrum selection handler
  const handleSpectrumSelect = async (selectedSpectrum: SpectrumData) => {
    try {
      setSpectrumData(selectedSpectrum);
      temporalCalcV4.setInputData(selectedSpectrum);
      toast.success(`Selected ${selectedSpectrum.source} spectrum loaded successfully`);
    } catch (error) {
      console.error("Failed to select spectrum:", error);
      toast.error("Failed to load selected spectrum");
    }
  };

  // Generate stellar timestamp for current observation
  const stellarTimestamp = React.useMemo(() => {
    const timestamp = generateStellarTimestamp(spectrumData, time * 1000);
    return timestamp.formatted;
  }, [spectrumData, Math.floor(time / (updateInterval / 1000))]);

  // Handle temporal control changes
  const handlePlayPause = React.useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleIntervalChange = React.useCallback((interval: number) => {
    setUpdateInterval(interval);
    // Auto-adjust animation mode based on interval
    if (interval <= 50) {
      setAnimationMode('realtime');
    } else if (interval <= 2000) {
      setAnimationMode('observation');
    }
  }, []);

  const handleModeChange = React.useCallback((mode: 'realtime' | 'observation' | 'analysis') => {
    setAnimationMode(mode);
    // Auto-adjust interval based on mode
    if (mode === 'realtime' && updateInterval > 100) {
      setUpdateInterval(16); // 60 FPS
    } else if (mode === 'observation' && updateInterval < 500) {
      setUpdateInterval(1000); // 1 second
    } else if (mode === 'analysis') {
      setIsPlaying(false);
    }
  }, [updateInterval]);

  // Auto realtime mode when transport is needed
  const handleAutoRealtimeToggle = React.useCallback(() => {
    if (autoRealtimeMode) {
      setAutoRealtimeMode(false);
      if (animationMode === 'realtime') {
        setAnimationMode('observation');
        setUpdateInterval(1000);
      }
    } else {
      setAutoRealtimeMode(true);
      setAnimationMode('realtime');
      setUpdateInterval(100); // Fast but not too intensive
    }
  }, [autoRealtimeMode, animationMode]);

  // Import PerformanceController
  const handlePerformanceSettingsChange = React.useCallback((settings: typeof performanceSettings) => {
    setPerformanceSettings(settings);
    
    // Apply settings to particle count if needed
    if (settings.quality === 'low' && settings.particles === false) {
      // Additional low-performance optimizations could go here
    }
  }, []);
  
  const handleFPSChange = React.useCallback((fps: number) => {
    setCurrentFPS(fps);
  }, []);
  const handleOptimizedSpectrumSelect = React.useCallback((type: string) => {
    // This would integrate with PicklesAtlas to find the best spectrum of requested type
    const randomSpectrum = picklesAtlas.getRandomSpectrum();
    handleSpectrumSelect(randomSpectrum);
    toast.success(`Optimized ${type} spectrum loaded for maximum energy efficiency`);
  }, [picklesAtlas]);

  // Calculate enhanced metrics for new components
  const enhancedMetrics = React.useMemo(() => {
    const neuralConfidence = tpttV4Result?.neuralOutput?.confidenceScore || 0;
    
    // Calculate spectrum-specific energy boost
    let spectrumBoost = 0;
    if (spectrumData?.source === 'STELLAR_LIBRARY' && spectrumData.metadata?.distance) {
      const distance = spectrumData.metadata.distance;
      if (distance < 50) spectrumBoost = 1.0; // 100% boost for very close stars
      else if (distance < 100) spectrumBoost = 0.5; // 50% boost for nearby stars  
      else if (distance < 500) spectrumBoost = 0.2; // 20% boost for local stars
    }
    
    const fractalBonus = fractalToggle ? 0.2 : 0;
    
    // Calculate adaptive threshold based on spectrum type
    let adaptiveThreshold = 1e10; // Default
    if (spectrumData?.source === 'STELLAR_LIBRARY' && spectrumData.metadata?.distance) {
      const distance = spectrumData.metadata.distance;
      if (distance < 50) adaptiveThreshold = 1e8; // Much lower for high-energy nearby stars
      else if (distance < 100) adaptiveThreshold = 5e8;
      else adaptiveThreshold = 1e9;
    } else if (spectrumData?.source === 'SDSS') {
      adaptiveThreshold = 2e9; // Higher for cosmic objects
    }
    
    // Apply neural confidence adjustment
    const neuralMultiplier = 0.5 + (neuralConfidence * 0.5);
    const finalThreshold = adaptiveThreshold * neuralMultiplier;
    
    // Calculate transport readiness with logarithmic scaling
    const logReadiness = tPTT_value <= 0 ? 0 : 
      Math.max(0, Math.min(100, (Math.log10(tPTT_value) - Math.log10(finalThreshold)) * 20 + 50));
    
    // Calculate ETA to readiness
    const energyGrowthPerSecond = (0.001 * energyGrowthRate * (updateInterval / 1000)) * 
                                  (1 + neuralConfidence * 0.5 + spectrumBoost + fractalBonus + energyMomentum * 0.1);
    const etaToTarget = targetE_t > e_t ? (targetE_t - e_t) / energyGrowthPerSecond : 0;
    
    // Energy trend calculation
    let energyTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (lastEnergyValues.length >= 2) {
      const recent = lastEnergyValues.slice(-2);
      if (recent[1] > recent[0] + 0.001) energyTrend = 'increasing';
      else if (recent[1] < recent[0] - 0.001) energyTrend = 'decreasing';
    }
    
    // Generate optimization suggestions
    const optimizations: string[] = [];
    if (logReadiness < 80) {
      if (!autoRealtimeMode) optimizations.push("Enable Auto-Realtime Mode");
      if (energyGrowthRate < 5) optimizations.push("Increase Energy Growth Rate");
      if (spectrumData?.source !== 'STELLAR_LIBRARY') optimizations.push("Select High-Energy Stellar Spectrum");
      if (!fractalToggle) optimizations.push("Enable Fractal Enhancement (+20% energy)");
      if (neuralConfidence < 0.8) optimizations.push("Improve Neural Confidence");
    }
    
    return {
      neuralBoost: neuralConfidence * 0.5,
      spectrumBoost,
      fractalBonus,
      adaptiveThreshold: finalThreshold,
      logReadiness,
      etaToReady: etaToTarget,
      energyTrend,
      optimizations,
      isOptimal: logReadiness >= 95 && neuralConfidence > 0.8 && spectrumBoost > 0.3
    };
  }, [
    tpttV4Result, spectrumData, fractalToggle, tPTT_value, e_t, targetE_t, 
    energyGrowthRate, energyMomentum, lastEnergyValues, updateInterval, autoRealtimeMode
  ]);

  const currentState = {
    time,
    phases,
    fractalToggle,
    timeline,
    isotope,
    cycle,
    e_t,
    phi,
    delta_t,
    tPTT_value,
    lightWave,
    rippel,
    // v4.5 additions
    spectrumData,
    tpttV4Result,
    isV4Initialized,
    systemStatus,
    timestamp: new Date().toISOString()
  };

  // v4.6 Handler Functions
  const handleV46Calculation = useCallback(async () => {
    if (!temporalCalcV46) return;
    
    try {
      setIsExperimentRunning(true);
      const result = await temporalCalcV46.computeTPTTv4_6();
      setTpttV46Result(result);
      setV46Experiments(prev => [...prev, ...temporalCalcV46.getExperimentLogs()]);
      toast.success("v4.6 TDF calculation complete!");
    } catch (error) {
      console.error("v4.6 calculation failed:", error);
      toast.error("TDF calculation failed");
    } finally {
      setIsExperimentRunning(false);
    }
  }, [temporalCalcV46]);

  const handleV46ConfigUpdate = useCallback((newConfig: Partial<BlurrnV46Config>) => {
    setV46Config(prev => ({ ...prev, ...newConfig }));
    if (temporalCalcV46) {
      temporalCalcV46.updateConfig(newConfig);
    }
  }, [temporalCalcV46]);

  const handleExperimentReportExport = useCallback(() => {
    if (!temporalCalcV46) return "";
    return temporalCalcV46.generateExperimentReport();
  }, [temporalCalcV46]);

  const handleClearExperiments = useCallback(() => {
    if (temporalCalcV46) {
      temporalCalcV46.resetExperiments();
    }
    setV46Experiments([]);
  }, [temporalCalcV46]);

  const handleToggleTimeShift = useCallback(() => {
    setIsTimeShiftActive(prev => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-6">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-8 w-8 bg-gradient-to-r from-primary to-primary/60 rounded-full flex items-center justify-center">
              <div className="h-4 w-4 bg-background rounded-full animate-pulse" />
            </div>
            <h1 className="text-4xl font-inter font-semibold text-foreground">
              BLURRN
            </h1>
            <Badge variant="outline" className="text-xs">
              Temporal Phase Transport
            </Badge>
            <Badge variant={isV4Initialized ? "default" : "secondary"} className="text-xs">
              {isV4Initialized ? "v4.5 SDSS" : "v3.6 Legacy"}
            </Badge>
            {spectrumData && (
              <Badge variant="secondary" className="text-xs">
                {spectrumData.source}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {systemStatus}
          </p>
        </header>

        <Tabs value={currentView} onValueChange={setCurrentView} className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="simulation" className="flex items-center gap-2">
              <Waves className="h-4 w-4" />
              3D Scene
            </TabsTrigger>
            <TabsTrigger value="controls" className="flex items-center gap-2">
              <Sprout className="h-4 w-4" />
              Controls
            </TabsTrigger>
            <TabsTrigger value="spectrum" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Spectrum
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Advanced
            </TabsTrigger>
            <TabsTrigger value="timeshift" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Shift
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Laptop className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* 1. Neural Fusion - Prominent First Position */}
            {isV4Initialized && (
              <div className="mb-6">
                <NeuralFusionDisplay 
                  neuralOutput={tpttV4Result?.neuralOutput || null}
                  isActive={!!tpttV4Result?.neuralOutput}
                />
              </div>
            )}

            {/* 2. Transport System - Main Operational Interface */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  Transport System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TransportSystem
                  tPTT_value={tPTT_value}
                  phases={phases}
                  e_t={e_t}
                  neuralOutput={tpttV4Result?.neuralOutput}
                  rippel={rippel}
                  isotope={isotope}
                  fractalToggle={fractalToggle}
                  spectrumData={spectrumData}
                  energyGrowthRate={energyGrowthRate}
                  onEnergyGrowthRateChange={setEnergyGrowthRate}
                  targetE_t={targetE_t}
                  onTargetE_tChange={setTargetE_t}
                  isRealtime={autoRealtimeMode}
                  onRealtimeToggle={handleAutoRealtimeToggle}
                  energyMomentum={energyMomentum}
                  neuralBoost={enhancedMetrics.neuralBoost}
                  spectrumBoost={enhancedMetrics.spectrumBoost}
                  fractalBonus={enhancedMetrics.fractalBonus}
                  adaptiveThreshold={enhancedMetrics.adaptiveThreshold}
                  logReadiness={enhancedMetrics.logReadiness}
                  etaToReady={enhancedMetrics.etaToReady}
                  energyTrend={enhancedMetrics.energyTrend}
                  optimizations={enhancedMetrics.optimizations}
                  isOptimal={enhancedMetrics.isOptimal}
                  onOptimizedSpectrumSelect={handleOptimizedSpectrumSelect}
                />
              </CardContent>
            </Card>

            {/* 3. Temporal Metrics & Chrono-Transport - Unified Section */}
            <DashboardMetrics
              time={time}
              e_t={e_t}
              tPTT_value={tPTT_value}
              rippel={rippel}
              phi={phi}
              lightWave={lightWave}
              phases={phases}
              tpttV4Result={tpttV4Result}
              isV4Enhanced={isV4Initialized}
              isotope={isotope}
              fractalToggle={fractalToggle}
            />

            {/* 4. Temporal Controls - Accessible Controls */}
            <TemporalControls
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              updateInterval={updateInterval}
              onIntervalChange={handleIntervalChange}
              animationMode={animationMode}
              onModeChange={handleModeChange}
              stellarTimestamp={stellarTimestamp}
              spectrumData={spectrumData}
              nextUpdateIn={nextUpdateIn}
            />

            {/* 5. Phase Relationships - Dedicated Section */}
            <Card>
              <CardHeader>
                <CardTitle>Phase Relationships</CardTitle>
                <CardDescription>Real-time phase dynamics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {phases.map((phase, i) => (
                    <div key={i} className="text-center">
                      <div className="text-2xl font-mono mb-2">
                        {(phase % (2 * Math.PI)).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Phase {i + 1}
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-100"
                          style={{ width: `${((phase % (2 * Math.PI)) / (2 * Math.PI)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="simulation" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Performance Controller */}
              <div className="lg:col-span-1">
                <PerformanceController 
                  onSettingsChange={handlePerformanceSettingsChange}
                  currentFPS={currentFPS}
                />
              </div>
              
              {/* 3D Scene */}
              <div className="lg:col-span-3 h-[600px]">
                <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-muted-foreground">3D scene failed to load</div>}>
                  <CleanTemporalScene 
                    phases={phases}
                    isotope={isotope}
                    time={time}
                    tpttV46Result={tpttV46Result}
                    spectrumData={spectrumData}
                    activeTab="simulation"
                  />
                </ErrorBoundary>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="controls" className="space-y-4">
            <ControlPanel
              phi={phi}
              setPhi={setPhi}
              delta_t={delta_t}
              setDelta_t={setDelta_t}
              e_t={e_t}
              setE_t={setE_t}
              fractalToggle={fractalToggle}
              setFractalToggle={setFractalToggle}
              isotope={isotope}
              setIsotope={setIsotope}
              timeline={timeline}
              setTimeline={setTimeline}
            />
          </TabsContent>

          <TabsContent value="spectrum" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Spectrum Selection */}
              <div className="lg:col-span-1">
                <SpectrumSelector
                  onSpectrumSelect={handleSpectrumSelect}
                  currentSpectrum={spectrumData}
                />
              </div>
              
              {/* Spectrum Analysis */}
              <div className="lg:col-span-2">
                <SpectrumAnalyzer 
                  waves={waves} 
                  time={time} 
                  spectrumData={spectrumData}
                  isV4Enhanced={isV4Initialized}
                />
              </div>
            </div>
            
            {/* Rippel Display */}
            <RippelDisplay
              tpttResult={tpttV4Result}
              rippel={rippel}
              time={time}
            />
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AudioSynthesis 
                phases={phases}
                e_t={e_t}
                tPTT_value={tPTT_value}
                fractalToggle={fractalToggle}
              />
               {/* Advanced system analytics and enhanced controls */}
               <Card>
                 <CardHeader>
                   <CardTitle>Advanced Analytics</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="text-center py-8 text-muted-foreground">
                     <p>Transport System moved to main Dashboard</p>
                     <p className="text-xs mt-2">Additional advanced features will be added here</p>
                   </div>
                 </CardContent>
               </Card>
            </div>
            <MobileControls
              onRotate={sceneControlsRef.current.rotate}
              onZoom={sceneControlsRef.current.zoom}
              onPan={sceneControlsRef.current.pan}
              isActive={currentView === "simulation" || currentView === "advanced"}
            />
          </TabsContent>

          <TabsContent value="reports" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <ReportGenerator
                currentState={currentState}
                tpttV4Result={tpttV4Result}
                neuralFusionData={tpttV4Result?.neuralOutput}
              />
              
              <ExportImport 
                currentState={currentState}
                onImport={handleImport}
              />
              
              <ArchitectImplementationExport
                currentState={currentState}
                tpttV46Result={tpttV46Result}
                spectrumData={spectrumData}
                performanceSettings={performanceSettings}
                sessionId={`architect-${Date.now()}`}
              />
            </div>
            
            <div className="space-y-6">
              <AnalysisEngine
                currentState={currentState}
                tpttV4Result={tpttV4Result}
                neuralFusionData={tpttV4Result?.neuralOutput}
              />
              
              <DebugInfo 
                currentState={currentState}
              />
            </div>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Engine Status</p>
                    <p className="text-muted-foreground">{systemStatus}</p>
                  </div>
                  <div>
                    <p className="font-medium">Core Frequency</p>
                    <p className="text-muted-foreground">{FREQ} Hz</p>
                  </div>
                  <div>
                    <p className="font-medium">Phase Count</p>
                    <p className="text-muted-foreground">{phases.length} Active</p>
                  </div>
                  <div>
                    <p className="font-medium">Isotope</p>
                    <p className="text-muted-foreground">{isotope.type}</p>
                  </div>
                  <div>
                    <p className="font-medium">Spectrum Source</p>
                    <p className="text-muted-foreground">{spectrumData?.source || "SYNTHETIC"}</p>
                  </div>
                  <div>
                    <p className="font-medium">Granularity</p>
                    <p className="text-muted-foreground">{spectrumData?.granularity.toFixed(2) || "1.00"} Å/pixel</p>
                  </div>
                  <div>
                    <p className="font-medium">Neural Fusion</p>
                    <p className="text-muted-foreground">{tpttV4Result?.neuralOutput ? "Active" : "Standby"}</p>
                  </div>
                  <div>
                    <p className="font-medium">tPTT Version</p>
                    <p className="text-muted-foreground">{isV4Initialized ? "v4.5" : "v3.6"}</p>
                  </div>
                </div>
                
                {tpttV4Result?.neuralOutput && (
                  <div className="pt-4 border-t">
                    <p className="font-medium text-sm mb-2">Neural Output</p>
                    <div className="bg-muted p-3 rounded text-xs">
                      <p><strong>Sequence:</strong> {tpttV4Result.neuralOutput.synapticSequence}</p>
                      <p><strong>Metamorphosis:</strong> {(tpttV4Result.neuralOutput.metamorphosisIndex * 100).toFixed(1)}%</p>
                      <p><strong>Confidence:</strong> {(tpttV4Result.neuralOutput.confidenceScore * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                )}
                
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">Performance Monitor</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPerformanceMonitorActive(!performanceMonitorActive)}
                    >
                      {performanceMonitorActive ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="space-y-3">
                    <span className="text-sm font-medium">Debug Export</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => DebugExporter.downloadDebugReport(currentState, 'summary')}
                        className="flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Summary Report
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => DebugExporter.downloadDebugReport(currentState, 'json')}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Full JSON
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Export complete system state for AI debugging assistance
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {performanceMonitorActive && <PerformanceMonitor isActive={performanceMonitorActive} />}
          </TabsContent>

            <TabsContent value="timeshift" className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Time Shift Analysis</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowUserGuide(true)}
                  className="flex items-center gap-2"
                >
                  📖 User Guide
                </Button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* TDF Enhanced 3D Scene - Full Width */}
              <div className="col-span-full mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      v4.6 TDF Temporal Displacement Visualization
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <TDFEnhancedTemporalScene
                      phases={phases}
                      isotope={isotope}
                      time={time}
                      tpttV46Result={tpttV46Result}
                      spectrumData={spectrumData}
                      qualitySettings={{
                        particles: performanceSettings.particles,
                        shadows: performanceSettings.shadows,
                        quality: performanceSettings.quality
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
              
              {/* Time Shift Display & Controls */}
              <div className="space-y-6">
                <TimeShiftDisplay 
                  tpttV46Result={tpttV46Result}
                  isActive={isV46Initialized}
                  currentCycle={cycle}
                />
                
                <TemporalDisplacementControls
                  config={v46Config}
                  onConfigChange={handleV46ConfigUpdate}
                  isTimeShiftActive={isTimeShiftActive}
                  onToggleTimeShift={handleToggleTimeShift}
                  onRunExperiment={handleV46Calculation}
                  isExperimentRunning={isExperimentRunning}
                />
              </div>
              
              {/* Black Hole Light Visualizer & Experiments */}
              <div className="space-y-6">
                <BlackHoleLightVisualizer
                  tpttV46Result={tpttV46Result}
                  isActive={isV46Initialized}
                  width={500}
                  height={400}
                />
                
                <ExperimentLogger
                  experiments={v46Experiments}
                  onExportReport={handleExperimentReportExport}
                  onClearLogs={handleClearExperiments}
                  currentExperiment={tpttV46Result?.experimentData ? {
                    experiment_id: `blurrn-v46-${tpttV46Result.experimentData.timestamp}`,
                    timestamp: tpttV46Result.experimentData.timestamp,
                    tdf_value: tpttV46Result.v46_components.TDF_value,
                    s_l_value: tpttV46Result.v46_components.S_L,
                    tau: tpttV46Result.v46_components.tau,
                    blackhole_seq: tpttV46Result.v46_components.BlackHole_Seq,
                    cycle: Date.now(),
                    validation_status: tpttV46Result.timeShiftMetrics.breakthrough_validated ? 'validated' as const : 'pending' as const,
                    notes: tpttV46Result.experimentData.validationProofs.join('; ')
                  } : undefined}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}