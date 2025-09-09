import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { SPECTRUM_BANDS, wave, type Isotope } from '@/lib/temporalCalculator';
import { SpectrumData } from '@/types/sdss';
import { usePerformanceOptimizer } from '@/contexts/PerformanceContext';

interface ParticleSystemProps {
  spectrumData: SpectrumData | null;
  time: number;
  phases: number[];
}

function ParticleSystem({ spectrumData, time, phases }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const performanceOptimizer = usePerformanceOptimizer();
  
  // Adaptive particle count based on performance
  const particleCount = useMemo(() => {
    if (!performanceOptimizer) return 150;
    const quality = performanceOptimizer.getAdaptiveQuality();
    switch (quality) {
      case 'high': return 200;
      case 'medium': return 150;
      case 'low': return 100;
      default: return 150;
    }
  }, [performanceOptimizer]);
  
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
    if (!pointsRef.current || !performanceOptimizer) return;
    
    // Frame rate limiting - only update when performance allows
    if (!performanceOptimizer.shouldProcessFrame()) return;
    
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;
    
    // Adaptive update rate based on performance
    const quality = performanceOptimizer.getAdaptiveQuality();
    const skipFactor = quality === 'low' ? 3 : quality === 'medium' ? 2 : 1;
    
    for (let i = 0; i < particleCount; i += skipFactor) {
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
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;
  });
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pointsRef.current) {
        pointsRef.current.geometry.dispose();
        (pointsRef.current.material as THREE.Material).dispose();
      }
    };
  }, []);
  
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
  const performanceOptimizer = usePerformanceOptimizer();
  
  useFrame((state) => {
    if (!meshRef.current || !geometryRef.current || !performanceOptimizer) return;
    
    // Less restrictive frame limiting - allow more animation updates
    const quality = performanceOptimizer.getAdaptiveQuality();
    if (quality === 'low' && !performanceOptimizer.shouldProcessFrame()) return;
    
    try {
      const geometry = geometryRef.current;
      const position = geometry.attributes.position;
      const phase = phases[index % phases.length] || 0;
      const phaseType = (cycle % 1.666) > 0.833 ? "push" : "pull";
      
      // Use spectrum data if available for enhanced wave calculations
      const intensityMultiplier = spectrumData ? 
        spectrumData.intensities[index % spectrumData.intensities.length] : 1;
      
      // Adaptive quality - skip vertices based on performance
      const quality = performanceOptimizer.getAdaptiveQuality();
      const vertexSkip = quality === 'low' ? 4 : quality === 'medium' ? 2 : 1;
      
      // Update vertices with enhanced wave calculations
      for (let i = 0; i < position.count; i += vertexSkip) {
        const x = position.getX(i);
        const z = position.getZ(i);
        
        // Simplified wave calculation with bounds checking
        const waveValue = wave(x, state.clock.elapsedTime * 0.5, index, isotope, band.lambda, phaseType);
        const secondaryWave = Math.sin(z * 0.3 + state.clock.elapsedTime * 1.5) * 0.15;
        const combinedWave = waveValue * Math.sin(x * 0.5 + z * 0.5 + phase) + secondaryWave;
        
        // Enhanced bounds checking to prevent runaway values
        const heightValue = Math.max(-1.5, Math.min(1.5, 
          combinedWave * 0.4 * intensityMultiplier
        ));
        
        // Validate height value before setting
        if (isFinite(heightValue) && !isNaN(heightValue)) {
          position.setY(i, heightValue);
        }
      }
      
      position.needsUpdate = true;
      
      // Smoother wave plane positioning and rotation
      meshRef.current.rotation.z = phase * 0.03 + Math.sin(state.clock.elapsedTime * 0.2) * 0.01;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08 + index) * 0.1;
      meshRef.current.position.y = index * 1.2 - 5 + Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.2;
      
    } catch (error) {
      console.error('Enhanced WavePlane animation error:', error);
    }
  });
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (geometryRef.current) {
        geometryRef.current.dispose();
      }
      if (meshRef.current) {
        (meshRef.current.material as THREE.Material).dispose();
      }
    };
  }, []);

  return (
    <mesh ref={meshRef} position={[0, index * 1.2 - 5, 0]} castShadow receiveShadow>
      <planeGeometry 
        ref={geometryRef} 
        args={[10, 10, 16, 16]} 
      />
      <meshPhongMaterial 
        color={band.color}
        wireframe
        transparent
        opacity={0.8}
        emissive={band.color}
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}

interface PostProcessingProps {
  children: React.ReactNode;
}

