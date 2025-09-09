import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CustomStarsProps {
  radius?: number;
  depth?: number;
  count?: number;
  factor?: number;
  saturation?: number;
  fade?: boolean;
  speed?: number;
}

export function CustomStars({
  radius = 100,
  depth = 50,
  count = 3000,
  factor = 4,
  saturation = 0.4,
  fade = false,
  speed = 0.1
}: CustomStarsProps) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const [positions, colors, scales] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    
    // Generate deterministic star positions and colors
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Generate deterministic spherical distribution using index-based seeds
      const r = radius + (i / count) * depth;
      const theta = (i / count) * Math.PI * 2;
      const phi = Math.acos(2 * (i / count) - 1);
      
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);
      
      // Generate deterministic white/yellow colors with subtle variation
      const baseIntensity = 0.8 + (Math.sin(i * 0.1) * 0.5 + 0.5) * 0.2;
      const colorVariation = (Math.cos(i * 0.15) * 0.5 + 0.5) * 0.1;
      
      // Create white stars with slight yellow tint
      colors[i3] = baseIntensity; // Red
      colors[i3 + 1] = baseIntensity - colorVariation * 0.1; // Green (slightly less for warmth)
      colors[i3 + 2] = baseIntensity - colorVariation * 0.2; // Blue (less for warmth)
      
      // Deterministic scale for star size variation
      scales[i] = 0.5 + (Math.sin(i * 0.2) * 0.5 + 0.5) * 0.5;
    }
    
    return [positions, colors, scales];
  }, [count, radius, depth]);
  
  // Subtle twinkling animation (only if fade is enabled)
  useFrame(({ clock }) => {
    if (!pointsRef.current || !fade) return;
    
    const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;
    const scales = pointsRef.current.geometry.attributes.scale.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Very subtle twinkling based on time and star position
      const twinkleSpeed = speed * 0.5;
      const twinkleFactor = 0.9 + 0.1 * Math.sin(clock.elapsedTime * twinkleSpeed + i * 0.1);
      
      // Apply twinkling to brightness, not color
      const baseR = positions[i3] > 0 ? 0.9 : 0.8;
      const baseG = baseR - 0.05;
      const baseB = baseR - 0.1;
      
      colors[i3] = baseR * twinkleFactor;
      colors[i3 + 1] = baseG * twinkleFactor;
      colors[i3 + 2] = baseB * twinkleFactor;
      
      // Deterministic scale twinkling
      scales[i] = (0.5 + (Math.sin(i * 0.3 + clock.elapsedTime) * 0.5 + 0.5) * 0.5) * twinkleFactor;
    }
    
    pointsRef.current.geometry.attributes.color.needsUpdate = true;
    pointsRef.current.geometry.attributes.scale.needsUpdate = true;
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-scale"
          count={count}
          array={scales}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={factor}
        sizeAttenuation={false}
        vertexColors
        transparent
        opacity={0.95}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}