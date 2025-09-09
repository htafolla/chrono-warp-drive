import * as THREE from 'three';
import { useMemoryManager } from './memoryManager';

export interface RenderQualitySettings {
  particleCount: number;
  geometrySegments: number;
  shadowMapSize: number;
  enableShadows: boolean;
  wireframeOnly: boolean;
  maxDistance: number;
}

export const QUALITY_PRESETS: Record<string, RenderQualitySettings> = {
  ultra: {
    particleCount: 2000,
    geometrySegments: 64,
    shadowMapSize: 2048,
    enableShadows: true,
    wireframeOnly: false,
    maxDistance: 50
  },
  high: {
    particleCount: 1500,
    geometrySegments: 32,
    shadowMapSize: 1024,
    enableShadows: true,
    wireframeOnly: false,
    maxDistance: 40
  },
  medium: {
    particleCount: 1000,
    geometrySegments: 16,
    shadowMapSize: 512,
    enableShadows: false,
    wireframeOnly: false,
    maxDistance: 30
  },
  low: {
    particleCount: 500,
    geometrySegments: 8,
    shadowMapSize: 256,
    enableShadows: false,
    wireframeOnly: true,
    maxDistance: 20
  }
};

export class RenderOptimizer {
  private camera: THREE.Camera | null = null;
  private frustum = new THREE.Frustum();
  private frustumMatrix = new THREE.Matrix4();
  private currentQuality: RenderQualitySettings = QUALITY_PRESETS.high;
  private frameTimeHistory: number[] = [];
  private readonly TARGET_FRAME_TIME = 16.67; // 60fps
  private readonly FRAME_TIME_SAMPLES = 10;
  private adaptiveQualityEnabled = true;
  private lastQualityAdjustment = 0;
  private readonly QUALITY_ADJUSTMENT_COOLDOWN = 2000; // 2 seconds

  constructor() {
    this.updateFrustum();
  }

  setCamera(camera: THREE.Camera) {
    this.camera = camera;
    this.updateFrustum();
  }

  updateFrustum() {
    if (!this.camera) return;
    
    this.frustumMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.frustumMatrix);
  }

  isInFrustum(object: THREE.Object3D): boolean {
    if (!this.camera) return true;
    
    // Simple sphere culling
    const sphere = new THREE.Sphere();
    const box = new THREE.Box3();
    box.setFromObject(object);
    box.getBoundingSphere(sphere);
    
    return this.frustum.intersectsSphere(sphere);
  }

  getDistanceToCamera(object: THREE.Object3D): number {
    if (!this.camera) return 0;
    
    return this.camera.position.distanceTo(object.position);
  }

  getLODLevel(distance: number): 'high' | 'medium' | 'low' {
    const maxDistance = this.currentQuality.maxDistance;
    
    if (distance < maxDistance * 0.3) return 'high';
    if (distance < maxDistance * 0.7) return 'medium';
    return 'low';
  }

  recordFrameTime(frameTime: number) {
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.FRAME_TIME_SAMPLES) {
      this.frameTimeHistory.shift();
    }

    if (this.adaptiveQualityEnabled) {
      this.adjustQualityBasedOnPerformance();
    }
  }

  private adjustQualityBasedOnPerformance() {
    if (this.frameTimeHistory.length < this.FRAME_TIME_SAMPLES) return;
    
    const now = performance.now();
    if (now - this.lastQualityAdjustment < this.QUALITY_ADJUSTMENT_COOLDOWN) return;

    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    const currentQualityKey = this.getCurrentQualityKey();
    
    // If performance is poor, downgrade quality
    if (avgFrameTime > this.TARGET_FRAME_TIME * 1.5) {
      const newQuality = this.getNextLowerQuality(currentQualityKey);
      if (newQuality !== currentQualityKey) {
        this.setQuality(newQuality);
        this.lastQualityAdjustment = now;
        console.log(`Performance: Downgraded to ${newQuality} (${avgFrameTime.toFixed(2)}ms avg frame time)`);
      }
    }
    // If performance is good, try upgrading quality
    else if (avgFrameTime < this.TARGET_FRAME_TIME * 0.8) {
      const newQuality = this.getNextHigherQuality(currentQualityKey);
      if (newQuality !== currentQualityKey) {
        this.setQuality(newQuality);
        this.lastQualityAdjustment = now;
        console.log(`Performance: Upgraded to ${newQuality} (${avgFrameTime.toFixed(2)}ms avg frame time)`);
      }
    }
  }

  private getCurrentQualityKey(): string {
    for (const [key, preset] of Object.entries(QUALITY_PRESETS)) {
      if (JSON.stringify(preset) === JSON.stringify(this.currentQuality)) {
        return key;
      }
    }
    return 'medium';
  }

  getCurrentQualityKeyPublic(): string {
    return this.getCurrentQualityKey();
  }

  private getNextLowerQuality(current: string): string {
    const qualities = ['ultra', 'high', 'medium', 'low'];
    const index = qualities.indexOf(current);
    return index < qualities.length - 1 ? qualities[index + 1] : current;
  }

  private getNextHigherQuality(current: string): string {
    const qualities = ['ultra', 'high', 'medium', 'low'];
    const index = qualities.indexOf(current);
    return index > 0 ? qualities[index - 1] : current;
  }

  setQuality(qualityKey: string) {
    if (QUALITY_PRESETS[qualityKey]) {
      this.currentQuality = { ...QUALITY_PRESETS[qualityKey] };
    }
  }

  getQualitySettings(): RenderQualitySettings {
    return { ...this.currentQuality };
  }

  setAdaptiveQuality(enabled: boolean) {
    this.adaptiveQualityEnabled = enabled;
  }

  // Geometry optimization helpers
  shouldUpdateGeometry(lastUpdate: number, updateInterval: number = 16): boolean {
    return performance.now() - lastUpdate > updateInterval;
  }

  // Material batching helper
  createBatchedMaterial(baseColor: string, opacity: number = 1): THREE.MeshPhongMaterial {
    const material = new THREE.MeshPhongMaterial({
      color: baseColor,
      transparent: opacity < 1,
      opacity,
      wireframe: this.currentQuality.wireframeOnly
    });

    // Enable material caching
    material.userData.batchKey = `${baseColor}_${opacity}_${this.currentQuality.wireframeOnly}`;
    
    return material;
  }

  dispose() {
    this.frameTimeHistory = [];
    this.camera = null;
  }
}

// Global render optimizer instance
let globalRenderOptimizer: RenderOptimizer | null = null;

export function useRenderOptimizer(): RenderOptimizer {
  if (!globalRenderOptimizer) {
    globalRenderOptimizer = new RenderOptimizer();
  }
  return globalRenderOptimizer;
}

export function disposeRenderOptimizer() {
  if (globalRenderOptimizer) {
    globalRenderOptimizer.dispose();
    globalRenderOptimizer = null;
  }
}