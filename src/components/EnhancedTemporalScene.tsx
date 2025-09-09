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
      const vertexSkip = quality === 'low' ? 3 : quality === 'medium' ? 2 : 1;
      
      // Update vertices with simplified wave calculations
      for (let i = 0; i < position.count; i += vertexSkip) {
        const x = position.getX(i);
        const z = position.getZ(i);
        
        // Simplified wave calculation with bounds checking
        const waveValue = wave(x, state.clock.elapsedTime * 0.8, index, isotope, band.lambda, phaseType);
        const secondaryWave = Math.sin(z * 0.2 + state.clock.elapsedTime * 1.2) * 0.1;
        const combinedWave = waveValue * Math.sin(x * 0.3 + z * 0.3 + phase) + secondaryWave;
        
        // Enhanced bounds checking to prevent runaway values
        const heightValue = Math.max(-1.0, Math.min(1.0, 
          combinedWave * 0.3 * intensityMultiplier
        ));
        
        // Validate height value before setting
        if (isFinite(heightValue) && !isNaN(heightValue)) {
          position.setY(i, heightValue);
        }
      }
      
      position.needsUpdate = true;
      
      // Improved wave plane positioning with better spacing
      meshRef.current.rotation.z = phase * 0.02 + Math.sin(state.clock.elapsedTime * 0.15) * 0.008;
      meshRef.current.rotation.x = Math.PI / 6 + Math.sin(state.clock.elapsedTime * 0.1 + index) * 0.05;
      meshRef.current.position.y = index * 2.0 - 6 + Math.sin(state.clock.elapsedTime * 0.4 + index) * 0.15;
      
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

  // Calculate material colors to avoid black artifacts
  const baseColor = new THREE.Color(band.color);
  const emissiveColor = baseColor.clone().multiplyScalar(0.2);

  return (
    <mesh ref={meshRef} position={[0, index * 2.0 - 6, 0]} castShadow receiveShadow>
      <planeGeometry 
        ref={geometryRef} 
        args={[12, 12, 12, 12]} 
      />
      <meshStandardMaterial 
        color={baseColor}
        emissive={emissiveColor}
        emissiveIntensity={0.4}
        transparent
        opacity={0.85}
        roughness={0.3}
        metalness={0.1}
        side={THREE.DoubleSide}
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

interface DebugState {
  wireframe: boolean;
  showColors: boolean;
  showBounds: boolean;
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
  const [debugState, setDebugState] = React.useState<DebugState>({
    wireframe: false,
    showColors: false,
    showBounds: false
  });
  
  // Adaptive star count based on performance
  const starCount = useMemo(() => {
    if (!performanceOptimizer) return 1000;
    const quality = performanceOptimizer.getAdaptiveQuality();
    switch (quality) {
      case 'high': return 1500;
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
          {/* Optimized Lighting System */}
          <ambientLight intensity={0.4} />
          <pointLight 
            position={[12, 8, 10]} 
            intensity={1.0} 
            color="#ffffff"
            castShadow
            shadow-mapSize-width={512}
            shadow-mapSize-height={512}
            shadow-bias={-0.0005}
            shadow-camera-near={0.1}
            shadow-camera-far={25}
          />
          <directionalLight 
            position={[-8, 12, 6]} 
            intensity={0.6}
            color="#8b5cf6"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-far={30}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
            shadow-bias={-0.0005}
          />
          <spotLight 
            position={[0, 8, 12]} 
            intensity={0.3} 
            color="#06b6d4"
            angle={Math.PI / 6}
            penumbra={1}
            castShadow
            shadow-bias={-0.0005}
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
          
          {/* Adaptive Background Stars - Colorful */}
          <Stars 
            radius={120} 
            depth={60} 
            count={starCount} 
            factor={1.5} 
            saturation={0.8} 
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
      
      {/* Enhanced Overlay Info with Debug Controls */}
      <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-md border border-border rounded-lg p-4 text-card-foreground shadow-lg max-w-xs">
        <div className="text-sm font-medium space-y-1">
          <p>Isotope: <span className="text-primary font-mono">{isotope.type}</span></p>
          <p>Fractal: <span className={fractalToggle ? "text-accent" : "text-secondary"}>{fractalToggle ? "ON" : "OFF"}</span></p>
          {spectrumData && (
            <p>Source: <span className="text-blue-400 font-mono text-xs">{spectrumData.source}</span></p>
          )}
          <p>Stars: <span className="text-green-400 font-mono">{starCount}</span></p>
          <p>Planes: <span className="text-cyan-400 font-mono">{SPECTRUM_BANDS.length}</span></p>
        </div>
        
        {/* Debug Controls */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-2">Debug Options:</p>
          <div className="space-y-1">
            <label className="flex items-center text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={debugState.wireframe}
                onChange={(e) => setDebugState(prev => ({ ...prev, wireframe: e.target.checked }))}
                className="mr-2 scale-75"
              />
              Wireframe Mode
            </label>
            <label className="flex items-center text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={debugState.showColors}
                onChange={(e) => setDebugState(prev => ({ ...prev, showColors: e.target.checked }))}
                className="mr-2 scale-75"
              />
              Color Debug
            </label>
            <label className="flex items-center text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={debugState.showBounds}
                onChange={(e) => setDebugState(prev => ({ ...prev, showBounds: e.target.checked }))}
                className="mr-2 scale-75"
              />
              Show Bounds
            </label>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground mt-3 space-y-1">
          <p>• Drag to rotate • Scroll to zoom</p>
          <p>• Solid wave surfaces with enhanced colors</p>
          <p>• Optimized performance & shadows</p>
        </div>
      </div>
      
      {/* Performance & Status Info */}
      <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-md border border-border rounded-lg p-3 text-card-foreground shadow-lg">
        <div className="text-xs space-y-1">
          <p>Quality: <span className={`font-mono ${performanceOptimizer?.getAdaptiveQuality() === 'high' ? 'text-green-400' : performanceOptimizer?.getAdaptiveQuality() === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>
            {performanceOptimizer?.getAdaptiveQuality()?.toUpperCase() || 'LOADING'}
          </span></p>
          <p>FPS: <span className="text-blue-400 font-mono">{performanceOptimizer?.getCurrentFPS().toFixed(0) || '---'}</span></p>
          <p>Material: <span className="text-green-400">Standard</span></p>
          <p>Shadows: <span className="text-cyan-400">Enhanced</span></p>
          <p>Stars: <span className="text-purple-400">Colorful</span></p>
          <p>Spacing: <span className="text-yellow-400">Fixed</span></p>
        </div>
        
        {debugState.showColors && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-1">Wave Colors:</p>
            <div className="grid grid-cols-2 gap-1">
              {SPECTRUM_BANDS.slice(0, 4).map((band, i) => (
                <div key={band.band} className="flex items-center text-xs">
                  <div 
                    className="w-2 h-2 rounded-full mr-1" 
                    style={{ backgroundColor: band.color }}
                  />
                  <span className="truncate">{band.band}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}