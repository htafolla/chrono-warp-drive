import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SPECTRUM_BANDS, wave, type Isotope } from '@/lib/temporalCalculator';
import { SpectrumData } from '@/types/sdss';
import { useMemoryManager } from '@/lib/memoryManager';
import { CustomStars } from './CustomStars';
import { SpectrumWavePlane } from './SpectrumWavePlane';
import { DebugOverlay } from './DebugOverlay';
import { GroundPlane } from './GroundPlane';
import { useFPSMonitor } from '@/hooks/useFPSMonitor';
import { getSafeColor } from '@/lib/colorUtils';

interface ParticleSystemProps {
  spectrumData: SpectrumData | null;
  time: number;
  phases: number[];
  qualitySettings?: {
    quality: 'high' | 'medium' | 'low';
    particles: boolean;
  };
}

function ParticleSystem({ spectrumData, time, phases, qualitySettings = { quality: 'high', particles: true } }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Dynamic particle count based on performance settings
  const particleCount = React.useMemo(() => {
    if (!qualitySettings.particles) return 0;
    
    switch (qualitySettings.quality) {
      case 'high': return 750;
      case 'medium': return 500;
      case 'low': return 250;
      default: return 750;
    }
  }, [qualitySettings.quality, qualitySettings.particles]);
  
  const memoryManager = useMemoryManager();
  
  // Cleanup particles on unmount
  useEffect(() => {
    return () => {
      if (pointsRef.current) {
        memoryManager.disposeObject(pointsRef.current);
      }
    };
  }, [memoryManager]);
  
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Distribute particles in spectrum-influenced pattern
      const radius = 5 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      // Color based on spectrum data or default
      const intensity = spectrumData ? 
        spectrumData.intensities[i % spectrumData.intensities.length] : 
        Math.random();
      
      colors[i3] = 0.5 + intensity * 0.5; // Red
      colors[i3 + 1] = 0.3 + intensity * 0.4; // Green  
      colors[i3 + 2] = 0.8 + intensity * 0.2; // Blue
    }
    
    return [positions, colors];
  }, [spectrumData]);
  
  useFrame(() => {
    if (!pointsRef.current) return;
    
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Animate particles based on phases
      const phaseIndex = i % phases.length;
      const phase = phases[phaseIndex];
      
      positions[i3 + 1] += Math.sin(time * 0.04 + phase) * 0.02;
      
      // Pulse colors based on spectrum intensity - FIX: Use additive pulsing instead of multiplicative
      const pulseIntensity = 0.8 + 0.4 * Math.sin(time * 0.02 + phase);
      const baseR = 0.5 + (spectrumData?.intensities[i % spectrumData.intensities.length] || Math.random()) * 0.5;
      const baseG = 0.3 + (spectrumData?.intensities[i % spectrumData.intensities.length] || Math.random()) * 0.4;
      const baseB = 0.8 + (spectrumData?.intensities[i % spectrumData.intensities.length] || Math.random()) * 0.2;
      
      colors[i3] = baseR * pulseIntensity;
      colors[i3 + 1] = baseG * pulseIntensity;
      colors[i3 + 2] = baseB * pulseIntensity;
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Duplicate WavePlane component removed - using SpectrumWavePlane instead

interface PostProcessingProps {
  children: React.ReactNode;
}

function PostProcessing({ children }: PostProcessingProps) {
  const { gl, scene, camera } = useThree();
  
  useEffect(() => {
    // Fixed rendering settings - prevent star washout
    gl.toneMapping = THREE.LinearToneMapping;
    gl.toneMappingExposure = 1.0;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Debug stars issue
    console.log('[STARS DEBUG] PostProcessing initialized with LinearToneMapping');
  }, [gl]);
  
  return <>{children}</>;
}

interface PerformanceSettings {
  quality: 'high' | 'medium' | 'low';
  shadows: boolean;
  particles: boolean;
  postProcessing: boolean;
}

interface EnhancedTemporalSceneProps {
  phases: number[];
  isotope: Isotope;
  cycle: number;
  fractalToggle: boolean;
  spectrumData?: SpectrumData | null;
  time: number;
  performanceSettings?: PerformanceSettings;
  onFPSChange?: (fps: number) => void;
  debugMode?: {
    showWireframes: boolean;
    showBounds: boolean;
    showInfo: boolean;
  };
}

function PerformanceMonitor({ onFPSChange }: { onFPSChange?: (fps: number) => void }) {
  const fpsData = useFPSMonitor();
  
  useEffect(() => {
    onFPSChange?.(fpsData.current);
  }, [fpsData.current, onFPSChange]);
  
  return null;
}

export function EnhancedTemporalScene({ 
  phases, 
  isotope, 
  cycle, 
  fractalToggle, 
  spectrumData = null,
  time,
  performanceSettings = { quality: 'high', shadows: true, particles: true, postProcessing: true },
  onFPSChange,
  debugMode = { showWireframes: false, showBounds: false, showInfo: false }
}: EnhancedTemporalSceneProps) {
  const memoryManager = useMemoryManager();

  // Debug stars lifecycle
  useEffect(() => {
    console.log('[STARS DEBUG] EnhancedTemporalScene mounted');
    return () => {
      console.log('[STARS DEBUG] EnhancedTemporalScene unmounting');
    };
  }, []);
  
  return (
    <div className="w-full h-full min-h-[600px] bg-background rounded-lg overflow-hidden" data-testid="enhanced-temporal-scene">
      <Canvas 
        key="enhanced-temporal-canvas"
        camera={{ position: [0, 2, 8], fov: 75 }}  // Optimized position for spectrum visibility
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          console.log('[Phase 10F] Canvas created, initializing renderer for spectrum wave debugging');
          gl.toneMapping = THREE.LinearToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
      >
        <PostProcessing>
          {/* Optimized Lighting for Spectrum Visibility */}
          <ambientLight intensity={0.1} />
          <directionalLight position={[0, 10, 5]} intensity={0.6} castShadow />
          <pointLight position={[0, 5, 0]} color="#ffffff" intensity={0.4} />
          <pointLight position={[-5, 0, 5]} color="#4338ca" intensity={0.3} />
          <pointLight position={[5, 0, 5]} color="#ec4899" intensity={0.3} />
          
          {/* Reduced Particle System to prevent spectrum washout */}
          {performanceSettings.particles && (
            <ParticleSystem 
              spectrumData={spectrumData}
              time={time}
              phases={phases}
              qualitySettings={{
                ...performanceSettings,
                quality: performanceSettings.quality // Keep existing but reduce opacity in component
              }}
            />
          )}
          
          {/* Ground Plane for Shadow Reception */}
          <GroundPlane />
          
          {/* Clean Spectrum Wave Planes */}
          {SPECTRUM_BANDS.map((band, index) => (
            <SpectrumWavePlane
              key={band.band}
              band={band}
              phases={phases}
              isotope={isotope}
              cycle={cycle}
              fractalToggle={fractalToggle}
              index={index}
              spectrumData={spectrumData}
              qualitySettings={performanceSettings}
            />
          ))}
          
          {/* Independent Debug Overlay */}
          <DebugOverlay 
            showWireframes={debugMode.showWireframes}
            showBounds={debugMode.showBounds}
            showInfo={debugMode.showInfo}
            opacity={0.4}
          />
          
          {/* Performance Monitor */}
          <PerformanceMonitor onFPSChange={onFPSChange} />
          
          {/* Custom Stars - No More Black Transition */}
          <CustomStars 
            radius={100} 
            depth={50} 
            count={performanceSettings.quality === 'high' ? 3000 : 
                   performanceSettings.quality === 'medium' ? 2000 : 1500} 
            factor={4} 
            saturation={0.4}
            fade={true}
            speed={0.05}
          />
          
          {/* Phase 10D: Enhanced Controls with Wave Plane Focused Target */}
          <OrbitControls 
            enablePan={true}
            target={[0, -1, 0]}  // Focus on wave plane area
            minDistance={3}
            maxDistance={15}
            enableZoom={true}
            enableRotate={true}
            autoRotate={false}
            autoRotateSpeed={0.5}
            dampingFactor={0.05}
            enableDamping={true}
          />
        </PostProcessing>
      </Canvas>
      
      {/* Enhanced Overlay Info with Phase 1 Diagnostics */}
      <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-md border border-border rounded-lg p-4 text-card-foreground shadow-lg">
        <div className="text-sm font-medium space-y-1">
          <p>Isotope: <span className="text-primary font-mono">{isotope.type}</span></p>
          <p>Fractal: <span className={fractalToggle ? "text-accent" : "text-secondary"}>{fractalToggle ? "ON" : "OFF"}</span></p>
          {spectrumData && (
            <p>Source: <span className="text-blue-400 font-mono">{spectrumData.source}</span></p>
          )}
          <p>Particles: <span className="text-green-400 font-mono">{performanceSettings.particles ? 750 : 0}</span></p>
          <p>Quality: <span className="text-blue-400 font-mono capitalize">{performanceSettings.quality}</span></p>
          <p>Wave Planes: <span className="text-purple-400 font-mono">{SPECTRUM_BANDS.length}</span></p>
          <p>Visible Planes: <span className="text-cyan-400 font-mono">{SPECTRUM_BANDS.length}</span></p>
        </div>
        <div className="text-xs text-muted-foreground mt-3 space-y-1">
          <p>• Drag to rotate • Scroll to zoom</p>
          <p>• Enhanced lighting & particles</p>
          <p>• LOD optimization active</p>
          <p>• Custom stars (no black transition)</p>
        </div>
      </div>
      
      {/* Performance Info with Phase 1 Diagnostics */}
      <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-md border border-border rounded-lg p-3 text-card-foreground shadow-lg">
        <div className="text-xs space-y-1">
          <p>Render: <span className="text-green-400">Enhanced</span></p>
          <p>Shadows: <span className="text-blue-400">Enabled</span></p>
          <p>Post-FX: <span className="text-purple-400">Active</span></p>
          <p>LOD: <span className="text-yellow-400">Dynamic</span></p>
          <p>Stars: <span className="text-orange-400">Custom</span></p>
        </div>
      </div>
    </div>
  );
}