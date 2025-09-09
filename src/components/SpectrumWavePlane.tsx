import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SPECTRUM_BANDS, wave, type Isotope } from '@/lib/temporalCalculator';
import { SpectrumData } from '@/types/sdss';
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
  console.log(`CRITICAL DEBUG: SpectrumWavePlane ${index} STARTING TO RENDER`);
  
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  // Removed memoryManager to fix crash

  // Force console log on every render
  console.log(`RENDER: Plane ${index} - Band: ${band.band} - Color: ${band.color}`);

  // Debug logging - enhanced for all planes
  useEffect(() => {
    console.log(`[SpectrumWavePlane ${index}] MOUNTING with band: ${band.band}, lambda: ${band.lambda}, color: ${band.color}`);
    console.log(`[SpectrumWavePlane ${index}] Position will be: [0, ${index * 1.5 - 3}, 0]`);
    console.log(`[SpectrumWavePlane ${index}] Safe color: ${getSafeColor(band.color)}`);
    return () => {
      console.log(`[SpectrumWavePlane ${index}] UNMOUNTING`);
    };
  }, [band.lambda, band.color, index, band.band]);

  // Debug mesh and geometry creation
  useEffect(() => {
    if (meshRef.current && geometryRef.current) {
      console.log(`[SpectrumWavePlane ${index}] Mesh and geometry ready:`, {
        meshPosition: meshRef.current.position.toArray(),
        geometryBounds: geometryRef.current.boundingBox,
        visible: meshRef.current.visible,
        material: meshRef.current.material
      });
    }
  });

  // Cleanup on unmount - simplified without memoryManager
  useEffect(() => {
    return () => {
      if (geometryRef.current) {
        geometryRef.current.dispose();
      }
    };
  }, []);
  
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
      
      // Calculate wave value for debugging (outside loop)
      const waveValue = wave(0, state.clock.elapsedTime, index, isotope, band.lambda, phaseType);
      
      // Enhanced wave calculations with more dramatic movement
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i);
        
        const secondaryWave = Math.sin(x * 0.5 + state.clock.elapsedTime * 0.8) * 0.3;
        const heightValue = Math.max(-2, Math.min(2, 
          (waveValue * Math.sin(x + z + phase) + secondaryWave) * 0.8 * intensityMultiplier
        ));
        
        position.setY(i, heightValue);
      }
      
      // Debug log for first two planes
      if (index === 0 || index === 1) {
        console.log(`[SpectrumWavePlane ${index}] Wave animation active, waveValue:`, waveValue, 'sample heightValue:',
          Math.max(-2, Math.min(2, (waveValue * Math.sin(0 + 0 + phase)) * 0.8 * intensityMultiplier)));
      }
      
      position.needsUpdate = true;
      
      // Enhanced positioning and rotation with more dynamic movement
      meshRef.current.rotation.z = phase * 0.05 + Math.sin(state.clock.elapsedTime * 0.2) * 0.03;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1 + index) * 0.1;
      
      // Keep the planes in their fixed grid positions
      const col = index % 3;
      const row = Math.floor(index / 3);
      meshRef.current.position.x = col * 6 - 6;
      meshRef.current.position.y = row * 6 - 12;
      meshRef.current.position.z = -2 + Math.sin(state.clock.elapsedTime * 0.15 + index * 0.3) * 0.1;
      
    } catch (error) {
      console.error(`[SpectrumWavePlane ${index}] Animation error:`, error);
    }
  });

  // Get safe color with fallback - enhanced logging
  const safeColor = getSafeColor(band.color) || '#ffffff';
  
  // Log only once per component, not on every render
  useEffect(() => {
    console.log(`[SpectrumWavePlane ${index}] Final render color: ${safeColor} from: ${band.color}`);
  }, [safeColor, band.color, index]);
  
  return (
    <mesh 
      ref={meshRef} 
      position={[
        (index % 3) * 6 - 6,  // 3 columns: -6, 0, 6  
        Math.floor(index / 3) * 6 - 12,  // 4 rows: -12, -6, 0, 6
        -2  // In front of camera
      ]} 
      receiveShadow={qualitySettings.shadows}
      castShadow={qualitySettings.shadows}
      visible={true}
    >
      <planeGeometry 
        ref={geometryRef} 
        args={[4, 4, 20, 20]} 
      />
      <meshBasicMaterial 
        color={index < 3 ? ['#ff0000', '#00ff00', '#0000ff'][index] : `hsl(${index * 30}, 100%, 50%)`}
        transparent={false}
        opacity={1.0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}