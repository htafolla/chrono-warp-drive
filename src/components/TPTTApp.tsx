import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dashboard } from './Dashboard';
import { TemporalScene } from './TemporalScene';
import { ControlPanel } from './ControlPanel';
import { SpectrumAnalyzer } from './SpectrumAnalyzer';
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Temporal Photonic Transpondent Transporter
          </h1>
          <p className="text-muted-foreground">
            Prototype v3.6 - Chrono-Transport via Light Manipulation
          </p>
        </header>

        <Tabs value={currentView} onValueChange={setCurrentView} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="dashboard">Dashboard 🌟</TabsTrigger>
            <TabsTrigger value="simulation">Simulation 🌊</TabsTrigger>
            <TabsTrigger value="controls">Controls 🌱</TabsTrigger>
            <TabsTrigger value="spectrum">Spectrum 📊</TabsTrigger>
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
              <TemporalScene 
                phases={phases}
                isotope={isotope}
                cycle={cycle}
                fractalToggle={fractalToggle}
              />
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
        </Tabs>
      </div>
    </div>
  );
}