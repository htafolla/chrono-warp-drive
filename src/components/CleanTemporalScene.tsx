import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SPECTRUM_BANDS, type Isotope } from '@/lib/temporalCalculator';
import { memoryManager } from '@/lib/memoryManager';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { TPTTv4_6Result, TDFComponents } from '@/types/blurrn-v4-6';
import { SpectrumData } from '@/types/sdss';
import { CustomStars } from './CustomStars';
import { deterministicRandom, generateCycle } from '@/lib/deterministicUtils';


interface ParticleSystemProps {
  spectrumData?: SpectrumData | null;
  time: number;
  phases: number[];
  count?: number;
}

function ParticleSystem({ spectrumData, time, phases, count = 500 }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const memoryManager = useMemoryManager();
  
  useEffect(() => {
    return () => {
      if (pointsRef.current) {
        memoryManager.disposeObject(pointsRef.current);
      }
    };
  }, [memoryManager]);
  
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      const cycle = generateCycle();
      const radius = 5 + deterministicRandom(cycle, i) * 10;
      const theta = deterministicRandom(cycle, i + 1) * Math.PI * 2;
      const phi = Math.acos(2 * deterministicRandom(cycle, i + 2) - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      const intensity = spectrumData ? 
        spectrumData.intensities[i % spectrumData.intensities.length] : 
        deterministicRandom(cycle, i + 3);
      
      colors[i3] = 0.5 + intensity * 0.5;
      colors[i3 + 1] = 0.3 + intensity * 0.4;
      colors[i3 + 2] = 0.8 + intensity * 0.2;
    }
    
    return [positions, colors];
  }, [count, spectrumData]);
  
  useFrame(() => {
    if (!pointsRef.current) return;
    
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phaseIndex = i % phases.length;
      const phase = phases[phaseIndex];
      
      positions[i3 + 1] += Math.sin(time * 0.04 + phase) * 0.02;
      
      const pulseIntensity = 0.8 + 0.4 * Math.sin(time * 0.02 + phase);
      const cycle = generateCycle();
      const baseR = 0.5 + (spectrumData?.intensities[i % spectrumData.intensities.length] || deterministicRandom(cycle, i + 6)) * 0.5;
      const baseG = 0.3 + (spectrumData?.intensities[i % spectrumData.intensities.length] || deterministicRandom(cycle, i + 7)) * 0.4;
      const baseB = 0.8 + (spectrumData?.intensities[i % spectrumData.intensities.length] || deterministicRandom(cycle, i + 8)) * 0.2;
      
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
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
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

interface CleanWavePlaneProps {
  band: typeof SPECTRUM_BANDS[0];
  phases: number[];
  isotope: Isotope;
  tdfComponents?: TDFComponents;
  index: number;
  time: number;
  totalPlanes: number;
}

function CleanWavePlane({ band, phases, isotope, tdfComponents, index, time, totalPlanes }: CleanWavePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  const isPageVisible = usePageVisibility();
  const frameCounterRef = useRef(0);

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
  
  useFrame(() => {
    if (!meshRef.current || !geometryRef.current) return;
    
    try {
      const geometry = geometryRef.current;
      const position = geometry.attributes.position;
      const phase = phases[index % phases.length] || 0;
      
      // Enhanced TDF calculations
      const isV46Active = tdfComponents && tdfComponents.TDF_value > 1000;
      const tdfMultiplier = isV46Active ? Math.log10(tdfComponents.TDF_value) / 8 : 0.1;
      const tau = tdfComponents?.tau || 0.5;
      
      // Dynamic wave calculations with proper amplitude
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i);
        
        // Multi-layered wave system
        const primaryWave = Math.sin(x * 1.2 + z * 0.8 + phase + time * 2.0) * 1.8;
        const secondaryWave = Math.cos(x * 0.6 + z * 1.4 + phase * 0.7 + time * 1.5) * 0.8;
        const tdfWave = isV46Active ? 
          Math.sin(x * tdfMultiplier + z * tau + phase * 3 + time * 0.8) * 2.5 : 0;
        const noiseWave = (Math.random() - 0.5) * 0.1;
        
        const heightValue = Math.max(-3.0, Math.min(3.0, 
          primaryWave + secondaryWave + tdfWave + noiseWave
        ));
        
          position.setY(i, heightValue);
        }
        
        position.needsUpdate = true;
      }
      
      // Improved spacing for better depth separation
      const zSpacing = 1.5; // Increased from 0.2
      const yOffset = (index - totalPlanes / 2) * 0.6;
      
      meshRef.current.position.set(0, yOffset, -index * zSpacing);
      meshRef.current.rotation.z = Math.sin(time * 0.5 + phase) * 0.05;
      
    } catch (error) {
      console.error('CleanWavePlane error:', error);
    }
  });

  // Enhanced color differentiation and opacity
  const baseColor = new THREE.Color(band.color);
  const emissiveColor = baseColor.clone().multiplyScalar(0.3);
  const opacity = Math.max(0.5, 0.8 - (index / totalPlanes) * 0.3);

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <planeGeometry 
        ref={geometryRef} 
        args={[10, 10, 32, 32]} 
      />
      <meshPhongMaterial 
        color={baseColor}
        wireframe={true}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        emissive={emissiveColor}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

