import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SPECTRUM_BANDS, wave, harmonicOscillator, type Isotope } from '@/lib/temporalCalculator';

interface SpectrumBandProps {
  phases: number[];
  isotope: Isotope;
  cycle: number;
  fractalToggle: boolean;
}

function SpectrumBand({ phases, isotope, cycle, fractalToggle }: SpectrumBandProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  
  useFrame((state) => {
    if (!meshRef.current || !geometryRef.current) return;
    
    try {
      const geometry = geometryRef.current;
      const position = geometry.attributes.position;
      const colors = geometry.attributes.color;
      const phaseType = (cycle % 1.666) > 0.833 ? "push" : "pull";
      
      // Update vertices with wave calculations
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i);
        
        // Use the middle spectrum band for wave calculations
        const middleBand = SPECTRUM_BANDS[Math.floor(SPECTRUM_BANDS.length / 2)];
        const phase = phases[0] || 0;
        const waveValue = wave(x, state.clock.elapsedTime, 0, isotope, middleBand.lambda, phaseType);
        const heightValue = Math.max(-0.5, Math.min(0.5, 
          waveValue * Math.sin(x * 2 + z + phase) * 0.15
        ));
        
        position.setY(i, heightValue);
      }
      
      position.needsUpdate = true;
      
      // Gentle rotation animation
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.1) * 0.02;
      
    } catch (error) {
      console.error('SpectrumBand animation error:', error);
    }
  });

  // Create color gradient across the spectrum
  const createSpectrumGradient = () => {
    const geometry = new THREE.PlaneGeometry(12, 2, 64, 8);
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      const x = geometry.attributes.position.getX(i);
      // Map X position to spectrum colors
      const normalizedX = (x + 6) / 12; // Normalize from -6 to 6 -> 0 to 1
      const bandIndex = Math.floor(normalizedX * SPECTRUM_BANDS.length);
      const band = SPECTRUM_BANDS[Math.min(bandIndex, SPECTRUM_BANDS.length - 1)];
      
      // Parse HSL color and convert to RGB
      const hsl = band.color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (hsl) {
        const h = parseInt(hsl[1]) / 360;
        const s = parseInt(hsl[2]) / 100;
        const l = parseInt(hsl[3]) / 100;
        const rgb = new THREE.Color().setHSL(h, s, l);
        
        colors[i * 3] = rgb.r;
        colors[i * 3 + 1] = rgb.g;
        colors[i * 3 + 2] = rgb.b;
      }
    }
    
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  };

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} geometry={createSpectrumGradient()}>
      <meshPhongMaterial 
        vertexColors
        transparent
        opacity={0.9}
        side={THREE.DoubleSide}
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
    <div className="w-full h-full bg-background rounded-lg overflow-hidden" data-testid="temporal-scene">
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
        
        {/* Single consolidated spectrum band */}
        <SpectrumBand
          phases={phases}
          isotope={isotope}
          cycle={cycle}
          fractalToggle={fractalToggle}
        />
        
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