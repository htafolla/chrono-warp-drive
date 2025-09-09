import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SPECTRUM_BANDS, wave, type Isotope } from '@/lib/temporalCalculator';
import { SpectrumData } from '@/types/sdss';
import { useMemoryManager } from '@/lib/memoryManager';
import { getSafeColor } from '@/lib/colorUtils';

interface LODWavePlaneProps {
  band: typeof SPECTRUM_BANDS[0];
  phases: number[];
  isotope: Isotope;
  cycle: number;
  fractalToggle: boolean;
  index: number;
  spectrumData: SpectrumData | null;
  qualitySettings?: {
    quality: 'high' | 'medium' | 'low';
    shadows: boolean;
    particles: boolean;
  };
}

// LOD configurations
const LOD_CONFIGS = {
  high: { segments: 48, maxDistance: 10 },
  medium: { segments: 32, maxDistance: 20 },
  low: { segments: 24, maxDistance: 30 },
  veryLow: { segments: 16, maxDistance: Infinity }
};

export function LODWavePlane({ 
  band, 
  phases, 
  isotope, 
  cycle, 
  fractalToggle, 
  index, 
  spectrumData,
  qualitySettings = { quality: 'high', shadows: true, particles: true }
}: LODWavePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  const memoryManager = useMemoryManager();
  
  // Use consistent high-quality geometry always - no LOD switching
  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(10, 10, 96, 96);
  }, []);
  
  // Initialize geometry once - remove conflicting assignment that causes WebGL errors
  useEffect(() => {
    if (geometry) {
      // Reset to consistent flat state without reassigning geometry
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        position.setY(i, 0);
      }
      position.needsUpdate = true;
    }
  }, [geometry]);
  
  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      if (geometry) geometry.dispose();
      if (meshRef.current) {
        memoryManager.disposeObject(meshRef.current);
      }
    };
  }, [memoryManager, geometry]);
  
  useFrame((state) => {
    if (!meshRef.current || !geometry) return;
    
    try {
      // Always use the single consistent geometry
      const position = geometry.attributes.position;
      const phase = phases[index % phases.length] || 0;
      const phaseType = (cycle % 1.666) > 0.833 ? "push" : "pull";
      
      // Use spectrum data if available for enhanced wave calculations
      const intensityMultiplier = spectrumData ? 
        spectrumData.intensities[index % spectrumData.intensities.length] : 1;
      
      // Enhanced wave calculations - always run for consistency
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i);
        
        // Enhanced wave calculations with proper surface undulation
        const waveValue = wave(0, state.clock.elapsedTime * 3, index, isotope, band.lambda, phaseType);
        const surfaceWave = Math.sin(x * 0.5 + z * 0.5 + phase + state.clock.elapsedTime * 2) * waveValue;
        const rippleWave = Math.sin(x * 1.2 + state.clock.elapsedTime * 2.5) * 0.8;
        const crossRipple = Math.cos(z * 1.0 + state.clock.elapsedTime * 2.0) * 0.6;
        const turbulence = Math.sin(x * z * 0.1 + state.clock.elapsedTime * 1.5) * 0.4;
        
        const heightValue = Math.max(-4, Math.min(4, 
          (surfaceWave + rippleWave + crossRipple + turbulence) * 2.5 * intensityMultiplier
        ));
        
        position.setY(i, heightValue);
      }
      
      position.needsUpdate = true;
      
      // Enhanced positioning and rotation - consistent intensity
      meshRef.current.rotation.z = phase * 0.12 + 
        Math.sin(state.clock.elapsedTime * 0.5) * 0.08;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.25 + index) * 0.2;
      meshRef.current.position.y = index * 0.6 - 3.3;
      meshRef.current.position.z = Math.sin(state.clock.elapsedTime * 0.3 + index * 0.8) * 0.5;
      
    } catch (error) {
      console.error('WavePlane animation error:', error);
    }
  });

  return (
    <group>      
      {/* Enhanced wireframe spectrum plane - geometry handled by LOD system */}
      <mesh 
        ref={meshRef} 
        position={[0, index * 0.6 - 3.3, 0]} 
        receiveShadow={qualitySettings.shadows}
        castShadow={qualitySettings.shadows}
      >
        <meshPhongMaterial 
          color={getSafeColor(band.color)}
          wireframe={true}
          transparent
          opacity={0.95}
          emissive={getSafeColor(band.color)}
          emissiveIntensity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}