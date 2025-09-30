import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import * as THREE from 'three';

interface EntanglementVizProps {
  deltaPhase: number;
  n: number;
  q_ent?: number;
}

const EntanglementSphere = ({ deltaPhase, n, q_ent }: EntanglementVizProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Calculate quantum entanglement if not provided
  const quantumEnt = useMemo(() => {
    if (q_ent !== undefined) return q_ent;
    
    const phi = 1.666;
    const cti = 0.996; // Normalized CTI for visualization
    return Math.abs(
      cti * (Math.cos((phi * n) / 2) / Math.PI) * 
      Math.sin((phi * n) / 4) * 
      Math.exp(-n / 20)
    ) * (1 + deltaPhase) * Math.log(n + 1);
  }, [deltaPhase, n, q_ent]);

  // Scale sphere based on entanglement strength
  const scale = useMemo(() => {
    return Math.max(0.5, Math.min(3, quantumEnt * 30));
  }, [quantumEnt]);

  // Color based on entanglement strength
  const color = useMemo(() => {
    const hue = 0.7 - (quantumEnt * 0.3); // Purple to blue
    return new THREE.Color().setHSL(hue, 0.8, 0.6);
  }, [quantumEnt]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.005;
      meshRef.current.rotation.y += 0.01;
      
      // Pulsing effect based on quantum entanglement
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 1;
      meshRef.current.scale.setScalar(scale * pulse);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3}
        metalness={0.8}
        roughness={0.2}
        wireframe={false}
      />
    </mesh>
  );
};

const EntanglementViz = ({ deltaPhase, n, q_ent }: EntanglementVizProps) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Quantum Entanglement Visualization</span>
          <Badge variant="outline" className="font-mono">
            Q_ent: {q_ent?.toFixed(4) || 'Calculating...'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[400px] rounded-lg overflow-hidden bg-background border">
          <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4a00ff" />
            
            <EntanglementSphere 
              deltaPhase={deltaPhase} 
              n={n} 
              q_ent={q_ent}
            />
            
            {/* Background grid */}
            <gridHelper args={[20, 20, '#333', '#111']} />
            
            <OrbitControls 
              enableZoom={true}
              enablePan={true}
              maxDistance={10}
              minDistance={2}
            />
          </Canvas>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center p-2 rounded-lg bg-muted">
            <div className="text-xs text-muted-foreground">Delta Phase</div>
            <div className="font-mono text-sm">{deltaPhase.toFixed(3)}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted">
            <div className="text-xs text-muted-foreground">Cascade n</div>
            <div className="font-mono text-sm">{n}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted">
            <div className="text-xs text-muted-foreground">Sync Status</div>
            <div className="font-mono text-sm">Active</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EntanglementViz;
