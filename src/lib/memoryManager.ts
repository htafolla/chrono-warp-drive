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

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  initialize(): void {
    console.log('[MEMORY MANAGER] Initializing Phase 7 memory management...');
    
    // Initialize object pools
    this.initializeObjectPools();
    
    // Set up memory monitoring
    this.setupMemoryMonitoring();
    
    // Register cleanup intervals
    this.setupCleanupIntervals();
    
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

    console.log('[MEMORY MANAGER] Object pools initialized');
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
    // Monitor memory every 5 seconds
    setInterval(() => {
      const stats = this.getMemoryStats();
      
      if (stats.memoryPressure === 'high' || stats.memoryPressure === 'critical') {
        console.warn('[MEMORY MANAGER] High memory pressure detected:', stats);
        this.forceCleanup();
      }
    }, 5000);
  }

  private setupCleanupIntervals(): void {
    // Light cleanup every 30 seconds
    setInterval(() => {
      this.frameCount++;
      
      if (this.frameCount % 1800 === 0) { // Every 30 seconds at 60fps
        this.lightCleanup();
      }
    }, 16);

    // Heavy cleanup every 2 minutes
    setInterval(() => {
      const timeSinceLastCleanup = performance.now() - this.lastCleanup;
      if (timeSinceLastCleanup > 120000) { // 2 minutes
        this.forceCleanup();
      }
    }, 120000);
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

  // Dispose of THREE.js object safely
  disposeObject(object: THREE.Object3D): void {
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

  // Check if cleanup is needed
  shouldCleanup(): boolean {
    const memoryPressure = this.getMemoryPressure();
    const timeSinceLastCleanup = performance.now() - this.lastCleanup;
    
    return memoryPressure === 'high' || 
           memoryPressure === 'critical' || 
           timeSinceLastCleanup > 300000; // 5 minutes
  }

  dispose(): void {
    console.log('[MEMORY MANAGER] Disposing all resources...');
    
    this.clearCaches();
    
    // Clear all pools
    this.pools.clear();
    
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