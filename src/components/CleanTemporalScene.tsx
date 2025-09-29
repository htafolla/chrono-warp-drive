import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SPECTRUM_BANDS, type Isotope } from '@/lib/temporalCalculator';
import { useMemoryManager } from '@/lib/memoryManager';
import { TPTTv4_6Result, TDFComponents } from '@/types/blurrn-v4-6';
import { SpectrumData } from '@/types/sdss';


interface CleanWavePlaneProps {
  band: typeof SPECTRUM_BANDS[0];
  phases: number[];
  isotope: Isotope;
  tdfComponents?: TDFComponents;
  index: number;
  time: number;
  totalPlanes: number;
}

function CleanWavePlane({ band, phases, isotope, tdfComponents, index, time, totalPlanes }: CleanWavePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  const memoryManager = useMemoryManager();

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
  
  useFrame(() => {
    if (!meshRef.current || !geometryRef.current) return;
    
    try {
      const geometry = geometryRef.current;
      const position = geometry.attributes.position;
      const phase = phases[index % phases.length] || 0;
      
      // TDF-enhanced calculations with proper validation
      const isV46Active = tdfComponents && tdfComponents.TDF_value > 1000;
      const tdfMultiplier = isV46Active ? Math.log10(tdfComponents.TDF_value) / 12 : 0.1;
      const tau = tdfComponents?.tau || 0;
      
      // Smooth wave calculations
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i);
        
        const baseWave = Math.sin(x * 0.8 + z * 0.8 + phase + time * 0.3);
        const tdfWave = isV46Active ? Math.sin(x * tdfMultiplier + z * tau + phase * 2) : 0;
        const syntheticWave = Math.sin(x * 0.5 + z * 0.5 + time * 0.5) * 0.3;
        
        const heightValue = Math.max(-2.0, Math.min(2.0, 
          (baseWave * 1.5) + (tdfWave * 0.8) + syntheticWave
        ));
        
        position.setY(i, heightValue);
      }
      
      position.needsUpdate = true;
      
      // Improved spacing and subtle rotation
      meshRef.current.position.y = (index - totalPlanes / 2) * 0.8;
      meshRef.current.rotation.z = phase * 0.02;
      meshRef.current.position.z = -index * 0.2;
      
    } catch (error) {
      console.error('CleanWavePlane error:', error);
    }
  });

  // Enhanced opacity and material settings
  const opacity = Math.max(0.4, 0.95 - (index / totalPlanes) * 0.5);

  return (
    <mesh ref={meshRef} position={[0, (index - totalPlanes / 2) * 0.8, -index * 0.2]}>
      <planeGeometry 
        ref={geometryRef} 
        args={[8, 8, 24, 24]} 
      />
      <meshPhongMaterial 
        color={band.color}
        wireframe={false}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        emissive={band.color}
        emissiveIntensity={0.1}
      />
      {/* Wireframe overlay for better visibility */}
      <lineSegments>
        <wireframeGeometry args={[new THREE.PlaneGeometry(8, 8, 24, 24)]} />
        <lineBasicMaterial color={band.color} opacity={opacity * 0.6} transparent />
      </lineSegments>
    </mesh>
  );
}

interface TDFIndicatorProps {
  tdfComponents?: TDFComponents;
  timeShiftActive: boolean;
}

