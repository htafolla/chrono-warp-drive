import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dashboard } from './Dashboard';
import { TemporalScene } from './TemporalScene';
import { ControlPanel } from './ControlPanel';
import { SpectrumAnalyzer } from './SpectrumAnalyzer';
import { PerformanceMonitor } from './PerformanceMonitor';
import { AudioSynthesis } from './AudioSynthesis';
import { ExportImport } from './ExportImport';
import { MobileControls } from './MobileControls';
import { ErrorBoundary } from './ErrorBoundary';
import { 
  PHI, 
  ISOTOPES, 
  SPECTRUM_BANDS, 
  kuramoto, 
  wave, 
  tPTT, 
  generateRippel,
  type Isotope
} from '@/lib/temporalCalculator';

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
  const [delta_t, setDelta_t] = useState(1e-6);
  const [currentView, setCurrentView] = useState("dashboard");
  const [performanceMonitorActive, setPerformanceMonitorActive] = useState(false);
  
  // Scene controls for mobile
  const sceneControlsRef = useRef({
    rotate: (deltaX: number, deltaY: number) => {},
    zoom: (delta: number) => {},
    pan: (deltaX: number, deltaY: number) => {}
  });

  // Animation loop - 16ms cycle (60fps)
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(prev => prev + 0.016);
      setCycle(prev => prev + 1);
      setE_t(prev => Math.max(0.1, Math.min(1.0, prev + (Math.random() - 0.5) * 0.01)));
      
      // Update phases using Kuramoto model
      setPhases(prevPhases => {
        const omega = [1, 1.1, 0.9]; // Natural frequencies
        const phaseType = (cycle % PHI) > (PHI / 2) ? "push" : "pull";
        
        return prevPhases.map((phase, i) => {
          const newPhase = phase + kuramoto(prevPhases, omega, time, fractalToggle, isotope, phaseType) * 0.016;
          return isNaN(newPhase) ? prevPhases[i] : newPhase;
        });
      });
    }, 16);

    return () => clearInterval(interval);
  }, [time, fractalToggle, isotope, cycle]);

  // Calculate derived values
  const waves = SPECTRUM_BANDS.map((band, i) => {
    const phaseType = (cycle % PHI) > (PHI / 2) ? "push" : "pull";
    return wave(0, time, i, isotope, band.lambda, phaseType);
  });
  
  const lightWave = waves.reduce((sum, w) => sum + w, 0) / waves.length;
  const T_c = lightWave * 0.1; // Approximate transponder core
  const P_s = (lightWave * phi) / 0.314; // Photosynthesis-inspired
  const tPTT_value = tPTT(T_c, P_s, e_t, delta_t);
  const rippel = generateRippel(time, tPTT_value, e_t);

  // Import/Export handlers
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
    timestamp: new Date().toISOString()
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative z-10">
      <div className="container mx-auto p-6">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blurrn-cyan via-blurrn-magenta to-energy-pink bg-clip-text text-transparent mb-2">
            TEMPORAL CALCULATOR
          </h1>
          <p className="text-blurrn-glow">Advanced Quantum Energy Analysis System</p>
        </header>

        <Tabs value={currentView} onValueChange={setCurrentView} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8 hologram-border blurrn-glow bg-card/50">
            <TabsTrigger value="dashboard" className="blurrn-button">Dashboard</TabsTrigger>
            <TabsTrigger value="simulation" className="blurrn-button">3D Scene</TabsTrigger>
            <TabsTrigger value="controls" className="blurrn-button">Controls</TabsTrigger>
            <TabsTrigger value="spectrum" className="blurrn-button">Spectrum</TabsTrigger>
            <TabsTrigger value="advanced" className="blurrn-button">Advanced</TabsTrigger>
            <TabsTrigger value="system" className="blurrn-button">System</TabsTrigger>
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
            />
          </TabsContent>

          <TabsContent value="simulation" className="space-y-4">
            <div className="h-[600px] w-full">
              <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-muted-foreground">3D scene failed to load</div>}>
                <TemporalScene 
                  phases={phases}
                  isotope={isotope}
                  cycle={cycle}
                  fractalToggle={fractalToggle}
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
            <SpectrumAnalyzer waves={waves} time={time} />
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AudioSynthesis 
                phases={phases}
                e_t={e_t}
                tPTT_value={tPTT_value}
                fractalToggle={fractalToggle}
              />
              <ExportImport
                currentState={currentState}
                onImport={handleImport}
              />
            </div>
            <MobileControls
              onRotate={sceneControlsRef.current.rotate}
              onZoom={sceneControlsRef.current.zoom}
              onPan={sceneControlsRef.current.pan}
              isActive={currentView === "simulation" || currentView === "advanced"}
            />
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm font-medium">Performance Monitor</label>
              <button
                onClick={() => setPerformanceMonitorActive(!performanceMonitorActive)}
                className="px-3 py-1 text-xs rounded border border-border bg-background hover:bg-muted transition-colors"
              >
                {performanceMonitorActive ? 'Disable' : 'Enable'}
              </button>
            </div>
            
            <PerformanceMonitor isActive={performanceMonitorActive} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-card border border-border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">System Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Temporal Engine</span>
                    <span>Blurrn v3.6 Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wave Planes</span>
                    <span>{waves.length} Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phase Channels</span>
                    <span>{phases.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Spectrum Range</span>
                    <span>250-2500nm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Render Mode</span>
                    <span>{fractalToggle ? '5D Fractal' : '3D Standard'}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-card border border-border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Feature Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Audio Synthesis</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Ready</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Export/Import</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Ready</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Mobile Controls</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Ready</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Performance Monitor</span>
                    <span className={`px-2 py-1 rounded text-xs ${performanceMonitorActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {performanceMonitorActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}