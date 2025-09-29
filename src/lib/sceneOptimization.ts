// Scene Optimization Utilities for BLURRN v4.6
// Adaptive LOD and Memory Management

export interface GeometryConfig {
  vertices: number;
  segments: number;
}

/**
 * Optimize geometry based on quality setting
 * High quality: 1024 vertices (dump-compliant)
 * Medium quality: 512 vertices
 * Low quality: 256 vertices
 */
export const optimizeGeometry = (quality: 'high' | 'medium' | 'low'): GeometryConfig => {
  switch (quality) {
    case 'high':
      return { vertices: 1024, segments: 32 };
    case 'medium':
      return { vertices: 512, segments: 24 };
    case 'low':
      return { vertices: 256, segments: 16 };
  }
};

/**
 * Get memory target based on quality setting
 * Returns target in bytes (client-side)
 * Server-side VRAM simulation would use 360GB for high quality
 */
export const getMemoryTarget = (quality: 'high' | 'medium' | 'low'): number => {
  switch (quality) {
    case 'high':
      return 360 * 1024 * 1024; // 360 MB
    case 'medium':
      return 180 * 1024 * 1024; // 180 MB
    case 'low':
      return 90 * 1024 * 1024;  // 90 MB
  }
};

/**
 * Determine if quality should be reduced based on FPS
 * Returns true if FPS is below 80% of target
 */
export const shouldReduceQuality = (currentFPS: number, targetFPS: number): boolean => {
  return currentFPS < targetFPS * 0.8;
};

/**
 * Get recommended quality level based on current FPS
 */
export const getRecommendedQuality = (currentFPS: number): 'high' | 'medium' | 'low' => {
  if (currentFPS >= 100) return 'high';
  if (currentFPS >= 60) return 'medium';
  return 'low';
};