interface TDFIndicatorProps {
  tdfComponents?: TDFComponents;
  timeShiftActive: boolean;
}

function TDFIndicator({ tdfComponents, timeShiftActive }: TDFIndicatorProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current || !timeShiftActive || !tdfComponents) return;
    
    const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    meshRef.current.scale.setScalar(scale);
    meshRef.current.rotation.y = state.clock.elapsedTime;
  });

  if (!timeShiftActive || !tdfComponents) return null;

  return (
    <mesh ref={meshRef} position={[0, 0, 2]}>
      <sphereGeometry args={[0.3, 12, 12]} />
      <meshBasicMaterial 
        color="#00ff88"
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

interface FPSData {
  current: number;
  average: number;
  min: number;
  max: number;
  history: number[];
}

interface FPSMonitorInternalProps {
  onFPSUpdate: (fps: FPSData) => void;
}

function FPSMonitorInternal({ onFPSUpdate }: FPSMonitorInternalProps) {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const fpsHistory = useRef<number[]>([]);
  
  useFrame(() => {
    frameCount.current++;
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime.current;
    
    if (frameCount.current >= 10) {
      const fps = Math.round((frameCount.current * 1000) / deltaTime);
      
      fpsHistory.current.push(fps);
      if (fpsHistory.current.length > 60) {
        fpsHistory.current.shift();
      }
      
      const history = fpsHistory.current;
      const average = history.reduce((sum, fps) => sum + fps, 0) / history.length;
      const min = Math.min(...history);
      const max = Math.max(...history);
      
      onFPSUpdate({
        current: fps,
        average: Math.round(average),
        min,
        max,
        history: [...history]
      });
      
      frameCount.current = 0;
      lastTime.current = currentTime;
    }
  });
  
  return null;
}

interface CleanTemporalSceneProps {
  phases: number[];
  isotope: Isotope;
  time: number;
  tpttV46Result?: TPTTv4_6Result | null;
  spectrumData?: SpectrumData | null;
  activeTab?: string;
}

export function CleanTemporalScene({ 
  phases, 
  isotope, 
  time, 
  tpttV46Result,
  spectrumData,
  activeTab = 'Scene'
}: CleanTemporalSceneProps) {
  const [fpsData, setFpsData] = React.useState<FPSData>({
    current: 60,
    average: 60,
    min: 60,
    max: 60,
    history: []
  });
  
  // Enhanced data validation and fallback generation
  const validatedData = useMemo(() => {
    console.log('🔍 Scene Data Debug:', {
      phases: phases?.length,
      phasesData: phases,
      isotope: isotope?.type,
      time,
      timeType: typeof time,
      tpttV46Result: !!tpttV46Result,
      spectrumData: !!spectrumData,
      activeTab
    });

    // Enhanced fallback data generation
    const currentTime = Date.now() * 0.001;
    const animatedTime = typeof time === 'number' && !isNaN(time) ? time : currentTime;
    
    const fallbackPhases = phases?.length > 0 ? phases : 
      Array.from({length: 5}, (_, i) => 
        Math.sin(animatedTime * 0.8 + i * 1.2) * Math.PI + 
        Math.cos(animatedTime * 0.5 + i * 0.8) * Math.PI * 0.5
      );
    
    const fallbackIsotope = isotope || { 
      type: 'C-12', 
      mass: 12, 
      abundance: 98.9, 
      halfLife: null,
      factor: 1.2
    };

    const isFallbackMode = !phases?.length || typeof time !== 'number' || isNaN(time);
    
    return {
      phases: fallbackPhases,
      time: animatedTime,
      isotope: fallbackIsotope,
      isFallbackMode
    };
  }, [phases, isotope, time, tpttV46Result, spectrumData, activeTab]);
  
  // Determine if v4.6 mode is active
  const isV46Active = useMemo(() => {
    return !!(tpttV46Result && 
             tpttV46Result.v46_components && 
             tpttV46Result.timeShiftMetrics?.timeShiftCapable &&
             tpttV46Result.v46_components.TDF_value > 1000);
  }, [tpttV46Result]);

  // Optimized band selection with better color distribution
  const activeBands = useMemo(() => {
    const maxBands = fpsData.current < 30 ? 3 : 5;
    // Select bands with better color contrast
    const selectedIndices = [0, 2, 4, 6, 8].slice(0, maxBands);
    return selectedIndices.map(i => SPECTRUM_BANDS[i]).filter(Boolean);
  }, [fpsData.current]);

  const particleCount = useMemo(() => {
    return fpsData.current > 45 ? 750 : fpsData.current > 30 ? 500 : 250;
  }, [fpsData.current]);

  const starCount = useMemo(() => {
    return fpsData.current > 45 ? 3000 : fpsData.current > 30 ? 2000 : 1500;
  }, [fpsData.current]);

  return (
    <div className="w-full h-full min-h-[600px] bg-background rounded-lg overflow-hidden" data-testid="clean-temporal-scene">
      <Canvas 
        camera={{ position: [6, 5, 12], fov: 60 }}
        shadows
        gl={{ 
          antialias: true
        }}
      >
        {/* FPS Monitor inside Canvas */}
        <FPSMonitorInternal onFPSUpdate={setFpsData} />
        
        {/* Custom Stars Background */}
        <CustomStars 
          radius={100}
          depth={50}
          count={starCount}
          factor={4}
          saturation={0.4}
          fade={true}
          speed={0.1}
        />
        
        {/* Dark Matter Particle System */}
        <ParticleSystem
          spectrumData={spectrumData}
          time={validatedData.time}
          phases={validatedData.phases}
          count={particleCount}
        />
        
        {/* Optimized lighting system with shadow support */}
        <ambientLight intensity={0.4} color="#ffffff" />
        <directionalLight 
          position={[15, 15, 10]} 
          intensity={1.8}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={50}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
        />
        <directionalLight 
          position={[-10, 8, 5]} 
          intensity={0.8}
          color="#4f46e5"
        />
        <pointLight position={[0, 10, 0]} intensity={1.2} color="#06b6d4" />
        <pointLight position={[8, -2, -8]} intensity={0.8} color="#8b5cf6" />
        <hemisphereLight
          args={["#3b82f6", "#1e293b", 0.5]}
        />
        {/* Rim lighting for better depth perception */}
        <pointLight position={[-15, 5, 15]} intensity={0.6} color="#f59e0b" />
        
        {/* Wave planes with validated data */}
        {activeBands.map((band, index) => (
          <CleanWavePlane
            key={band.band}
            band={band}
            phases={validatedData.phases}
            isotope={validatedData.isotope}
            tdfComponents={tpttV46Result?.v46_components}
            index={index}
            time={validatedData.time}
            totalPlanes={activeBands.length}
          />
        ))}
        
        {/* TDF breakthrough indicator */}
        <TDFIndicator 
          tdfComponents={tpttV46Result?.v46_components}
          timeShiftActive={isV46Active}
        />
        
        {/* Enhanced ground reference with grid - receives shadows */}
        <mesh position={[0, -4, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[25, 25]} />
          <meshPhongMaterial 
            color="#0f172a" 
            transparent 
            opacity={0.15}
            side={THREE.DoubleSide}
          />
        </mesh>
        <gridHelper args={[20, 20, "#334155", "#1e293b"]} position={[0, -3.9, 0]} />
        
        {/* Optimized controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxDistance={25}
          minDistance={4}
          target={[0, 0, -2]}
          autoRotate={false}
          autoRotateSpeed={0.5}
        />
      </Canvas>
      
      {/* Info overlay with fallback indicator */}
      <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 text-card-foreground">
        <div className="text-sm font-medium space-y-1">
          <p>Mode: <span className={isV46Active ? "text-green-400" : "text-yellow-400"}>
            {isV46Active ? "TDF v4.6 Active" : "Standard"}
          </span></p>
          <p>Isotope: <span className="text-primary">{validatedData.isotope.type}</span></p>
          <p>Planes: <span className="text-accent">{activeBands.length}</span></p>
          <p>Stars: <span className="text-purple-400">{starCount}</span></p>
          <p>Particles: <span className="text-cyan-400">{particleCount}</span></p>
          <p>FPS: <span className={fpsData.current > 45 ? "text-green-400" : fpsData.current > 30 ? "text-yellow-400" : "text-red-400"}>
            {fpsData.current}
          </span></p>
          {validatedData.isFallbackMode && (
            <p className="text-orange-400 text-xs">⚠️ Fallback Mode</p>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          ✨ Stars • 🌌 Particles • 🌑 Shadows
        </div>
      </div>

      {/* TDF status overlay */}
      {isV46Active && tpttV46Result?.v46_components && (
        <div className="absolute top-4 right-4 bg-green-900/80 backdrop-blur-sm border border-green-600 rounded-lg p-3 text-green-100">
          <div className="text-sm font-medium">
            <p>TDF Breakthrough</p>
            <p className="text-xs text-green-300">
              Value: {tpttV46Result.v46_components.TDF_value.toExponential(2)}
            </p>
            <p className="text-xs text-green-300">
              Tau: {tpttV46Result.v46_components.tau.toFixed(3)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}