import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import { TPTTv4_6Result } from '@/types/blurrn-v4-6';
import { deterministicSpherical, generateCycle } from '@/lib/deterministicUtils';
import * as THREE from 'three';

interface BlackHoleLightVisualizerProps {
  tpttV46Result?: TPTTv4_6Result | null;
  isActive: boolean;
  width?: number;
  height?: number;
}

interface HiddenLightParticlesProps {
  hiddenLightData: number[];
  tdfValue: number;
  isActive: boolean;
}

function HiddenLightParticles({ hiddenLightData, tdfValue, isActive }: HiddenLightParticlesProps) {
  const meshRef = useRef<THREE.Points>(null);
  const cycle = generateCycle();

  // Generate deterministic particle positions based on hidden light data
  const particles = useMemo(() => {
    const positions = new Float32Array(hiddenLightData.length * 3);
    const colors = new Float32Array(hiddenLightData.length * 3);
    const sizes = new Float32Array(hiddenLightData.length);

    hiddenLightData.forEach((lightValue, i) => {
      const pos = deterministicSpherical(cycle, i, 2, 3);
      
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y; 
      positions[i * 3 + 2] = pos.z;

      // Color based on light intensity - warmer colors for stronger light
      const intensity = Math.abs(lightValue);
      colors[i * 3] = 0.8 + intensity * 0.2;     // Red
      colors[i * 3 + 1] = 0.6 + intensity * 0.3; // Green  
      colors[i * 3 + 2] = 0.9;                   // Blue

      // Size based on TDF value and light intensity
      sizes[i] = (0.5 + intensity * 2) * Math.min(tdfValue / 1e12, 2);
    });

    return { positions, colors, sizes };
  }, [hiddenLightData, tdfValue, cycle]);

  // Animate particles based on TDF oscillation
  useFrame((state) => {
    if (!meshRef.current || !isActive) return;

    const time = state.clock.getElapsedTime();
    const geometry = meshRef.current.geometry;
    
    if (geometry.attributes.position) {
      const positions = geometry.attributes.position.array as Float32Array;
      const originalPositions = particles.positions;
      
      // Apply subtle oscillation to simulate light capture/release
      for (let i = 0; i < positions.length; i += 3) {
        const oscillation = Math.sin(time * 2 + i * 0.1) * 0.1;
        positions[i] = originalPositions[i] + oscillation;
        positions[i + 1] = originalPositions[i + 1] + oscillation * 0.5;
        positions[i + 2] = originalPositions[i + 2] + oscillation;
      }
      
      geometry.attributes.position.needsUpdate = true;
    }

    // Rotate the entire particle system slowly
    meshRef.current.rotation.y = time * 0.1;
    meshRef.current.rotation.x = Math.sin(time * 0.05) * 0.1;
  });

  return (
    <Points ref={meshRef} positions={particles.positions} colors={particles.colors}>
      <PointMaterial 
        transparent 
        vertexColors
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

function BlackHoleCore({ tdfValue, tau }: { tdfValue: number; tau: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    
    // Scale based on TDF value
    const scale = 0.3 + Math.min(tdfValue / 1e13, 0.7);
    meshRef.current.scale.setScalar(scale);

    // Rotate based on tau (time dilation)
    meshRef.current.rotation.y = time * tau;
    meshRef.current.rotation.x = time * tau * 0.3;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial 
        color="#000000" 
        transparent 
        opacity={0.8}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

function Scene({ tpttV46Result, isActive }: { tpttV46Result?: TPTTv4_6Result | null; isActive: boolean }) {
  if (!tpttV46Result) {
    return (
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="hsl(var(--muted))" />
      </mesh>
    );
  }

  const { v46_components, timeShiftMetrics } = tpttV46Result;

  return (
    <>
      {/* Black hole core */}
      <BlackHoleCore 
        tdfValue={v46_components.TDF_value} 
        tau={v46_components.tau} 
      />
      
      {/* Hidden light particles */}
      <HiddenLightParticles
        hiddenLightData={timeShiftMetrics.hiddenLightRevealed}
        tdfValue={v46_components.TDF_value}
        isActive={isActive}
      />
      
      {/* Ambient lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
    </>
  );
}

export function BlackHoleLightVisualizer({ 
  tpttV46Result, 
  isActive, 
  width = 400, 
  height = 300 
}: BlackHoleLightVisualizerProps) {
  return (
    <div 
      className="relative border rounded-lg overflow-hidden bg-background"
      style={{ width, height }}
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene tpttV46Result={tpttV46Result} isActive={isActive} />
      </Canvas>
      
      {/* Status overlay */}
      <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded px-2 py-1 text-xs">
        {tpttV46Result ? (
          <>
            Hidden Light: {tpttV46Result.timeShiftMetrics.hiddenLightRevealed.length} patterns
            {tpttV46Result.timeShiftMetrics.breakthrough_validated && (
              <span className="ml-2 text-green-500">● Breakthrough</span>
            )}
          </>
        ) : (
          'Initializing...'
        )}
      </div>
    </div>
  );
}