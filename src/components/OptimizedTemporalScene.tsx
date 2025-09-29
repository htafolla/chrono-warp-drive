import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SPECTRUM_BANDS, wave, type Isotope } from '@/lib/temporalCalculator';
import { useMemoryManager } from '@/lib/memoryManager';
import { TPTTv4_6Result, TimeShiftMetrics, TDFComponents } from '@/types/blurrn-v4-6';
import { SpectrumData } from '@/types/sdss';
import { useFPSMonitor } from '@/hooks/useFPSMonitor';
import { useSceneMetricsLogger } from '@/hooks/useSceneMetricsLogger';

interface OptimizedWavePlaneProps {
  band: typeof SPECTRUM_BANDS[0];
  phases: number[];
  isotope: Isotope;
  tdfComponents?: TDFComponents;
  index: number;
  time: number;
  quality: 'low' | 'medium' | 'high';
}

function OptimizedWavePlane({ band, phases, isotope, tdfComponents, index, time, quality }: OptimizedWavePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  const memoryManager = useMemoryManager();

  // Optimized geometry for better performance
  const geometryArgs = useMemo((): [number, number, number, number] => {
    const segmentMap = { 
      low: [6, 6, 12, 12] as [number, number, number, number], 
      medium: [8, 8, 16, 16] as [number, number, number, number], 
      high: [8, 8, 20, 20] as [number, number, number, number] 
    };
    return segmentMap[quality];
  }, [quality]);

  // Cleanup on unmount
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
      
      // TDF-enhanced wave calculations if available
      const tdfInfluence = tdfComponents ? Math.min(tdfComponents.TDF_value / 5.781e12, 2) : 1;
      const tau = tdfComponents?.tau || 0;
      
      // Update vertices with optimized calculations
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i);
        
        const baseWave = Math.sin(x + z + phase + time * 0.5);
        const tdfWave = tdfComponents ? Math.sin(x * tdfInfluence + z * tau + phase) : 0;
        
        const heightValue = Math.max(-2, Math.min(2, 
          (baseWave + tdfWave * 0.3) * 0.25
        ));
        
        position.setY(i, heightValue);
      }
      
      position.needsUpdate = true;
      
      // Optimized positioning and rotation
      meshRef.current.position.y = index * 0.3 - 2;
      meshRef.current.rotation.z = phase * 0.03;
      
      // Z-index sorting for better depth perception
      meshRef.current.position.z = -index * 0.1;
      
    } catch (error) {
      console.error('OptimizedWavePlane animation error:', error);
    }
  });

  // Depth-based opacity for better visual layering
  const opacity = Math.max(0.3, 0.8 - index * 0.05);

  return (
    <mesh ref={meshRef} position={[0, index * 0.3 - 2, -index * 0.1]}>
      <planeGeometry 
        ref={geometryRef} 
        args={geometryArgs} 
      />
      <meshPhongMaterial 
        color={band.color}
        wireframe
        transparent
        opacity={opacity}
      />
    </mesh>
  );
}

interface TDFBreakthroughIndicatorProps {
  breakthrough: boolean;
  tdfValue: number;
  position: [number, number, number];
}

function TDFBreakthroughIndicator({ breakthrough, tdfValue, position }: TDFBreakthroughIndicatorProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    if (breakthrough) {
      const pulseIntensity = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.3;
      meshRef.current.scale.setScalar(pulseIntensity);
      meshRef.current.rotation.y = state.clock.elapsedTime * 2;
    }
  });

  if (!breakthrough) return null;

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshBasicMaterial 
        color="#00ff00"
        transparent
        opacity={0.7}
      />
    </mesh>
  );
}

interface OptimizedTemporalSceneProps {
  phases: number[];
  isotope: Isotope;
  time: number;
  tpttV46Result?: TPTTv4_6Result | null;
  spectrumData?: SpectrumData | null;
  qualitySettings?: {
    particles: boolean;
    shadows: boolean;
    quality: 'low' | 'medium' | 'high';
  };
  activeTab?: string;
}

