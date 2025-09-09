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

  // Debug logging
  useEffect(() => {
    console.log(`[SpectrumWavePlane ${index}] Mounted with band lambda:`, band.lambda, 'color:', band.color);
    return () => {
      console.log(`[SpectrumWavePlane ${index}] Unmounting`);
    };
  }, [band.lambda, band.color, index]);

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
      if (!geometry.attributes?.position) {
        console.warn(`[SpectrumWavePlane ${index}] No position attribute available`);
        return;
      }
      
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
        const heightValue = Math.max(-2, Math.min(2, 
          (waveValue * Math.sin(x + z + phase) + secondaryWave) * 0.8 * intensityMultiplier
        ));
        
        position.setY(i, heightValue);
      }
      
      position.needsUpdate = true;
      
      // Enhanced positioning and rotation with more dynamic movement
      meshRef.current.rotation.z = phase * 0.05 + Math.sin(state.clock.elapsedTime * 0.2) * 0.03;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1 + index) * 0.1;
      meshRef.current.position.y = index * 0.6 - 3;
      meshRef.current.position.z = Math.sin(state.clock.elapsedTime * 0.15 + index * 0.3) * 0.2;
      
    } catch (error) {
      console.error(`[SpectrumWavePlane ${index}] Animation error:`, error);
    }
  });

  // Get safe color with fallback
  const safeColor = getSafeColor(band.color) || '#ffffff';
  
  return (
    <mesh 
      ref={meshRef} 
      position={[0, index * 0.6 - 3, 0]} 
      receiveShadow={qualitySettings.shadows}
      castShadow={qualitySettings.shadows}
    >
      <planeGeometry 
        ref={geometryRef} 
        args={[8, 8, 32, 32]} 
      />
      <meshBasicMaterial 
        color={safeColor}
        wireframe={false}
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}