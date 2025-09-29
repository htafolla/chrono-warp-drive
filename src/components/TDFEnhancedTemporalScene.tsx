import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SPECTRUM_BANDS, wave, harmonicOscillator, type Isotope } from '@/lib/temporalCalculator';
import { useMemoryManager } from '@/lib/memoryManager';
import { TPTTv4_6Result, TimeShiftMetrics, TDFComponents } from '@/types/blurrn-v4-6';
import { SpectrumData } from '@/types/sdss';

interface TDFDisplacementFieldProps {
  tdfComponents: TDFComponents;
  timeShiftMetrics: TimeShiftMetrics;
  time: number;
}

function TDFDisplacementField({ tdfComponents, timeShiftMetrics, time }: TDFDisplacementFieldProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.SphereGeometry>(null);
  
  useFrame(() => {
    if (!meshRef.current) return;
    
    const tdfNormalized = Math.min(tdfComponents.TDF_value / 5.781e12, 1);
    const intensity = tdfNormalized * 2 + 0.3;
    
    // Animate displacement field based on TDF breakthrough
    meshRef.current.scale.setScalar(intensity);
    meshRef.current.rotation.y = time * 0.1;
    
    // Breakthrough effects
    if (timeShiftMetrics.breakthrough_validated) {
      const material = meshRef.current.material as THREE.MeshPhongMaterial;
      material.needsUpdate = true;
    }
  });

  const fieldColor = timeShiftMetrics.breakthrough_validated ? "#00ff00" : "#7c3aed";
  
  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry ref={geometryRef} args={[3, 32, 32]} />
      <meshPhongMaterial 
        color={fieldColor}
        transparent
        opacity={0.2}
        wireframe
      />
    </mesh>
  );
}

interface HiddenLightParticleSystemProps {
  hiddenLightData: number[];
  tdfValue: number;
  oscillatorMode: 'c_rhythm' | '528hz';
}

function HiddenLightParticleSystem({ hiddenLightData, tdfValue, oscillatorMode }: HiddenLightParticleSystemProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = Math.min(hiddenLightData.length * 10, 1000);
  
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const pattern = oscillatorMode === 'c_rhythm' ? 'spiral' : 'radial';
      
      if (pattern === 'spiral') {
        const angle = (i / particleCount) * Math.PI * 8;
        const radius = 2 + (i / particleCount) * 3;
        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 1] = (i / particleCount) * 4 - 2;
        positions[i3 + 2] = Math.sin(angle) * radius;
      } else {
        const phi = Math.acos(1 - 2 * (i / particleCount));
        const theta = Math.sqrt(particleCount * Math.PI) * phi;
        const radius = 2 + Math.random() * 2;
        
        positions[i3] = Math.cos(theta) * Math.sin(phi) * radius;
        positions[i3 + 1] = Math.cos(phi) * radius;
        positions[i3 + 2] = Math.sin(theta) * Math.sin(phi) * radius;
      }
      
      // Color based on TDF value
      const intensity = Math.min(tdfValue / 5.781e12, 1);
      colors[i3] = 0.5 + intensity * 0.5; // Red
      colors[i3 + 1] = 0.2 + intensity * 0.3; // Green
      colors[i3 + 2] = 1.0; // Blue
    }
    
    return { positions, colors };
  }, [particleCount, hiddenLightData, tdfValue, oscillatorMode]);
  
  useFrame((state) => {
    if (!particlesRef.current) return;
    
    const time = state.clock.elapsedTime;
    const positionAttribute = particlesRef.current.geometry.attributes.position;
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const originalY = positions[i3 + 1];
      positionAttribute.array[i3 + 1] = originalY + Math.sin(time + i * 0.1) * 0.1;
    }
    
    positionAttribute.needsUpdate = true;
    particlesRef.current.rotation.y = time * 0.2;
  });
  
  return (
    <points ref={particlesRef}>
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
        size={0.05}
        vertexColors
        transparent
        opacity={0.8}
      />
    </points>
  );
}

interface TDFWavePlaneProps {
  band: typeof SPECTRUM_BANDS[0];
  phases: number[];
  isotope: Isotope;
  tdfComponents: TDFComponents;
  index: number;
  time: number;
}

