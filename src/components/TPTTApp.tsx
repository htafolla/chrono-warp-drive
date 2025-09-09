import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dashboard } from './Dashboard';
import { TemporalScene } from './TemporalScene';
import { EnhancedTemporalScene } from './EnhancedTemporalScene';
import { ControlPanel } from './ControlPanel';
import { SpectrumAnalyzer } from './SpectrumAnalyzer';
import { SpectrumSelector } from './SpectrumSelector';
import { RippelDisplay } from './RippelDisplay';
import { PerformanceMonitor } from './PerformanceMonitor';
import { AudioSynthesis } from './AudioSynthesis';
import { ExportImport } from './ExportImport';
import { MobileControls } from './MobileControls';
import { ErrorBoundary } from './ErrorBoundary';
import { ReportGenerator } from './ReportGenerator';
import { AnalysisEngine } from './AnalysisEngine';
import { DebugExporter } from '@/lib/debugExporter';
import { DebugInfo } from './DebugInfo';
import { Star, Waves, Sprout, BarChart3, Rocket, Laptop, Download, FileText } from 'lucide-react';
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
import { PicklesAtlas } from '@/lib/picklesAtlas';
import { NeuralFusion } from '@/lib/neuralFusion';
import { SpectrumData, TPTTv4Result } from '@/types/sdss';

export function TPTTApp() {
  // Core temporal state
  const [time, setTime] = useState(0);
  const [phases, setPhases] = useState([0, 2 * Math.PI / 3, 4 * Math.PI / 3]);
  const [fractalToggle, setFractalToggle] = useState(false);
  const [timeline, setTimeline] = useState(0);
  const [isotope, setIsotope] = useState<Isotope>(ISOTOPES[0]);
  const [cycle, setCycle] = useState(0);
  const [e_t, setE_t] = useState(0.5);
  
  // User controls
  const [phi, setPhi] = useState(PHI);
  const [delta_t, setDelta_t] = useState(DELTA_T);
  const [currentView, setCurrentView] = useState("dashboard");
  const [performanceMonitorActive, setPerformanceMonitorActive] = useState(false);

  // v4.5 Enhancement state
  const [spectrumData, setSpectrumData] = useState<SpectrumData | null>(null);
  const [tpttV4Result, setTpttV4Result] = useState<TPTTv4Result | null>(null);
  const [isV4Initialized, setIsV4Initialized] = useState(false);
  const [systemStatus, setSystemStatus] = useState<string>("Initializing BLURRN v4.5...");

  // v4.5 Systems
  const [temporalCalcV4] = useState(() => new TemporalCalculatorV4());
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

  // Animation loop with v4.5 enhancements
  useEffect(() => {
    const interval = setInterval(async () => {
      setTime(prevTime => prevTime + PHASE_UPDATE_FACTOR);
      setCycle(prevCycle => prevCycle + 1);
      setE_t(prevEt => Math.min(prevEt + 0.001, 2.0));
      
      const phaseType = cycle % Math.floor(PHI * 10) < 5 ? "push" : "pull";
      const omega = [FREQ, FREQ * 1.1, FREQ * 0.9];
      
      setPhases(prevPhases => 
        prevPhases.map((phase, i) => {
          try {
            const newPhase = kuramoto(prevPhases, omega, time, fractalToggle, isotope, phaseType);
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
    }, 16);

    return () => clearInterval(interval);
  }, [time, fractalToggle, isotope, cycle, isV4Initialized, spectrumData]);

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
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Laptop className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <Dashboard
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
          </TabsContent>

          <TabsContent value="simulation" className="space-y-4">
            <div className="h-[600px] w-full">
              <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-muted-foreground">3D scene failed to load</div>}>
                <EnhancedTemporalScene 
                  phases={phases}
                  isotope={isotope}
                  cycle={cycle}
                  fractalToggle={fractalToggle}
                  spectrumData={spectrumData}
                  time={time}
                />
              </ErrorBoundary>
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
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Advanced analytical tools and experimental features. 
                    Professional reporting and export capabilities are available in the Reports tab.
                  </p>
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
        </Tabs>
      </div>
    </div>
  );
}