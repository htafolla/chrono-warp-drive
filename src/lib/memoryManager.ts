// Phase 7: Memory Management & Garbage Collection System
// Advanced memory optimization for BLURRN v4.5

import * as THREE from 'three';

interface MemoryStats {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  threeObjectCount: number;
  pooledObjectsAvailable: number;
  lastGCTime: number;
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
}

interface ObjectPool<T> {
  available: T[];
  inUse: Set<T>;
  createNew: () => T;
  reset: (obj: T) => void;
  maxSize: number;
}

export class MemoryManager {
  private static instance: MemoryManager;
  private pools = new Map<string, ObjectPool<any>>();
  private disposableObjects = new WeakSet<THREE.Object3D>();
  private materialCache = new Map<string, THREE.Material>();
  private geometryCache = new Map<string, THREE.BufferGeometry>();
  private textureCache = new Map<string, THREE.Texture>();
  private frameCount = 0;
  private lastCleanup = 0;
  private memoryThreshold = 0.8; // 80% memory threshold before aggressive cleanup
  
  // Phase 1: Interval leak fix - track all intervals
  private initialized = false;
  private monitoringIntervalId: number | null = null;
  private fpsIntervalId: number | null = null;
  private heavyCleanupIntervalId: number | null = null;

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  initialize(): void {
    // Phase 1: Idempotent initialization - prevent duplicate intervals
    if (this.initialized) {
      console.log('[MEMORY MANAGER] Already initialized, skipping');
      return;
    }
    
    console.log('[MEMORY MANAGER] Initializing Phase 7 memory management...');
    
    // Initialize object pools
    this.initializeObjectPools();
    
    // Set up memory monitoring
    this.setupMemoryMonitoring();
    
    // Register cleanup intervals
    this.setupCleanupIntervals();
    
    this.initialized = true;
    console.log('[MEMORY MANAGER] Phase 7 initialization complete');
  }

  private initializeObjectPools(): void {
    // Vector3 pool for frequent vector calculations
    this.createPool('Vector3', {
      createNew: () => new THREE.Vector3(),
      reset: (v) => v.set(0, 0, 0),
      maxSize: 1000
    });

    // Color pool for dynamic color calculations
    this.createPool('Color', {
      createNew: () => new THREE.Color(),
      reset: (c) => c.setRGB(1, 1, 1),
      maxSize: 500
    });

    // Float32Array pool for geometry data
    this.createPool('Float32Array_1024', {
      createNew: () => new Float32Array(1024),
      reset: (arr) => arr.fill(0),
      maxSize: 100
    });

    // Matrix4 pool for transformations
    this.createPool('Matrix4', {
      createNew: () => new THREE.Matrix4(),
      reset: (m) => m.identity(),
      maxSize: 200
    });

    // Euler pool for rotations
    this.createPool('Euler', {
      createNew: () => new THREE.Euler(),
      reset: (e) => e.set(0, 0, 0),
      maxSize: 300
    });

    // Phase 6: Cascade-Specific Pools for n=25-34 optimization
    // BufferGeometry pool for cascade-optimized meshes
    this.createPool('CascadeGeometry_n25', {
      createNew: () => new THREE.SphereGeometry(1, 16, 16),
      reset: () => {}, // Geometries don't need reset
      maxSize: 50
    });

    this.createPool('CascadeGeometry_n34', {
      createNew: () => new THREE.SphereGeometry(1, 12, 12),
      reset: () => {},
      maxSize: 50
    });

    // Cascade-specific Float32Array pools for TDF computations
    this.createPool('TDF_Cascade_Array', {
      createNew: () => new Float32Array(512),
      reset: (arr) => arr.fill(0),
      maxSize: 60
    });

    console.log('[MEMORY MANAGER] Object pools initialized with cascade-specific optimizations');
  }

  private createPool<T>(name: string, config: {
    createNew: () => T;
    reset: (obj: T) => void;
    maxSize: number;
  }): void {
    this.pools.set(name, {
      available: [],
      inUse: new Set<T>(),
      createNew: config.createNew,
      reset: config.reset,
      maxSize: config.maxSize
    });
  }