function PostProcessing({ children }: PostProcessingProps) {
  const { gl } = useThree();
  const performanceOptimizer = usePerformanceOptimizer();
  
  useEffect(() => {
    if (!performanceOptimizer) return;
    
    // Adaptive rendering settings based on performance
    const quality = performanceOptimizer.getAdaptiveQuality();
    
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.2;
    
    // Enable shadows with performance optimization
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = quality === 'low' ? THREE.BasicShadowMap : THREE.PCFShadowMap;
    
    // Adaptive antialias based on performance
    if (quality === 'low') {
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    } else {
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
  }, [gl, performanceOptimizer]);
  
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
  const performanceOptimizer = usePerformanceOptimizer();
  
  // Adaptive star count based on performance
  const starCount = useMemo(() => {
    if (!performanceOptimizer) return 1000;
    const quality = performanceOptimizer.getAdaptiveQuality();
    switch (quality) {
      case 'high': return 2000;
      case 'medium': return 1000;
      case 'low': return 500;
      default: return 1000;
    }
  }, [performanceOptimizer]);
  return (
    <div className="w-full h-full min-h-[600px] bg-background rounded-lg overflow-hidden" data-testid="enhanced-temporal-scene">
      <Canvas 
        camera={{ position: [8, 6, 12], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        shadows
      >
        <PostProcessing>
          {/* Enhanced Lighting System with Shadows */}
          <ambientLight intensity={0.3} />
          <pointLight 
            position={[10, 10, 10]} 
            intensity={1.2} 
            color="#ffffff"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-bias={-0.0001}
          />
          <directionalLight 
            position={[-10, 10, 5]} 
            intensity={0.8}
            color="#7c3aed"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={50}
            shadow-camera-left={-15}
            shadow-camera-right={15}
            shadow-camera-top={15}
            shadow-camera-bottom={-15}
            shadow-bias={-0.0001}
          />
          <pointLight 
            position={[0, -5, 8]} 
            intensity={0.4} 
            color="#3b82f6"
            castShadow
            shadow-bias={-0.0001}
          />
          
          {/* Particle System */}
          <ParticleSystem 
            spectrumData={spectrumData}
            time={time}
            phases={phases}
          />
          
          {/* Enhanced Wave Planes */}
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
          
          {/* Adaptive Background Stars - Fixed colors */}
          <Stars 
            radius={100} 
            depth={50} 
            count={starCount} 
            factor={2} 
            saturation={0.5} 
            fade
          />
          
          {/* Enhanced Controls with Preset Paths */}
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            maxDistance={30}
            minDistance={5}
            autoRotate={false}
            autoRotateSpeed={0.5}
            dampingFactor={0.05}
            enableDamping
          />
        </PostProcessing>
      </Canvas>
      
      {/* Enhanced Overlay Info */}
      <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-md border border-border rounded-lg p-4 text-card-foreground shadow-lg">
        <div className="text-sm font-medium space-y-1">
          <p>Isotope: <span className="text-primary font-mono">{isotope.type}</span></p>
          <p>Fractal: <span className={fractalToggle ? "text-accent" : "text-secondary"}>{fractalToggle ? "ON" : "OFF"}</span></p>
          {spectrumData && (
            <p>Source: <span className="text-blue-400 font-mono">{spectrumData.source}</span></p>
          )}
          <p>Particles: <span className="text-green-400 font-mono">{starCount}</span></p>
          <p>Wave Planes: <span className="text-cyan-400 font-mono">{SPECTRUM_BANDS.length}</span></p>
        </div>
        <div className="text-xs text-muted-foreground mt-3 space-y-1">
          <p>• Drag to rotate • Scroll to zoom</p>
          <p>• Enhanced lighting & shadows</p>
          <p>• Optimized wave animations</p>
        </div>
      </div>
      
      {/* Performance Info */}
      <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-md border border-border rounded-lg p-3 text-card-foreground shadow-lg">
        <div className="text-xs space-y-1">
          <p>Quality: <span className={`font-mono ${performanceOptimizer?.getAdaptiveQuality() === 'high' ? 'text-green-400' : performanceOptimizer?.getAdaptiveQuality() === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>
            {performanceOptimizer?.getAdaptiveQuality()?.toUpperCase() || 'LOADING'}
          </span></p>
          <p>FPS: <span className="text-blue-400 font-mono">{performanceOptimizer?.getCurrentFPS().toFixed(0) || '---'}</span></p>
          <p>Shadows: <span className="text-green-400">Optimized</span></p>
          <p>Stars: <span className="text-purple-400">Colored</span></p>
        </div>
      </div>
    </div>
  );
}