function TDFIndicator({ tdfComponents, timeShiftActive }: TDFIndicatorProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current || !timeShiftActive || !tdfComponents) return;
    
    const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    meshRef.current.scale.setScalar(scale);
    meshRef.current.rotation.y = state.clock.elapsedTime;
  });

  if (!timeShiftActive || !tdfComponents) return null;

  return (
    <mesh ref={meshRef} position={[0, 0, 2]}>
      <sphereGeometry args={[0.3, 12, 12]} />
      <meshBasicMaterial 
        color="#00ff88"
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

interface FPSData {
  current: number;
  average: number;
  min: number;
  max: number;
  history: number[];
}

interface FPSMonitorInternalProps {
  onFPSUpdate: (fps: FPSData) => void;
}

function FPSMonitorInternal({ onFPSUpdate }: FPSMonitorInternalProps) {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const fpsHistory = useRef<number[]>([]);
  
  useFrame(() => {
    frameCount.current++;
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime.current;
    
    if (frameCount.current >= 10) {
      const fps = Math.round((frameCount.current * 1000) / deltaTime);
      
      fpsHistory.current.push(fps);
      if (fpsHistory.current.length > 60) {
        fpsHistory.current.shift();
      }
      
      const history = fpsHistory.current;
      const average = history.reduce((sum, fps) => sum + fps, 0) / history.length;
      const min = Math.min(...history);
      const max = Math.max(...history);
      
      onFPSUpdate({
        current: fps,
        average: Math.round(average),
        min,
        max,
        history: [...history]
      });
      
      frameCount.current = 0;
      lastTime.current = currentTime;
    }
  });
  
  return null;
}

interface CleanTemporalSceneProps {
  phases: number[];
  isotope: Isotope;
  time: number;
  tpttV46Result?: TPTTv4_6Result | null;
  spectrumData?: SpectrumData | null;
  activeTab?: string;
}

export function CleanTemporalScene({ 
  phases, 
  isotope, 
  time, 
  tpttV46Result,
  spectrumData,
  activeTab = 'Scene'
}: CleanTemporalSceneProps) {
  const [fpsData, setFpsData] = React.useState<FPSData>({
    current: 60,
    average: 60,
    min: 60,
    max: 60,
    history: []
  });
  
  // Data validation and fallback generation
  const validatedData = useMemo(() => {
    console.log('🔍 Scene Data Debug:', {
      phases: phases?.length,
      phasesData: phases,
      isotope: isotope?.type,
      time,
      tpttV46Result: !!tpttV46Result,
      spectrumData: !!spectrumData,
      activeTab
    });

    // Generate fallback data if needed
    const fallbackPhases = phases?.length > 0 ? phases : 
      Array.from({length: 4}, (_, i) => Math.sin(time * 0.01 + i) * Math.PI);
    
    const fallbackTime = typeof time === 'number' && !isNaN(time) ? time : Date.now() * 0.001;
    
    const fallbackIsotope = isotope || { 
      type: 'Hydrogen-1', 
      mass: 1, 
      abundance: 99.98, 
      halfLife: null,
      factor: 1.0
    };

    const isFallbackMode = !phases?.length || typeof time !== 'number' || isNaN(time);
    
    return {
      phases: fallbackPhases,
      time: fallbackTime,
      isotope: fallbackIsotope,
      isFallbackMode
    };
  }, [phases, isotope, time, tpttV46Result, spectrumData, activeTab]);
  
  // Determine if v4.6 mode is active
  const isV46Active = useMemo(() => {
    return !!(tpttV46Result && 
             tpttV46Result.v46_components && 
             tpttV46Result.timeShiftMetrics?.timeShiftCapable &&
             tpttV46Result.v46_components.TDF_value > 1000);
  }, [tpttV46Result]);

  // Limit bands for performance and clarity
  const activeBands = useMemo(() => {
    const maxBands = fpsData.current < 30 ? 3 : 4;
    return SPECTRUM_BANDS.slice(0, maxBands);
  }, [fpsData.current]);

  return (
    <div className="w-full h-full min-h-[600px] bg-background rounded-lg overflow-hidden" data-testid="clean-temporal-scene">
      <Canvas camera={{ position: [5, 4, 8], fov: 65 }}>
        {/* FPS Monitor inside Canvas */}
        <FPSMonitorInternal onFPSUpdate={setFpsData} />
        
        {/* Enhanced lighting system */}
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1.2}
          color="#ffffff"
          castShadow
        />
        <pointLight position={[-5, 8, 8]} intensity={0.8} color="#4f46e5" />
        <pointLight position={[5, 2, -5]} intensity={0.6} color="#06b6d4" />
        <hemisphereLight
          args={["#4f46e5", "#1e293b", 0.3]}
        />
        
        {/* Wave planes with validated data */}
        {activeBands.map((band, index) => (
          <CleanWavePlane
            key={band.band}
            band={band}
            phases={validatedData.phases}
            isotope={validatedData.isotope}
            tdfComponents={tpttV46Result?.v46_components}
            index={index}
            time={validatedData.time}
            totalPlanes={activeBands.length}
          />
        ))}
        
        {/* TDF breakthrough indicator */}
        <TDFIndicator 
          tdfComponents={tpttV46Result?.v46_components}
          timeShiftActive={isV46Active}
        />
        
        {/* Ground reference plane */}
        <mesh position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshBasicMaterial 
            color="#1e293b" 
            transparent 
            opacity={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* Controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxDistance={20}
          minDistance={3}
          target={[0, 0, 0]}
        />
      </Canvas>
      
      {/* Info overlay with fallback indicator */}
      <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 text-card-foreground">
        <div className="text-sm font-medium space-y-1">
          <p>Mode: <span className={isV46Active ? "text-green-400" : "text-yellow-400"}>
            {isV46Active ? "TDF v4.6 Active" : "Standard"}
          </span></p>
          <p>Isotope: <span className="text-primary">{validatedData.isotope.type}</span></p>
          <p>Planes: <span className="text-accent">{activeBands.length}</span></p>
          <p>FPS: <span className={fpsData.current > 45 ? "text-green-400" : fpsData.current > 30 ? "text-yellow-400" : "text-red-400"}>
            {fpsData.current}
          </span></p>
          {validatedData.isFallbackMode && (
            <p className="text-orange-400 text-xs">⚠️ Fallback Mode</p>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Drag • Scroll • Enhanced scene
        </div>
      </div>

      {/* TDF status overlay */}
      {isV46Active && tpttV46Result?.v46_components && (
        <div className="absolute top-4 right-4 bg-green-900/80 backdrop-blur-sm border border-green-600 rounded-lg p-3 text-green-100">
          <div className="text-sm font-medium">
            <p>TDF Breakthrough</p>
            <p className="text-xs text-green-300">
              Value: {tpttV46Result.v46_components.TDF_value.toExponential(2)}
            </p>
            <p className="text-xs text-green-300">
              Tau: {tpttV46Result.v46_components.tau.toFixed(3)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}