  // Get object from pool or create new one
  getPooledObject<T>(poolName: string): T {
    const pool = this.pools.get(poolName) as ObjectPool<T>;
    if (!pool) {
      throw new Error(`Pool ${poolName} not found`);
    }

    let obj: T;
    if (pool.available.length > 0) {
      obj = pool.available.pop()!;
    } else {
      obj = pool.createNew();
    }

    pool.inUse.add(obj);
    return obj;
  }

  // Return object to pool
  releasePooledObject<T>(poolName: string, obj: T): void {
    const pool = this.pools.get(poolName) as ObjectPool<T>;
    if (!pool || !pool.inUse.has(obj)) return;

    pool.inUse.delete(obj);
    
    if (pool.available.length < pool.maxSize) {
      pool.reset(obj);
      pool.available.push(obj);
    }
    // If pool is full, let object be garbage collected
  }

  // Cache management for THREE.js objects
  getCachedMaterial(key: string, factory: () => THREE.Material): THREE.Material {
    if (!this.materialCache.has(key)) {
      const material = factory();
      this.materialCache.set(key, material);
      return material;
    }
    return this.materialCache.get(key)!;
  }

  getCachedGeometry(key: string, factory: () => THREE.BufferGeometry): THREE.BufferGeometry {
    if (!this.geometryCache.has(key)) {
      const geometry = factory();
      this.geometryCache.set(key, geometry);
      return geometry;
    }
    return this.geometryCache.get(key)!;
  }

  getCachedTexture(key: string, factory: () => THREE.Texture): THREE.Texture {
    if (!this.textureCache.has(key)) {
      const texture = factory();
      this.textureCache.set(key, texture);
      return texture;
    }
    return this.textureCache.get(key)!;
  }

  // Register object for automatic disposal
  registerDisposable(object: THREE.Object3D): void {
    this.disposableObjects.add(object);
  }

  // Force garbage collection and cleanup
  forceCleanup(): void {
    console.log('[MEMORY MANAGER] Forcing cleanup...');
    
    // Clear caches if memory pressure is high
    const memoryPressure = this.getMemoryPressure();
    if (memoryPressure === 'high' || memoryPressure === 'critical') {
      this.clearCaches();
    }

    // Cleanup object pools
    this.cleanupObjectPools();

    // Force browser garbage collection if available
    if (window.gc) {
      window.gc();
    }

    this.lastCleanup = performance.now();
    console.log('[MEMORY MANAGER] Cleanup complete');
  }

  private clearCaches(): void {
    // Dispose cached materials
    for (const [key, material] of this.materialCache) {
      material.dispose();
    }
    this.materialCache.clear();

    // Dispose cached geometries
    for (const [key, geometry] of this.geometryCache) {
      geometry.dispose();
    }
    this.geometryCache.clear();

    // Dispose cached textures
    for (const [key, texture] of this.textureCache) {
      texture.dispose();
    }
    this.textureCache.clear();

    console.log('[MEMORY MANAGER] Caches cleared');
  }

  private cleanupObjectPools(): void {
    for (const [name, pool] of this.pools) {
      // Reduce pool size if memory pressure is high
      const targetSize = this.getMemoryPressure() === 'critical' ? 
        Math.floor(pool.maxSize * 0.25) : Math.floor(pool.maxSize * 0.5);
      
      while (pool.available.length > targetSize) {
        pool.available.pop();
      }
    }
  }

  private setupMemoryMonitoring(): void {
    // Phase 1: Store interval ID for proper cleanup
    // Monitor memory every 5 seconds
    this.monitoringIntervalId = window.setInterval(() => {
      const stats = this.getMemoryStats();
      
      if (stats.memoryPressure === 'high' || stats.memoryPressure === 'critical') {
        console.warn('[MEMORY MANAGER] High memory pressure detected:', stats);
        this.forceCleanup();
      }
    }, 5000);
  }

