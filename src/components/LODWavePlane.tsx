import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SPECTRUM_BANDS, wave, type Isotope } from '@/lib/temporalCalculator';
import { SpectrumData } from '@/types/sdss';
import { useMemoryManager } from '@/lib/memoryManager';

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
  
  // Cache geometries for different LOD levels
  const geometries = useMemo(() => {
    const cache = new Map<string, THREE.PlaneGeometry>();
    
    Object.entries(LOD_CONFIGS).forEach(([level, config]) => {
      const geometry = new THREE.PlaneGeometry(10, 10, config.segments, config.segments);
      cache.set(level, geometry);
    });
    
    return cache;
  }, []);
  
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
    
    try {
      const meshPosition = meshRef.current.position;
      const distance = camera.position.distanceTo(meshPosition);
      
      // Determine appropriate LOD level based on distance and quality settings
      let targetLOD: 'high' | 'medium' | 'low' | 'veryLow' = 'high';
      
      // Apply quality settings override
      const qualityMultiplier = qualitySettings.quality === 'high' ? 1 : 
                               qualitySettings.quality === 'medium' ? 0.7 : 0.5;
      
      const adjustedDistance = distance / qualityMultiplier;
      
      if (adjustedDistance > LOD_CONFIGS.low.maxDistance) {
        targetLOD = 'veryLow';
      } else if (adjustedDistance > LOD_CONFIGS.medium.maxDistance) {
        targetLOD = 'low';
      } else if (adjustedDistance > LOD_CONFIGS.high.maxDistance) {
        targetLOD = 'medium';
      }
      
      // Frustum culling - hide if outside camera view
      const frustum = new THREE.Frustum();
      const matrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(matrix);
      
      const meshVisible = frustum.intersectsObject(meshRef.current);
      setIsVisible(meshVisible);
      
      if (!meshVisible) {
        meshRef.current.visible = false;
        return;
      }
      
      meshRef.current.visible = true;
      
      // Switch geometry if LOD level changed
      if (targetLOD !== currentLOD) {
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
      
      // Optimize animation frequency based on distance and LOD
      const animationFrequency = targetLOD === 'high' ? 1 : 
                                targetLOD === 'medium' ? 0.8 :
                                targetLOD === 'low' ? 0.6 : 0.4;
      
      if (state.clock.elapsedTime % (1 / animationFrequency) < 0.016) {
        // Enhanced wave calculations with LOD-appropriate complexity
        for (let i = 0; i < position.count; i++) {
          const x = position.getX(i);
          const z = position.getZ(i);
          
        const waveValue = wave(0, state.clock.elapsedTime * 3, index, isotope, band.lambda, phaseType);
        const secondaryWave = targetLOD === 'high' ? 
          Math.sin(x * 0.5 + state.clock.elapsedTime * 2.4) * 0.3 : 0;
          
          const heightValue = Math.max(-4, Math.min(4, 
            (waveValue * Math.sin(x + z + phase) + secondaryWave) * 0.6 * intensityMultiplier
          ));
          
          position.setY(i, heightValue);
        }
        
        position.needsUpdate = true;
      }
      
      // Enhanced positioning and rotation with distance-based optimization
      const rotationIntensity = targetLOD === 'high' ? 1 : 0.5;
      meshRef.current.rotation.z = phase * 0.08 * rotationIntensity + 
        Math.sin(state.clock.elapsedTime * 0.3) * 0.05 * rotationIntensity;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15 + index) * 0.15 * rotationIntensity;
      meshRef.current.position.y = index * 0.6 - 3;
      meshRef.current.position.z = Math.sin(state.clock.elapsedTime * 0.2 + index * 0.5) * 0.3 * rotationIntensity;
      
    } catch (error) {
      console.error('LOD WavePlane animation error:', error);
    }
  });

  return (
    <mesh 
      ref={meshRef} 
      position={[0, index * 0.6 - 3, 0]} 
      receiveShadow={qualitySettings.shadows}
      castShadow={qualitySettings.shadows}
    >
      <meshPhongMaterial 
        color={band.color}
        wireframe={false}
        transparent
        opacity={0.3}
        emissive={band.color}
        emissiveIntensity={currentLOD === 'high' ? 0.15 : 0.1}
      />
    </mesh>
  );
}