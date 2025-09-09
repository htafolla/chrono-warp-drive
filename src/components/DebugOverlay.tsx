import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SPECTRUM_BANDS } from '@/lib/temporalCalculator';

interface DebugOverlayProps {
  showWireframes?: boolean;
  showBounds?: boolean;
  showInfo?: boolean;
  opacity?: number;
}

export function DebugOverlay({ 
  showWireframes = false, 
  showBounds = false, 
  showInfo = false,
  opacity = 0.3
}: DebugOverlayProps) {
  const boundsRefs = useRef<THREE.Mesh[]>([]);
  const wireframeRefs = useRef<THREE.Mesh[]>([]);
  const { camera } = useThree();

  useFrame((state) => {
    // Animate debug elements if needed
    wireframeRefs.current.forEach((mesh, index) => {
      if (mesh) {
        mesh.rotation.z = Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.02;
      }
    });
  });

  if (!showWireframes && !showBounds) {
    return null;
  }

  return (
    <group name="debug-overlay">
      {/* Debug Wireframes */}
      {showWireframes && SPECTRUM_BANDS.map((band, index) => (
        <mesh 
          key={`wireframe-${index}`}
          ref={(ref) => { if (ref) wireframeRefs.current[index] = ref; }}
          position={[0, index * 0.6 - 3, 0]}
        >
          <planeGeometry args={[10, 10, 48, 48]} />
          <meshBasicMaterial 
            color="#00ff00"
            wireframe={true}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}
      
      {/* Debug Bounds Markers */}
      {showBounds && SPECTRUM_BANDS.map((band, index) => (
        <mesh 
          key={`bounds-${index}`}
          ref={(ref) => { if (ref) boundsRefs.current[index] = ref; }}
          position={[0, index * 0.6 - 3, 0]}
        >
          <boxGeometry args={[12, 0.1, 12]} />
          <meshBasicMaterial 
            color="#ff0000" 
            opacity={opacity * 0.5} 
            transparent 
            wireframe 
          />
        </mesh>
      ))}
      
      {/* Debug Info Overlay */}
      {showInfo && (
        <mesh position={[0, 5, 0]}>
          <planeGeometry args={[2, 1]} />
          <meshBasicMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.8}
          />
        </mesh>
      )}
    </group>
  );
}