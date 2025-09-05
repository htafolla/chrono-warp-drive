import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SPECTRUM_BANDS, wave, harmonicOscillator, type Isotope } from '@/lib/temporalCalculator';

interface WavePlaneProps {
  band: typeof SPECTRUM_BANDS[0];
  phases: number[];
  isotope: Isotope;
  cycle: number;
  fractalToggle: boolean;
  index: number;
}

function WavePlane({ band, phases, isotope, cycle, fractalToggle, index }: WavePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  
  useFrame((state) => {
    if (!meshRef.current || !geometryRef.current) return;
    
    try {
      const geometry = geometryRef.current;
      const position = geometry.attributes.position;
      const phase = phases[index % phases.length] || 0;
      const phaseType = (cycle % 1.666) > 0.833 ? "push" : "pull";
      
      // Update vertices with wave calculations
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i);
        
        const waveValue = wave(0, state.clock.elapsedTime, index, isotope, band.lambda, phaseType);
        const heightValue = Math.max(-2, Math.min(2, 
          waveValue * Math.sin(x + z + phase) * 0.3
        ));
        
        position.setY(i, heightValue);
      }
      
      position.needsUpdate = true;
      
      // Rotate based on phase
      meshRef.current.rotation.z = phase * 0.1;
      meshRef.current.position.y = index * 0.1 - 1;
      
    } catch (error) {
      console.error('WavePlane animation error:', error);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, index * 0.1 - 1, 0]}>
      <planeGeometry 
        ref={geometryRef} 
        args={[8, 8, 32, 32]} 
      />
      <meshPhongMaterial 
        color={band.color}
        wireframe
        transparent
        opacity={0.7}
      />
    </mesh>
  );
}

function TemporalOrb({ phases }: { phases: number[] }) {
  const orbRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!orbRef.current) return;
    
    const oscillation = harmonicOscillator(state.clock.elapsedTime);
    const phaseAvg = phases.reduce((sum, p) => sum + p, 0) / phases.length;
    
    orbRef.current.scale.setScalar(1 + oscillation * 0.2);
    orbRef.current.rotation.y = phaseAvg;
    orbRef.current.rotation.x = state.clock.elapsedTime * 0.5;
  });

  return (
    <mesh ref={orbRef} position={[0, 2, 0]}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshPhongMaterial 
        color="hsl(var(--primary))"
        emissive="hsl(var(--primary))"
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}

interface TemporalSceneProps {
  phases: number[];
  isotope: Isotope;
  cycle: number;
  fractalToggle: boolean;
}

export function TemporalScene({ phases, isotope, cycle, fractalToggle }: TemporalSceneProps) {
  return (
    <div className="w-full h-full bg-background rounded-lg overflow-hidden">
      <Canvas camera={{ position: [5, 5, 10], fov: 60 }}>
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <directionalLight 
          position={[-5, 5, 5]} 
          intensity={0.8}
          color="hsl(var(--primary))"
        />
        
        {/* Central temporal orb */}
        <TemporalOrb phases={phases} />
        
        {/* Wave planes for each spectrum band */}
        {SPECTRUM_BANDS.map((band, index) => (
          <WavePlane
            key={band.band}
            band={band}
            phases={phases}
            isotope={isotope}
            cycle={cycle}
            fractalToggle={fractalToggle}
            index={index}
          />
        ))}
        
        {/* Controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxDistance={20}
          minDistance={3}
        />
      </Canvas>
      
      {/* Overlay info */}
      <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg p-3">
        <div className="text-sm text-muted-foreground">
          Isotope: {isotope.type} | Fractal: {fractalToggle ? "ON" : "OFF"}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Drag to rotate • Scroll to zoom
        </div>
      </div>
    </div>
  );
}