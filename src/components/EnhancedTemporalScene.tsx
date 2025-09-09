import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { SPECTRUM_BANDS, wave, type Isotope } from '@/lib/temporalCalculator';
import { SpectrumData } from '@/types/sdss';
import { useMemoryManager } from '@/lib/memoryManager';
import { useRenderOptimizer } from '@/lib/renderOptimizer';

interface ParticleSystemProps {
  spectrumData: SpectrumData | null;
  time: number;
  phases: number[];
}

function ParticleSystem({ spectrumData, time, phases }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const memoryManager = useMemoryManager();
  const renderOptimizer = useRenderOptimizer();
  const { camera } = useThree();
  
  // Dynamic particle count based on quality settings
  const qualitySettings = renderOptimizer.getQualitySettings();
  const particleCount = qualitySettings.particleCount;
  
  // Cleanup particles on unmount
  useEffect(() => {
    return () => {
      if (pointsRef.current) {
        memoryManager.disposeObject(pointsRef.current);
      }
    };
  }, [memoryManager]);
  
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Distribute particles in spectrum-influenced pattern
      const radius = 5 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      // Color based on spectrum data or default
      const intensity = spectrumData ? 
        spectrumData.intensities[i % spectrumData.intensities.length] : 
        Math.random();
      
      colors[i3] = 0.5 + intensity * 0.5; // Red
      colors[i3 + 1] = 0.3 + intensity * 0.4; // Green  
      colors[i3 + 2] = 0.8 + intensity * 0.2; // Blue
    }
    
    return [positions, colors];
  }, [spectrumData]);
  
  useFrame(() => {
    if (!pointsRef.current || !camera) return;
    
    const frameStartTime = performance.now();
    
    // Update render optimizer camera reference
    renderOptimizer.setCamera(camera);
    renderOptimizer.updateFrustum();
    
    // Frustum culling for particle system
    if (!renderOptimizer.isInFrustum(pointsRef.current)) {
      pointsRef.current.visible = false;
      return;
    }
    
    pointsRef.current.visible = true;
    
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;
    
    // Adaptive update rate based on distance to camera
    const distance = renderOptimizer.getDistanceToCamera(pointsRef.current);
    const lodLevel = renderOptimizer.getLODLevel(distance);
    const updateStep = lodLevel === 'high' ? 1 : lodLevel === 'medium' ? 2 : 4;
    
    for (let i = 0; i < particleCount; i += updateStep) {
      const i3 = i * 3;
      
      // Animate particles based on phases
      const phaseIndex = i % phases.length;
      const phase = phases[phaseIndex];
      
      positions[i3 + 1] += Math.sin(time * 0.01 + phase) * 0.01;
      
      // Pulse colors based on spectrum intensity
      const pulseIntensity = 0.8 + 0.2 * Math.sin(time * 0.005 + phase);
      colors[i3] *= pulseIntensity;
      colors[i3 + 1] *= pulseIntensity;
      colors[i3 + 2] *= pulseIntensity;
      
      // Fill in skipped particles for lower LOD
      if (updateStep > 1) {
        for (let j = 1; j < updateStep && i + j < particleCount; j++) {
          const j3 = (i + j) * 3;
          positions[j3 + 1] = positions[i3 + 1];
          colors[j3] = colors[i3];
          colors[j3 + 1] = colors[i3 + 1];
          colors[j3 + 2] = colors[i3 + 2];
        }
      }
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;
    
    // Record frame time for adaptive quality
    const frameTime = performance.now() - frameStartTime;
    renderOptimizer.recordFrameTime(frameTime);
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

interface WavePlaneProps {
  band: typeof SPECTRUM_BANDS[0];
  phases: number[];
  isotope: Isotope;
  cycle: number;
  fractalToggle: boolean;
  index: number;
  spectrumData: SpectrumData | null;
}

function WavePlane({ band, phases, isotope, cycle, fractalToggle, index, spectrumData }: WavePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  const memoryManager = useMemoryManager();
  const renderOptimizer = useRenderOptimizer();
  const { camera } = useThree();
  const [lastGeometryUpdate, setLastGeometryUpdate] = useState(0);
  const [lodLevel, setLodLevel] = useState<'high' | 'medium' | 'low'>('high');
  
  // Phase 1: Diagnostic logging for wave plane rendering
  React.useEffect(() => {
    console.log(`[PHASE 1 DIAGNOSTIC] WavePlane ${index} (${band.band}) initialized:`, {
      color: band.color,
      lambda: band.lambda,
      position: `y=${index * 0.6 - 3}`,
      colorParsedByThree: new THREE.Color(band.color).getHexString()
    });
  }, [band, index]);

  // Memory cleanup on unmount
  useEffect(() => {
    return () => {
      if (meshRef.current) {
        memoryManager.disposeObject(meshRef.current);
      }
      if (geometryRef.current) {
        geometryRef.current.dispose();
      }
    };
  }, [memoryManager]);
  
  useFrame((state) => {
    if (!meshRef.current || !geometryRef.current || !camera) return;
    
    try {
      const frameStartTime = performance.now();
      
      // Update render optimizer camera reference
      renderOptimizer.setCamera(camera);
      renderOptimizer.updateFrustum();
      
      // Frustum culling - skip if not visible
      if (!renderOptimizer.isInFrustum(meshRef.current)) {
        meshRef.current.visible = false;
        return;
      }
      
      meshRef.current.visible = true;
      
      // LOD system based on distance to camera
      const distance = renderOptimizer.getDistanceToCamera(meshRef.current);
      const newLodLevel = renderOptimizer.getLODLevel(distance);
      
      if (newLodLevel !== lodLevel) {
        setLodLevel(newLodLevel);
      }
      
      // Geometry optimization - only update if enough time has passed
      const now = performance.now();
      const updateInterval = newLodLevel === 'high' ? 16 : newLodLevel === 'medium' ? 33 : 50;
      
      if (renderOptimizer.shouldUpdateGeometry(lastGeometryUpdate, updateInterval)) {
        const geometry = geometryRef.current;
        const position = geometry.attributes.position;
        const phase = phases[index % phases.length] || 0;
        const phaseType = (cycle % 1.666) > 0.833 ? "push" : "pull";
        
        // Use spectrum data if available for enhanced wave calculations
        const intensityMultiplier = spectrumData ? 
          spectrumData.intensities[index % spectrumData.intensities.length] : 1;
        
        // Adaptive vertex updates based on LOD
        const stepSize = newLodLevel === 'high' ? 1 : newLodLevel === 'medium' ? 2 : 4;
        
        // Enhanced wave calculations with more dramatic movement
        for (let i = 0; i < position.count; i += stepSize) {
          const x = position.getX(i);
          const z = position.getZ(i);
          
          const waveValue = wave(0, state.clock.elapsedTime, index, isotope, band.lambda, phaseType);
          const secondaryWave = Math.sin(x * 0.5 + state.clock.elapsedTime * 0.8) * 0.3;
          const heightValue = Math.max(-4, Math.min(4, 
            (waveValue * Math.sin(x + z + phase) + secondaryWave) * 0.6 * intensityMultiplier
          ));
          
          position.setY(i, heightValue);
          
          // Fill in skipped vertices for medium/low LOD
          if (stepSize > 1) {
            for (let j = 1; j < stepSize && i + j < position.count; j++) {
              position.setY(i + j, heightValue);
            }
          }
        }
        
        position.needsUpdate = true;
        setLastGeometryUpdate(now);
      }
      
      // Enhanced positioning and rotation with more dynamic movement
      const phase = phases[index % phases.length] || 0;
      meshRef.current.rotation.z = phase * 0.08 + Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15 + index) * 0.15;
      meshRef.current.position.y = index * 0.6 - 3;
      meshRef.current.position.z = Math.sin(state.clock.elapsedTime * 0.2 + index * 0.5) * 0.3;
      
      // Record frame time for adaptive quality
      const frameTime = performance.now() - frameStartTime;
      renderOptimizer.recordFrameTime(frameTime);
      
    } catch (error) {
      console.error('Enhanced WavePlane animation error:', error);
    }
  });

  // Get adaptive geometry segments and material settings based on LOD and quality
  const qualitySettings = renderOptimizer.getQualitySettings();
  const lodSegments = lodLevel === 'high' ? qualitySettings.geometrySegments : 
                     lodLevel === 'medium' ? Math.max(16, qualitySettings.geometrySegments / 2) :
                     Math.max(8, qualitySettings.geometrySegments / 4);

  return (
    <mesh ref={meshRef} position={[0, index * 0.6 - 3, 0]} receiveShadow>
      <planeGeometry 
        ref={geometryRef} 
        args={[10, 10, lodSegments, lodSegments]} 
      />
      <meshPhongMaterial 
        color={band.color}
        wireframe={qualitySettings.wireframeOnly}
        transparent
        opacity={lodLevel === 'high' ? 0.7 : lodLevel === 'medium' ? 0.5 : 0.3}
        emissive={band.color}
        emissiveIntensity={lodLevel === 'high' ? 0.15 : lodLevel === 'medium' ? 0.1 : 0.05}
      />
    </mesh>
  );
}

interface PostProcessingProps {
  children: React.ReactNode;
}

function PostProcessing({ children }: PostProcessingProps) {
  const { gl, scene, camera } = useThree();
  const renderOptimizer = useRenderOptimizer();
  
  useEffect(() => {
    const qualitySettings = renderOptimizer.getQualitySettings();
    
    // Enhanced rendering settings with adaptive quality
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.2;
    gl.shadowMap.enabled = qualitySettings.enableShadows;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl, renderOptimizer]);
  
  return <>{children}</>;
}

interface EnhancedTemporalSceneProps {
  phases: number[];
  isotope: Isotope;
  cycle: number;
  fractalToggle: boolean;
  spectrumData?: SpectrumData | null;
  time: number;
}

export function EnhancedTemporalScene({ 
  phases, 
  isotope, 
  cycle, 
  fractalToggle, 
  spectrumData = null,
  time 
}: EnhancedTemporalSceneProps) {
  const memoryManager = useMemoryManager();
  const renderOptimizer = useRenderOptimizer();
  const qualitySettings = renderOptimizer.getQualitySettings();
  
  return (
    <div className="w-full h-full min-h-[600px] bg-background rounded-lg overflow-hidden" data-testid="enhanced-temporal-scene">
      <Canvas 
        key={`enhanced-scene-${isotope.type}-${fractalToggle}-${qualitySettings.particleCount}`}
        camera={{ position: [8, 6, 12], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl, scene }) => {
          console.log('[ENHANCED SCENE] Canvas initialized with quality:', renderOptimizer.getCurrentQualityKeyPublic());
          gl.setClearColor('#000000', 0);
        }}
      >
        <PostProcessing>
          {/* Adaptive Lighting System based on quality settings */}
          <ambientLight intensity={0.6} />
          <directionalLight 
            position={[-10, 10, 5]} 
            intensity={1.2}
            color="#7c3aed"
            castShadow={qualitySettings.enableShadows}
            shadow-mapSize-width={qualitySettings.shadowMapSize}
            shadow-mapSize-height={qualitySettings.shadowMapSize}
            shadow-camera-near={0.5}
            shadow-camera-far={50}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          <pointLight 
            position={[10, 10, 10]} 
            intensity={1.0} 
            color="#ffffff"
          />
          <pointLight 
            position={[0, -8, 8]} 
            intensity={0.8} 
            color="#3b82f6"
          />
          {qualitySettings.enableShadows && (
            <spotLight
              position={[0, 15, 0]}
              angle={0.3}
              penumbra={1}
              intensity={0.8}
              color="#fbbf24"
            />
          )}
          
          {/* Optimized Particle System */}
          <ParticleSystem 
            spectrumData={spectrumData}
            time={time}
            phases={phases}
          />
          
          {/* Optimized Wave Planes with LOD */}
          {SPECTRUM_BANDS.map((band, index) => (
            <WavePlane
              key={band.band}
              band={band}
              phases={phases}
              isotope={isotope}
              cycle={cycle}
              fractalToggle={fractalToggle}
              index={index}
              spectrumData={spectrumData}
            />
          ))}
          
          {/* Conditional Background Stars based on quality */}
          {!qualitySettings.wireframeOnly && (
            <Stars 
              radius={100} 
              depth={50} 
              count={qualitySettings.particleCount > 1000 ? 5000 : 2000} 
              factor={4} 
              saturation={0} 
              fade
            />
          )}
          
          {/* Enhanced Controls */}
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            maxDistance={qualitySettings.maxDistance}
            minDistance={5}
            autoRotate={false}
            autoRotateSpeed={0.5}
            dampingFactor={0.05}
            enableDamping
          />
        </PostProcessing>
      </Canvas>
      
      {/* Enhanced Overlay Info with Render Optimization Status */}
      <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-md border border-border rounded-lg p-4 text-card-foreground shadow-lg">
        <div className="text-sm font-medium space-y-1">
          <p>Isotope: <span className="text-primary font-mono">{isotope.type}</span></p>
          <p>Fractal: <span className={fractalToggle ? "text-accent" : "text-secondary"}>{fractalToggle ? "ON" : "OFF"}</span></p>
          {spectrumData && (
            <p>Source: <span className="text-blue-400 font-mono">{spectrumData.source}</span></p>
          )}
          <p>Particles: <span className="text-green-400 font-mono">{qualitySettings.particleCount}</span></p>
          <p>Wave Planes: <span className="text-purple-400 font-mono">{SPECTRUM_BANDS.length}</span></p>
          <p>Quality: <span className="text-orange-400 font-mono">{renderOptimizer.getCurrentQualityKeyPublic()}</span></p>
        </div>
        <div className="text-xs text-muted-foreground mt-3 space-y-1">
          <p>• Drag to rotate • Scroll to zoom</p>
          <p>• LOD optimization active</p>
          <p>• Adaptive quality enabled</p>
        </div>
      </div>
      
      {/* Performance Info with Render Optimization Details */}
      <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-md border border-border rounded-lg p-3 text-card-foreground shadow-lg">
        <div className="text-xs space-y-1">
          <p>Render: <span className="text-green-400">Optimized</span></p>
          <p>Shadows: <span className={qualitySettings.enableShadows ? "text-blue-400" : "text-gray-400"}>
            {qualitySettings.enableShadows ? "Enabled" : "Disabled"}
          </span></p>
          <p>Frustum: <span className="text-purple-400">Culled</span></p>
          <p>LOD: <span className="text-yellow-400">Dynamic</span></p>
          <p>Geometry: <span className="text-orange-400">{qualitySettings.geometrySegments}×{qualitySettings.geometrySegments}</span></p>
        </div>
      </div>
    </div>
  );
}