  private setupCleanupIntervals(): void {
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let fpsHistory: number[] = [];

    // Phase 1: Store interval IDs for proper cleanup
    // Frame-rate based cleanup - Phase 7 optimization (more conservative)
    this.fpsIntervalId = window.setInterval(() => {
      frameCount++;
      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTime;
      const fps = 1000 / deltaTime;
      
      fpsHistory.push(fps);
      if (fpsHistory.length > 60) fpsHistory.shift(); // Keep last 60 frames
      
      const avgFPS = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
      
      // More conservative cleanup to prevent star disposal
      if (avgFPS < 20 && frameCount % 1800 === 0) { // Every 30 seconds when severely struggling
        this.forceCleanup();
      } else if (avgFPS < 30 && frameCount % 3600 === 0) { // Every 60 seconds when struggling
        this.lightCleanup();
      } else if (frameCount % 7200 === 0) { // Every 2 minutes normally
        this.lightCleanup();
      }
      
      lastFrameTime = currentTime;
    }, 100); // Monitor every 100ms instead of 16ms for stability

    // Heavy cleanup every 3 minutes or when memory pressure is critical
    this.heavyCleanupIntervalId = window.setInterval(() => {
      const timeSinceLastCleanup = performance.now() - this.lastCleanup;
      const memPressure = this.getMemoryPressure();
      
      if (timeSinceLastCleanup > 180000 || memPressure === 'critical') { // 3 minutes
        this.forceCleanup();
      }
    }, 120000); // Check every 2 minutes
  }

  private lightCleanup(): void {
    // Trim object pools to 75% capacity
    for (const [name, pool] of this.pools) {
      const targetSize = Math.floor(pool.maxSize * 0.75);
      while (pool.available.length > targetSize) {
        pool.available.pop();
      }
    }
  }

  getMemoryStats(): MemoryStats {
    const memory = (performance as any).memory;
    const memoryPressure = this.getMemoryPressure();
    
    let threeObjectCount = 0;
    let pooledObjectsAvailable = 0;

    for (const pool of this.pools.values()) {
      pooledObjectsAvailable += pool.available.length;
    }

    return {
      jsHeapSizeLimit: memory?.jsHeapSizeLimit || 0,
      totalJSHeapSize: memory?.totalJSHeapSize || 0,
      usedJSHeapSize: memory?.usedJSHeapSize || 0,
      threeObjectCount,
      pooledObjectsAvailable,
      lastGCTime: this.lastCleanup,
      memoryPressure
    };
  }

  private getMemoryPressure(): 'low' | 'medium' | 'high' | 'critical' {
    const memory = (performance as any).memory;
    if (!memory) return 'low';

    const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    
    if (usage > 0.95) return 'critical';
    if (usage > 0.85) return 'high';
    if (usage > 0.7) return 'medium';
    return 'low';
  }