function TDFWavePlane({ band, phases, isotope, tdfComponents, index, time }: TDFWavePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  
  useFrame(() => {
    if (!meshRef.current || !geometryRef.current) return;
    
    const geometry = geometryRef.current;
    const position = geometry.attributes.position;
    const phase = phases[index % phases.length] || 0;
    
    // TDF-influenced wave calculations
    const tdfInfluence = Math.min(tdfComponents.TDF_value / 5.781e12, 2);
    
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      
      const baseWave = Math.sin(x + z + phase + time * 0.5);
      const tdfWave = Math.sin(x * tdfInfluence + z * tdfComponents.tau + phase);
      
      const heightValue = (baseWave + tdfWave * 0.5) * 0.3;
      position.setY(i, heightValue);
    }
    
    position.needsUpdate = true;
    
    // TDF-responsive positioning
    meshRef.current.position.y = index * 0.4 - 2 + Math.sin(time + index) * 0.1;
    meshRef.current.rotation.z = phase * 0.02 + tdfComponents.tau * 0.1;
  });

  return (
    <mesh ref={meshRef} position={[0, index * 0.4 - 2, 0]}>
      <planeGeometry 
        ref={geometryRef} 
        args={[8, 8, 32, 32]} 
      />
      <meshPhongMaterial 
        color={band.color}
        wireframe
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

interface TDFEnhancedTemporalSceneProps {
  phases: number[];
  isotope: Isotope;
  time: number;
  tpttV46Result?: TPTTv4_6Result | null;
  spectrumData?: SpectrumData | null;
  qualitySettings?: {
    particles: boolean;
    shadows: boolean;
    quality: 'low' | 'medium' | 'high';
  };
}

export function TDFEnhancedTemporalScene({ 
  phases, 
  isotope, 
  time, 
  tpttV46Result,
  spectrumData,
  qualitySettings = { particles: true, shadows: true, quality: 'high' }
}: TDFEnhancedTemporalSceneProps) {
  const memoryManager = useMemoryManager();
  
  const hasV46Data = tpttV46Result?.v46_components && tpttV46Result?.timeShiftMetrics;
  
  return (
    <div className="w-full h-full min-h-[600px] bg-background rounded-lg overflow-hidden" data-testid="tdf-enhanced-temporal-scene">
      <Canvas camera={{ position: [8, 6, 10], fov: 75 }}>
        {/* Enhanced lighting for TDF visualization */}
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.0} />
        <directionalLight 
          position={[-10, 10, 10]} 
          intensity={0.8}
          color="#ffffff"
          castShadow={qualitySettings.shadows}
        />
        
        {/* TDF-specific lighting effects */}
        {hasV46Data && tpttV46Result.timeShiftMetrics.breakthrough_validated && (
          <pointLight 
            position={[0, 0, 0]} 
            intensity={2.0} 
            color="#00ff00"
            distance={15}
          />
        )}
        
        <pointLight 
          position={[0, -8, 8]} 
          intensity={0.6} 
          color="#7c3aed"
        />
        
        {/* TDF Displacement Field */}
        {hasV46Data && (
          <TDFDisplacementField
            tdfComponents={tpttV46Result.v46_components}
            timeShiftMetrics={tpttV46Result.timeShiftMetrics}
            time={time}
          />
        )}
        
        {/* Hidden Light Particle System */}
        {hasV46Data && qualitySettings.particles && (
          <HiddenLightParticleSystem
            hiddenLightData={tpttV46Result.timeShiftMetrics.hiddenLightRevealed}
            tdfValue={tpttV46Result.v46_components.TDF_value}
            oscillatorMode={tpttV46Result.timeShiftMetrics.oscillatorMode}
          />
        )}
        
        {/* TDF-Enhanced Wave planes */}
        {SPECTRUM_BANDS.slice(0, qualitySettings.quality === 'high' ? 8 : qualitySettings.quality === 'medium' ? 5 : 3).map((band, index) => (
          hasV46Data ? (
            <TDFWavePlane
              key={band.band}
              band={band}
              phases={phases}
              isotope={isotope}
              tdfComponents={tpttV46Result.v46_components}
              index={index}
              time={time}
            />
          ) : (
            <mesh key={band.band} position={[0, index * 0.4 - 2, 0]}>
              <planeGeometry args={[8, 8, 24, 24]} />
              <meshPhongMaterial 
                color={band.color}
                wireframe
                transparent
                opacity={0.4}
              />
            </mesh>
          )
        ))}
        
        {/* Ground reference plane */}
        <mesh position={[0, -4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 20, 10, 10]} />
          <meshPhongMaterial 
            color="#1a1a2e"
            wireframe
            transparent
            opacity={0.2}
          />
        </mesh>
        
        {/* Controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxDistance={30}
          minDistance={5}
        />
      </Canvas>
      
      {/* TDF Overlay info */}
      <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 text-card-foreground cosmic-glow">
        <div className="text-sm font-medium space-y-1">
          <p>Isotope: <span className="text-primary">{isotope.type}</span></p>
          {hasV46Data && (
            <>
              <p>TDF: <span className="text-accent font-mono">{tpttV46Result.v46_components.TDF_value.toExponential(2)}</span></p>
              <p>τ: <span className="text-secondary font-mono">{tpttV46Result.v46_components.tau.toFixed(3)}</span></p>
              <p>Mode: <span className={tpttV46Result.timeShiftMetrics.oscillatorMode === 'c_rhythm' ? "text-green-400" : "text-yellow-400"}>
                {tpttV46Result.timeShiftMetrics.oscillatorMode}
              </span></p>
              <p>Status: <span className={tpttV46Result.timeShiftMetrics.breakthrough_validated ? "text-green-400" : "text-yellow-400"}>
                {tpttV46Result.timeShiftMetrics.breakthrough_validated ? "Breakthrough" : "Calibrating"}
              </span></p>
            </>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Drag to rotate • Scroll to zoom • v4.6 TDF Scene
        </div>
      </div>
      
      {/* Performance indicator */}
      <div className="absolute bottom-4 right-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2">
        <div className="text-xs text-muted-foreground">
          Quality: {qualitySettings.quality} • Particles: {qualitySettings.particles ? 'ON' : 'OFF'}
        </div>
      </div>
    </div>
  );
}