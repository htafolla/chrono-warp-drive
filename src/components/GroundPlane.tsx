import React, { useRef } from 'react';
import * as THREE from 'three';

export function GroundPlane() {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh 
      ref={meshRef} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -8, 0]} 
      receiveShadow
    >
      <planeGeometry args={[40, 40]} />
      <meshPhongMaterial 
        color="#1a1a2e"
        transparent
        opacity={0.1}
      />
    </mesh>
  );
}