  // Dispose of THREE.js object safely - exclude stars from aggressive cleanup
  disposeObject(object: THREE.Object3D): void {
    // Skip disposal of stars and particle systems to prevent black star issue
    if (this.isStarOrParticleSystem(object)) {
      console.log('[STARS DEBUG] Skipping disposal of stars/particle system');
      return;
    }

    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => {
              this.disposeMaterial(material);
            });
          } else {
            this.disposeMaterial(child.material);
          }
        }
      }
    });

    // Remove from parent if it has one
    if (object.parent) {
      object.parent.remove(object);
    }
  }

  // Check if object is part of stars or particle system
  private isStarOrParticleSystem(object: THREE.Object3D): boolean {
    // Check object name/type patterns
    const name = object.name?.toLowerCase() || '';
    const type = object.type?.toLowerCase() || '';
    
    return name.includes('star') || 
           name.includes('particle') || 
           type.includes('points') ||
           object.constructor.name.includes('Stars');
  }

  private disposeMaterial(material: THREE.Material): void {
    // Dispose textures
    Object.values(material).forEach(value => {
      if (value && typeof value === 'object' && 'dispose' in value) {
        (value as any).dispose();
      }
    });

    material.dispose();
  }

  // Get current memory usage percentage
  getMemoryUsagePercent(): number {
    const memory = (performance as any).memory;
    if (!memory) return 0;
    
    return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
  }

  // Get cache size for monitoring
  getCacheSize(): number {
    return this.materialCache.size + this.geometryCache.size + this.textureCache.size;
  }

  // Phase 6: Predictive memory management for n=34 scenarios
  predictMemoryForCascade(cascadeLevel: number): {
    predictedMB: number;
    shouldPreCleanup: boolean;
    recommendation: string;
  } {
    // Memory scaling: 90MB at n=25 → 360MB at n=34
    const baseMB = 90;
    const scalingFactor = 30; // 30MB per cascade level
    const predictedMB = baseMB + (cascadeLevel - 25) * scalingFactor;

    const memory = (performance as any).memory;
    const currentMB = memory ? memory.usedJSHeapSize / 1024 / 1024 : 0;
    const availableMB = memory ? (memory.jsHeapSizeLimit - memory.usedJSHeapSize) / 1024 / 1024 : 1000;

    // FIXED: More conservative cleanup - only trigger at critical levels
    const limitMB = memory ? memory.jsHeapSizeLimit / 1024 / 1024 : 1000;
    const percentUsed = (currentMB / limitMB) * 100;
    
    // Only cleanup at n=34 if above 85% memory usage
    const shouldPreCleanup = cascadeLevel >= 34 && percentUsed > 85;

    let recommendation = '';
    if (shouldPreCleanup) {
      console.log('[MEMORY MANAGER] Critical cleanup for n=' + cascadeLevel + ' at ' + percentUsed.toFixed(1) + '%');
      recommendation = `Critical cleanup at n=${cascadeLevel}: ${currentMB.toFixed(0)}MB (${percentUsed.toFixed(1)}%)`;
    } else {
      recommendation = `Memory OK: ${currentMB.toFixed(0)}MB / ${limitMB.toFixed(0)}MB (${percentUsed.toFixed(1)}%) for n=${cascadeLevel}`;
    }

    return { predictedMB, shouldPreCleanup, recommendation };
  }

  // Phase 6: Get cascade-specific geometry from pool
  getCascadeGeometry(cascadeLevel: number): THREE.BufferGeometry {
    const poolName = cascadeLevel >= 30 ? 'CascadeGeometry_n34' : 'CascadeGeometry_n25';
    return this.getPooledObject(poolName);
  }

  // Phase 6: Release cascade geometry back to pool
  releaseCascadeGeometry(cascadeLevel: number, geometry: THREE.BufferGeometry): void {
    const poolName = cascadeLevel >= 30 ? 'CascadeGeometry_n34' : 'CascadeGeometry_n25';
    this.releasePooledObject(poolName, geometry);
  }

  // Check if cleanup is needed
  shouldCleanup(): boolean {
    const memoryPressure = this.getMemoryPressure();
    const timeSinceLastCleanup = performance.now() - this.lastCleanup;
    
    // FIXED: Only cleanup at critical pressure or after 10 minutes (was 5)
    // This prevents interrupting neural fusion computations
    return memoryPressure === 'critical' || 
           timeSinceLastCleanup > 600000; // 10 minutes
  }

  dispose(): void {
    console.log('[MEMORY MANAGER] Disposing all resources...');
    
    // Phase 1: Clear all intervals to prevent leaks
    if (this.monitoringIntervalId !== null) {
      clearInterval(this.monitoringIntervalId);
      this.monitoringIntervalId = null;
    }
    if (this.fpsIntervalId !== null) {
      clearInterval(this.fpsIntervalId);
      this.fpsIntervalId = null;
    }
    if (this.heavyCleanupIntervalId !== null) {
      clearInterval(this.heavyCleanupIntervalId);
      this.heavyCleanupIntervalId = null;
    }
    
    this.clearCaches();
    
    // Clear all pools
    this.pools.clear();
    
    // Reset initialized flag to allow re-initialization
    this.initialized = false;
    
    console.log('[MEMORY MANAGER] Disposal complete');
  }
}

// Singleton access
export const memoryManager = MemoryManager.getInstance();

// React hook for memory management
import { useEffect } from 'react';

export function useMemoryManager() {
  useEffect(() => {
    memoryManager.initialize();
    
    return () => {
      // Cleanup when component unmounts
      if (memoryManager.shouldCleanup()) {
        memoryManager.forceCleanup();
      }
    };
  }, []);

  return memoryManager;
}