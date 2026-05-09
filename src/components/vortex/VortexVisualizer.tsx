import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

interface VortexVisualizerProps {
  isotopicRatio: number;
  vortexVolume: number;
}

function VortexMesh({ isotopicRatio, vortexVolume }: VortexVisualizerProps) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      groupRef.current.scale.setScalar(0.8 + isotopicRatio * 0.4);
    }
  });

  const intensity = Math.min(vortexVolume / 1e25, 2);

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 0]}>
        <coneGeometry args={[1.2, 2.4, 3]} />
        <meshStandardMaterial 
          color="#4f46e5" 
          wireframe 
          emissive="#6366f1"
          emissiveIntensity={intensity * 0.3}
        />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.25]} />
        <meshStandardMaterial 
          color="#a5b4fc" 
          emissive="#c7d2fe"
          emissiveIntensity={intensity}
        />
      </mesh>

      {[0, 1, 2].map((i) => (
        <mesh 
          key={i} 
          position={[
            Math.cos(Date.now() / 800 + i) * 1.8,
            Math.sin(Date.now() / 600 + i) * 0.8,
            Math.sin(Date.now() / 900 + i) * 1.2,
          ]}
        >
          <sphereGeometry args={[0.08]} />
          <meshStandardMaterial color="#bae6fd" emissive="#bae6fd" />
        </mesh>
      ))}
    </group>
  );
}

export function VortexVisualizer({ isotopicRatio, vortexVolume }: VortexVisualizerProps) {
  return (
    <div className="h-[420px] w-full rounded-lg overflow-hidden bg-black/90">
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.2} />
        <VortexMesh isotopicRatio={isotopicRatio} vortexVolume={vortexVolume} />
        <Stars radius={300} depth={50} count={300} factor={2} />
        <OrbitControls enablePan={false} minDistance={3} maxDistance={12} />
      </Canvas>
    </div>
  );
}
