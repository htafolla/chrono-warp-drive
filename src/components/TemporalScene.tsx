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
      
      // Enhanced wave plane positioning and rotation
      meshRef.current.rotation.z = phase * 0.05;
      meshRef.current.position.y = index * 0.3 - 2; // Better spacing between planes
      
    } catch (error) {
      console.error('WavePlane animation error:', error);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, index * 0.3 - 2, 0]}>
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


interface TemporalSceneProps {
  phases: number[];
  isotope: Isotope;
  cycle: number;
  fractalToggle: boolean;
}

export function TemporalScene({ phases, isotope, cycle, fractalToggle }: TemporalSceneProps) {
  return (
    <div className="w-full h-full bg-background rounded-lg overflow-hidden">
      <Canvas camera={{ position: [8, 6, 12], fov: 65 }}>
        {/* Enhanced lighting for better wave plane visibility */}
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.2} />
        <directionalLight 
          position={[-8, 8, 8]} 
          intensity={1.0}
          color="#ffffff"
        />
        <pointLight position={[0, -5, 5]} intensity={0.5} color="#7c3aed" />
        
        {/* Wave planes for each spectrum band - improved spacing */}
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
          maxDistance={25}
          minDistance={4}
        />
      </Canvas>
      
      {/* Overlay info */}
      <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 text-card-foreground cosmic-glow">
        <div className="text-sm font-medium">
          <p>Isotope: <span className="text-primary">{isotope.type}</span></p>
          <p>Fractal: <span className={fractalToggle ? "text-accent" : "text-secondary"}>{fractalToggle ? "ON" : "OFF"}</span></p>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Drag to rotate • Scroll to zoom
        </div>
      </div>
    </div>
  );
}