export function OptimizedTemporalScene({ 
  phases, 
  isotope, 
  time, 
  tpttV46Result,
  spectrumData,
  qualitySettings = { particles: true, shadows: true, quality: 'high' },
  activeTab = 'Scene'
}: OptimizedTemporalSceneProps) {
  const memoryManager = useMemoryManager();
  const fpsData = useFPSMonitor();
  const { logSceneMetrics } = useSceneMetricsLogger();
  
  const hasV46Data = tpttV46Result?.v46_components && tpttV46Result?.timeShiftMetrics;
  
  // Adaptive band count based on quality and performance
  const bandCount = useMemo(() => {
    if (fpsData.current < 30) return 3; // Emergency performance mode
    const baseCount = qualitySettings.quality === 'high' ? 5 : qualitySettings.quality === 'medium' ? 4 : 3;
    return Math.min(baseCount, SPECTRUM_BANDS.length);
  }, [qualitySettings.quality, fpsData.current]);

  // Performance monitoring and logging
  useEffect(() => {
    if (hasV46Data && fpsData.current > 0) {
      const vertexCount = bandCount * (qualitySettings.quality === 'high' ? 1024 : qualitySettings.quality === 'medium' ? 576 : 256);
      
      logSceneMetrics({
        tdf_value: tpttV46Result.v46_components.TDF_value,
        fps: fpsData.current,
        memory_usage: (performance as any).memory?.usedJSHeapSize || 0,
        vertex_count: vertexCount,
        cycle_number: Math.floor(time * 100),
        breakthrough_validated: tpttV46Result.timeShiftMetrics.breakthrough_validated,
        quality_setting: qualitySettings.quality,
        particles_enabled: qualitySettings.particles,
        shadows_enabled: qualitySettings.shadows
      });
    }
  }, [time, hasV46Data, fpsData.current, bandCount, logSceneMetrics, tpttV46Result, qualitySettings]);
  
  return (
    <div className="w-full h-full min-h-[600px] bg-background rounded-lg overflow-hidden" data-testid="optimized-temporal-scene">
      <Canvas camera={{ position: [6, 4, 8], fov: 75 }}>
        {/* Optimized lighting setup */}
        <ambientLight intensity={0.5} />
        <pointLight position={[8, 8, 8]} intensity={1.0} />
        <directionalLight 
          position={[-6, 6, 6]} 
          intensity={0.7}
          color="#ffffff"
          castShadow={qualitySettings.shadows}
        />
        
        {/* TDF-specific breakthrough lighting */}
        {hasV46Data && tpttV46Result.timeShiftMetrics.breakthrough_validated && (
          <pointLight 
            position={[0, 2, 0]} 
            intensity={1.5} 
            color="#00ff00"
            distance={12}
          />
        )}
        
        {/* Optimized wave planes */}
        {SPECTRUM_BANDS.slice(0, bandCount).map((band, index) => (
          <OptimizedWavePlane
            key={band.band}
            band={band}
            phases={phases}
            isotope={isotope}
            tdfComponents={hasV46Data ? tpttV46Result.v46_components : undefined}
            index={index}
            time={time}
            quality={qualitySettings.quality}
          />
        ))}
        
        {/* TDF Breakthrough Indicator */}
        {hasV46Data && (
          <TDFBreakthroughIndicator
            breakthrough={tpttV46Result.timeShiftMetrics.breakthrough_validated}
            tdfValue={tpttV46Result.v46_components.TDF_value}
            position={[0, 1, 0]}
          />
        )}
        
        {/* Simplified ground plane */}
        <mesh position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[16, 16, 8, 8]} />
          <meshPhongMaterial 
            color="hsl(var(--muted))"
            wireframe
            transparent
            opacity={0.15}
          />
        </mesh>
        
        {/* Controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxDistance={20}
          minDistance={3}
        />
      </Canvas>
      
      {/* Performance-aware overlay */}
      <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 text-card-foreground">
        <div className="text-sm font-medium space-y-1">
          <p>Isotope: <span className="text-primary">{isotope.type}</span></p>
          <p>Tab: <span className="text-accent">{activeTab}</span></p>
          {hasV46Data && (
            <>
              <p>TDF: <span className="text-secondary font-mono">{tpttV46Result.v46_components.TDF_value.toExponential(2)}</span></p>
              <p>Status: <span className={tpttV46Result.timeShiftMetrics.breakthrough_validated ? "text-green-400" : "text-yellow-400"}>
                {tpttV46Result.timeShiftMetrics.breakthrough_validated ? "Breakthrough" : "Calibrating"}
              </span></p>
            </>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Optimized Scene • Bands: {bandCount} • FPS: {fpsData.current}
        </div>
      </div>
      
      {/* Performance warning */}
      {fpsData.current < 30 && fpsData.current > 0 && (
        <div className="absolute bottom-4 left-4 bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-lg text-sm">
          Performance Warning: {fpsData.current} FPS
        </div>
      )}
    </div>
  );
}