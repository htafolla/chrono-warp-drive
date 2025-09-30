import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SPECTRUM_BANDS, wave, type Isotope } from '@/lib/temporalCalculator';
import { SpectrumData } from '@/types/sdss';
import { memoryManager } from '@/lib/memoryManager';
import { getSafeColor } from '@/lib/colorUtils';
import { optimizeGeometry } from '@/lib/sceneOptimization';

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
  cascadeLevel?: number;
}

// Phase 1: Cascade-adaptive LOD configurations
// Dynamically scaled based on cascade level (n) for v4.7 compliance
const getCascadeLODConfigs = (cascadeLevel: number, quality: 'high' | 'medium' | 'low') => {
  const optimized = optimizeGeometry(quality, cascadeLevel);
  const baseSegments = Math.floor(Math.sqrt(optimized.vertices));
  
  return {
    high: { segments: Math.min(baseSegments, 64), maxDistance: 10 },
    medium: { segments: Math.floor(baseSegments * 0.75), maxDistance: 20 },
    low: { segments: Math.floor(baseSegments * 0.5), maxDistance: 30 },
    veryLow: { segments: Math.floor(baseSegments * 0.375), maxDistance: Infinity }
  };
};

export function LODWavePlane({ 
  band, 
  phases, 
  isotope, 
  cycle, 
  fractalToggle, 
  index, 
  spectrumData,
  qualitySettings = { quality: 'high', shadows: true, particles: true },
  cascadeLevel = 29
}: LODWavePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  const { camera } = useThree();
  
  // Track current LOD level
  const [currentLOD, setCurrentLOD] = React.useState<'high' | 'medium' | 'low' | 'veryLow'>('high');
  const [isVisible, setIsVisible] = React.useState(true);
  
  // Phase 1: Cascade-adaptive geometry caching (800 vertices at n=25 → 440 at n=34)
  const geometries = useMemo(() => {
    const cache = new Map<string, THREE.PlaneGeometry>();
    const lodConfigs = getCascadeLODConfigs(cascadeLevel, qualitySettings.quality);
    
    Object.entries(lodConfigs).forEach(([level, config]) => {
      const geometry = new THREE.PlaneGeometry(10, 10, config.segments, config.segments);
      cache.set(level, geometry);
    });
    
    return cache;
  }, [cascadeLevel, qualitySettings.quality]);
  
  // Phase 10A: Ensure initial geometry assignment
  useEffect(() => {
    if (meshRef.current && !meshRef.current.geometry) {
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
  }, [geometries]);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Debug logging for Phase 9F
    if (state.clock.elapsedTime % 5 < 0.1) {
      console.log(`[Phase 9F] WavePlane ${index}: position=${meshRef.current.position.toArray()}, visible=${meshRef.current.visible}, LOD=${currentLOD}`);
    }
    
    try {
      const meshPosition = meshRef.current.position;
      const distance = camera.position.distanceTo(meshPosition);
      
      // Phase 1: Cascade-adaptive LOD selection
      const lodConfigs = getCascadeLODConfigs(cascadeLevel, qualitySettings.quality);
      let targetLOD: 'high' | 'medium' | 'low' | 'veryLow' = 'high';
      
      // Apply quality settings override
      const qualityMultiplier = qualitySettings.quality === 'high' ? 1 : 
                               qualitySettings.quality === 'medium' ? 0.7 : 0.5;
      
      const adjustedDistance = distance / qualityMultiplier;
      
      if (adjustedDistance > lodConfigs.low.maxDistance) {
        targetLOD = 'veryLow';
      } else if (adjustedDistance > lodConfigs.medium.maxDistance) {
        targetLOD = 'low';
      } else if (adjustedDistance > lodConfigs.high.maxDistance) {
        targetLOD = 'medium';
      }
      
      // Phase 10B: Temporarily disable frustum culling for debugging
      // const frustum = new THREE.Frustum();
      // const matrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      // frustum.setFromProjectionMatrix(matrix);
      
      // const meshVisible = frustum.intersectsObject(meshRef.current);
      // setIsVisible(meshVisible);
      
      // Force all wave planes to be visible
      setIsVisible(true);
      meshRef.current.visible = true;
      
      // Switch geometry if LOD level changed - FIXED: Clone geometry instead of direct assignment
      if (targetLOD !== currentLOD) {
        const newGeometry = geometries.get(targetLOD);
        if (newGeometry) {
          // Dispose old geometry properly
          const oldGeometry = meshRef.current.geometry;
          if (oldGeometry && oldGeometry !== newGeometry) {
            // Clone the geometry to avoid buffer resize errors
            const clonedGeometry = newGeometry.clone();
            meshRef.current.geometry = clonedGeometry;
            // Dispose the old one if it's not in the cache
            if (!Array.from(geometries.values()).includes(oldGeometry as THREE.PlaneGeometry)) {
              oldGeometry.dispose();
            }
          }
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
      {/* Enhanced wireframe spectrum plane - no background block */}
      <mesh 
        ref={meshRef} 
        position={[0, index * 0.6 - 3.3, 0]} 
        receiveShadow={qualitySettings.shadows}
        castShadow={qualitySettings.shadows}
      >
        <planeGeometry args={[10, 10, 96, 96]} />
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