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
  const { camera } = useThree();
  
  // Track current LOD level
  const [currentLOD, setCurrentLOD] = React.useState<'high' | 'medium' | 'low' | 'veryLow'>('high');
  const [isVisible, setIsVisible] = React.useState(true);
  
  // Cache geometries for different LOD levels - enhanced for spectrum visibility
  const geometries = useMemo(() => {
    const cache = new Map<string, THREE.PlaneGeometry>();
    
    // Enhanced segment counts for denser wireframe appearance
    const enhancedConfigs = {
      high: { segments: 64, maxDistance: 10 }, // Much denser for spectrum-like appearance
      medium: { segments: 48, maxDistance: 20 },
      low: { segments: 32, maxDistance: 30 },
      veryLow: { segments: 24, maxDistance: Infinity }
    };
    
    Object.entries(enhancedConfigs).forEach(([level, config]) => {
      const geometry = new THREE.PlaneGeometry(10, 10, config.segments, config.segments);
      cache.set(level, geometry);
    });
    
    return cache;
  }, []);
  
  // Phase 10A: Ensure initial geometry assignment
  useEffect(() => {
    if (meshRef.current) {
      const initialGeometry = geometries.get('high');
      if (initialGeometry) {
        meshRef.current.geometry = initialGeometry;
        console.log(`[Phase 10A] Initial geometry assigned to WavePlane ${index}`);
      }
    }
  }, [geometries, index]);
  
  // Cleanup geometries on unmount
  useEffect(() => {
    return () => {
      geometries.forEach(geometry => geometry.dispose());
      if (meshRef.current) {
        memoryManager.disposeObject(meshRef.current);
      }
    };
  }, [memoryManager, geometries]);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Debug logging for Phase 9F
    if (state.clock.elapsedTime % 5 < 0.1) {
      console.log(`[Phase 9F] WavePlane ${index}: position=${meshRef.current.position.toArray()}, visible=${meshRef.current.visible}, LOD=${currentLOD}`);
    }
    
    try {
      const meshPosition = meshRef.current.position;
      const distance = camera.position.distanceTo(meshPosition);
      
      // Determine appropriate LOD level - simplified to reduce switching
      let targetLOD: 'high' | 'medium' | 'low' | 'veryLow' = 'high';
      
      // Apply quality settings override but keep more stable LOD levels
      const qualityMultiplier = qualitySettings.quality === 'high' ? 1 : 
                               qualitySettings.quality === 'medium' ? 0.7 : 0.5;
      
      const adjustedDistance = distance / qualityMultiplier;
      
      // More conservative LOD switching to prevent flickering
      if (adjustedDistance > 50) {
        targetLOD = 'low';
      } else if (adjustedDistance > 30) {
        targetLOD = 'medium';  
      }
      // Keep most planes at 'high' LOD for consistent wave display
      
      // Force all wave planes to be visible
      setIsVisible(true);
      meshRef.current.visible = true;
      
      // Only switch geometry if there's a significant LOD change
      if (targetLOD !== currentLOD && Math.abs(adjustedDistance - 25) > 10) {
        const newGeometry = geometries.get(targetLOD);
        if (newGeometry && meshRef.current.geometry !== newGeometry) {
          meshRef.current.geometry = newGeometry;
          setCurrentLOD(targetLOD);
        }
      }
      
      const geometry = meshRef.current.geometry as THREE.PlaneGeometry;
      const position = geometry.attributes.position;
      const phase = phases[index % phases.length] || 0;
      const phaseType = (cycle % 1.666) > 0.833 ? "push" : "pull";
      
      // Use spectrum data if available for enhanced wave calculations
      const intensityMultiplier = spectrumData ? 
        spectrumData.intensities[index % spectrumData.intensities.length] : 1;
      
      // Phase 10E: Remove animation throttling for debugging
      // Run wave animations every frame for maximum visibility
      if (true) {
        // Enhanced wave calculations with LOD-appropriate complexity
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
      }
      
      // Enhanced positioning and rotation with distance-based optimization
      const rotationIntensity = targetLOD === 'high' ? 1 : 0.5;
      // Phase 10D: Compress wave planes for better visibility
      meshRef.current.rotation.z = phase * 0.12 * rotationIntensity + 
        Math.sin(state.clock.elapsedTime * 0.5) * 0.08 * rotationIntensity;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.25 + index) * 0.2 * rotationIntensity;
      meshRef.current.position.y = index * 0.6 - 3.3; // Compressed spectrum positioning
      meshRef.current.position.z = Math.sin(state.clock.elapsedTime * 0.3 + index * 0.8) * 0.5 * rotationIntensity;
      
    } catch (error) {
      console.error('LOD WavePlane animation error:', error);
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