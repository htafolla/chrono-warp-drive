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

// Cascade-adaptive LOD configurations
const getCascadeLODConfigs = (cascadeLevel: number, quality: 'high' | 'medium' | 'low') => {
  const optimized = optimizeGeometry(quality, cascadeLevel);
  const baseSegments = Math.max(8, Math.floor(Math.sqrt(optimized.vertices)));

  return {
    high:    { segments: Math.min(baseSegments, 64),       maxDistance: 10 },
    medium:  { segments: Math.max(8, Math.floor(baseSegments * 0.75)), maxDistance: 20 },
    low:     { segments: Math.max(8, Math.floor(baseSegments * 0.5)),  maxDistance: 30 },
    veryLow: { segments: Math.max(8, Math.floor(baseSegments * 0.375)), maxDistance: Infinity },
  };
};

type LODLevel = 'high' | 'medium' | 'low' | 'veryLow';

export function LODWavePlane({
  band,
  phases,
  isotope,
  cycle,
  fractalToggle,
  index,
  spectrumData,
  qualitySettings = { quality: 'high', shadows: true, particles: true },
  cascadeLevel = 29,
}: LODWavePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  // memoryManager is the module singleton — no hook needed in children
  const { camera } = useThree();

  // Track current LOD level (drives JSX geometry key — single source of truth)
  const [currentLOD, setCurrentLOD] = React.useState<LODLevel>('high');

  // Resolve current LOD config (memoized so re-renders are cheap)
  const lodConfigs = useMemo(
    () => getCascadeLODConfigs(cascadeLevel, qualitySettings.quality),
    [cascadeLevel, qualitySettings.quality]
  );
  const segments = lodConfigs[currentLOD].segments;

  // Cleanup mesh resources on unmount
  useEffect(() => {
    const mesh = meshRef.current;
    return () => {
      if (mesh) memoryManager.disposeObject(mesh);
    };
  }, [memoryManager]);

  useFrame((state) => {
    if (!meshRef.current) return;

    try {
      const meshPosition = meshRef.current.position;
      const distance = camera.position.distanceTo(meshPosition);

      // LOD selection
      const qualityMultiplier =
        qualitySettings.quality === 'high' ? 1 : qualitySettings.quality === 'medium' ? 0.7 : 0.5;
      const adjustedDistance = distance / qualityMultiplier;

      let targetLOD: LODLevel = 'high';
      if (adjustedDistance > lodConfigs.low.maxDistance) targetLOD = 'veryLow';
      else if (adjustedDistance > lodConfigs.medium.maxDistance) targetLOD = 'low';
      else if (adjustedDistance > lodConfigs.high.maxDistance) targetLOD = 'medium';

      meshRef.current.visible = true;

      // Trigger React re-render to swap geometry via JSX key — no imperative buffer mutation
      if (targetLOD !== currentLOD) {
        setCurrentLOD(targetLOD);
        return; // wait one frame for new geometry to mount before mutating positions
      }

      const geometry = meshRef.current.geometry as THREE.PlaneGeometry;
      const position = geometry.attributes.position;
      if (!position) return;

      const phase = phases[index % phases.length] || 0;
      const phaseType = (cycle % 1.666) > 0.833 ? 'push' : 'pull';
      const intensityMultiplier = spectrumData
        ? spectrumData.intensities[index % spectrumData.intensities.length]
        : 1;

      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i);

        const waveValue = wave(0, state.clock.elapsedTime * 3, index, isotope, band.lambda, phaseType);
        const surfaceWave = Math.sin(x * 0.5 + z * 0.5 + phase + state.clock.elapsedTime * 2) * waveValue;
        const rippleWave = Math.sin(x * 1.2 + state.clock.elapsedTime * 2.5) * 0.8;
        const crossRipple = Math.cos(z * 1.0 + state.clock.elapsedTime * 2.0) * 0.6;
        const turbulence = Math.sin(x * z * 0.1 + state.clock.elapsedTime * 1.5) * 0.4;

        const heightValue = Math.max(
          -4,
          Math.min(4, (surfaceWave + rippleWave + crossRipple + turbulence) * 2.5 * intensityMultiplier)
        );
        position.setY(i, heightValue);
      }
      position.needsUpdate = true;

      const rotationIntensity = targetLOD === 'high' ? 1 : 0.5;
      meshRef.current.rotation.z =
        phase * 0.12 * rotationIntensity +
        Math.sin(state.clock.elapsedTime * 0.5) * 0.08 * rotationIntensity;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.25 + index) * 0.2 * rotationIntensity;
      meshRef.current.position.y = index * 0.6 - 3.3;
      meshRef.current.position.z =
        Math.sin(state.clock.elapsedTime * 0.3 + index * 0.8) * 0.5 * rotationIntensity;
    } catch (error) {
      console.error('LOD WavePlane animation error:', error);
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[0, index * 0.6 - 3.3, 0]}
        receiveShadow={qualitySettings.shadows}
        castShadow={qualitySettings.shadows}
      >
        {/* key forces geometry remount on LOD change so buffer attributes are never resized in place */}
        <planeGeometry key={`${currentLOD}-${segments}`} args={[10, 10, segments, segments]} />
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
