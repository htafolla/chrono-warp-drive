import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SPECTRUM_BANDS, wave, type Isotope } from '@/lib/temporalCalculator';
import { SpectrumData } from '@/types/sdss';
import { useMemoryManager } from '@/lib/memoryManager';
import { getSafeColor } from '@/lib/colorUtils';

interface SpectrumWavePlaneProps {
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
  };
}

export function SpectrumWavePlane({ 
  band, 
  phases, 
  isotope, 
  cycle, 
  fractalToggle, 
  index, 
  spectrumData,
  qualitySettings = { quality: 'high', shadows: true }
}: SpectrumWavePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  const memoryManager = useMemoryManager();

  // Cleanup on unmount
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
      console.error('SpectrumWavePlane animation error:', error);
    }
  });

  return (
    <mesh 
      ref={meshRef} 
      position={[0, index * 0.6 - 3, 0]} 
      receiveShadow={qualitySettings.shadows}
      castShadow={qualitySettings.shadows}
    >
      <planeGeometry 
        ref={geometryRef} 
        args={[10, 10, 48, 48]} 
      />
      <meshPhongMaterial 
        color={getSafeColor(band.color)}
        wireframe={false}
        transparent
        opacity={0.9}
        emissive={getSafeColor(band.color)}
        emissiveIntensity={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}