import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SPECTRUM_BANDS, wave, type Isotope } from '@/lib/temporalCalculator';
import { SpectrumData } from '@/types/sdss';
import { useMemoryManager } from '@/lib/memoryManager';
import { CustomStars } from './CustomStars';
import { LODWavePlane } from './LODWavePlane';
import { useFPSMonitor } from '@/hooks/useFPSMonitor';

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
      
      positions[i3 + 1] += Math.sin(time * 0.01 + phase) * 0.01;
      
      // Pulse colors based on spectrum intensity
      const pulseIntensity = 0.8 + 0.2 * Math.sin(time * 0.005 + phase);
      colors[i3] *= pulseIntensity;
      colors[i3 + 1] *= pulseIntensity;
      colors[i3 + 2] *= pulseIntensity;
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
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

interface WavePlaneProps {
  band: typeof SPECTRUM_BANDS[0];
  phases: number[];
  isotope: Isotope;
  cycle: number;
  fractalToggle: boolean;
  index: number;
  spectrumData: SpectrumData | null;
}

function WavePlane({ band, phases, isotope, cycle, fractalToggle, index, spectrumData }: WavePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  const memoryManager = useMemoryManager();
  
  // Phase 1: Diagnostic logging for wave plane rendering
  React.useEffect(() => {
    console.log(`[PHASE 1 DIAGNOSTIC] WavePlane ${index} (${band.band}) initialized:`, {
      color: band.color,
      lambda: band.lambda,
      position: `y=${index * 0.6 - 3}`,
      colorParsedByThree: new THREE.Color(band.color).getHexString()
    });
  }, [band, index]);

  // Memory cleanup on unmount
  useEffect(() => {
    return () => {
      if (meshRef.current) {
        memoryManager.disposeObject(meshRef.current);
      }
      if (geometryRef.current) {
        geometryRef.current.dispose();
      }
    };
  }, [memoryManager]);
  
  useFrame((state) => {
    if (!meshRef.current || !geometryRef.current) return;
    
    try {
      const geometry = geometryRef.current;
      const position = geometry.attributes.position;
      const phase = phases[index % phases.length] || 0;
      const phaseType = (cycle % 1.666) > 0.833 ? "push" : "pull";
      
      // Use spectrum data if available for enhanced wave calculations
      const intensityMultiplier = spectrumData ? 
        spectrumData.intensities[index % spectrumData.intensities.length] : 1;
      
      // Enhanced wave calculations with more dramatic movement
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i);
        
        const waveValue = wave(0, state.clock.elapsedTime, index, isotope, band.lambda, phaseType);
        const secondaryWave = Math.sin(x * 0.5 + state.clock.elapsedTime * 0.8) * 0.3;
        const heightValue = Math.max(-4, Math.min(4, 
          (waveValue * Math.sin(x + z + phase) + secondaryWave) * 0.6 * intensityMultiplier
        ));
        
        position.setY(i, heightValue);
      }
      
      position.needsUpdate = true;
      
      // Enhanced positioning and rotation with more dynamic movement
      meshRef.current.rotation.z = phase * 0.08 + Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15 + index) * 0.15;
      meshRef.current.position.y = index * 0.6 - 3;
      meshRef.current.position.z = Math.sin(state.clock.elapsedTime * 0.2 + index * 0.5) * 0.3;
      
    } catch (error) {
      console.error('Enhanced WavePlane animation error:', error);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, index * 0.6 - 3, 0]} receiveShadow>
      <planeGeometry 
        ref={geometryRef} 
        args={[10, 10, 48, 48]} 
      />
      <meshPhongMaterial 
        color={band.color}
        wireframe
        transparent
        opacity={0.7}
        emissive={band.color}
        emissiveIntensity={0.15}
      />
    </mesh>
  );
}

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
  onFPSChange
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
        camera={{ position: [8, 6, 12], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          console.log('[STARS DEBUG] Canvas created, initializing renderer');
          gl.toneMapping = THREE.LinearToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
      >
        <PostProcessing>
          {/* Optimized Lighting System - RGB colors to prevent star conflicts */}
          <ambientLight intensity={0.4} />
          <directionalLight 
            position={[-10, 10, 5]} 
            intensity={0.8}
            color="#9333ea"
            castShadow
            shadow-mapSize-width={512}
            shadow-mapSize-height={512}
            shadow-camera-near={0.5}
            shadow-camera-far={50}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          <pointLight 
            position={[10, 10, 10]} 
            intensity={0.6} 
            color="#0ea5e9"
          />
          <pointLight 
            position={[0, -8, 8]} 
            intensity={0.4} 
            color="#10b981"
          />
          
          {/* Performance-Optimized Particle System */}
          {performanceSettings.particles && (
            <ParticleSystem 
              spectrumData={spectrumData}
              time={time}
              phases={phases}
              qualitySettings={performanceSettings}
            />
          )}
          
          {/* Enhanced LOD Wave Planes */}
          {SPECTRUM_BANDS.map((band, index) => (
            <LODWavePlane
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
            fade={false}
            speed={0.1}
          />
          
          {/* Enhanced Controls with Preset Paths */}
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            maxDistance={30}
            minDistance={5}
            autoRotate={false}
            autoRotateSpeed={0.5}
            dampingFactor={0.05}
            enableDamping
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