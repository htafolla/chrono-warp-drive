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
  
  // Cache geometries for different LOD levels
  const geometries = useMemo(() => {
    const cache = new Map<string, THREE.PlaneGeometry>();
    
    Object.entries(LOD_CONFIGS).forEach(([level, config]) => {
      const geometry = new THREE.PlaneGeometry(10, 10, config.segments, config.segments);
      cache.set(level, geometry);
    });
    
    return cache;
  }, []);
  
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
      
      // Phase 10B: Temporarily disable frustum culling for debugging
      // const frustum = new THREE.Frustum();
      // const matrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      // frustum.setFromProjectionMatrix(matrix);
      
      // const meshVisible = frustum.intersectsObject(meshRef.current);
      // setIsVisible(meshVisible);
      
      // Force all wave planes to be visible
      setIsVisible(true);
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
      
      // Phase 10E: Remove animation throttling for debugging
      // Run wave animations every frame for maximum visibility
      if (true) {
        // Enhanced wave calculations with LOD-appropriate complexity
        for (let i = 0; i < position.count; i++) {
          const x = position.getX(i);
          const z = position.getZ(i);
          
          // Phase 10E: Enhanced wave calculations with 2.0x stronger amplitude
          const waveValue = wave(0, state.clock.elapsedTime * 8, index, isotope, band.lambda, phaseType);
          const secondaryWave = Math.sin(x * 1.2 + state.clock.elapsedTime * 5.0) * 0.8;
          const tertiaryWave = Math.cos(z * 1.0 + state.clock.elapsedTime * 4.0) * 0.6;
          
          const heightValue = Math.max(-8, Math.min(8, 
            (waveValue * Math.sin(x + z + phase) + secondaryWave + tertiaryWave) * 2.4 * intensityMultiplier
          ));
          
          position.setY(i, heightValue);
        }
        
        position.needsUpdate = true;
      }
      
      // Enhanced positioning and rotation with distance-based optimization
      const rotationIntensity = targetLOD === 'high' ? 1 : 0.5;
      // Phase 10D: Center wave planes around y=0 for better visibility
      meshRef.current.rotation.z = phase * 0.12 * rotationIntensity + 
        Math.sin(state.clock.elapsedTime * 0.5) * 0.08 * rotationIntensity;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.25 + index) * 0.2 * rotationIntensity;
      meshRef.current.position.y = index * 1.0 - 2; // Center around y=0
      meshRef.current.position.z = Math.sin(state.clock.elapsedTime * 0.3 + index * 0.8) * 0.5 * rotationIntensity;
      
    } catch (error) {
      console.error('LOD WavePlane animation error:', error);
    }
  });

  return (
    <group>      
      {/* Main wave plane */}
      <mesh 
        ref={meshRef} 
        position={[0, index * 1.0 - 2, 0]} 
        receiveShadow={qualitySettings.shadows}
        castShadow={qualitySettings.shadows}
      >
        <planeGeometry args={[10, 10, 48, 48]} />
        <meshPhongMaterial 
          color={getSafeColor(band.color)}
          wireframe={false}
          transparent
          opacity={0.9}
          emissive={getSafeColor(band.color)}
          emissiveIntensity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}