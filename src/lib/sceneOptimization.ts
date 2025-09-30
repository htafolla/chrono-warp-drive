// Scene Optimization Utilities for BLURRN v4.6
// Adaptive LOD and Memory Management

export interface GeometryConfig {
  vertices: number;
  segments: number;
}

/**
 * Optimize geometry based on quality setting (Codex v4.7 Phase 1: 120 FPS target)
 * High quality: Balanced for 120 FPS with n=34 cascade
 * Medium quality: 512 vertices
 * Low quality: 256 vertices
 */
export const optimizeGeometry = (quality: 'high' | 'medium' | 'low', cascadeLevel: number = 29): GeometryConfig => {
  // Adaptive geometry based on cascade level (n=25-34)
  // Higher cascade levels reduce geometry complexity to maintain 120 FPS
  const cascadeFactor = Math.max(0.5, 1 - (cascadeLevel - 25) / 20); // 1.0 at n=25, 0.55 at n=34
  
  switch (quality) {
    case 'high':
      // Optimized for 120 FPS at high cascade levels
      const highVertices = Math.floor(800 * cascadeFactor); // 800 at n=25, 440 at n=34
      return { vertices: highVertices, segments: Math.floor(28 * cascadeFactor) };
    case 'medium':
      const mediumVertices = Math.floor(512 * cascadeFactor);
      return { vertices: mediumVertices, segments: Math.floor(24 * cascadeFactor) };
    case 'low':
      const lowVertices = Math.floor(256 * cascadeFactor);
      return { vertices: lowVertices, segments: Math.floor(16 * cascadeFactor) };
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
 * Determine if quality should be reduced based on FPS (Codex v4.7: 120 FPS target)
 * Returns true if FPS is below 90% of target (108 FPS for 120 target)
 */
export const shouldReduceQuality = (currentFPS: number, targetFPS: number = 120): boolean => {
  return currentFPS < targetFPS * 0.9; // Tightened threshold for 120 FPS compliance
};

/**
 * Get recommended quality level based on current FPS (Codex v4.7)
 */
export const getRecommendedQuality = (currentFPS: number): 'high' | 'medium' | 'low' => {
  if (currentFPS >= 110) return 'high'; // 110+ FPS for high quality
  if (currentFPS >= 80) return 'medium'; // 80-109 FPS for medium
  return 'low'; // <80 FPS for low quality
};

/**
 * Calculate optimal frame budget based on target FPS (Codex v4.7)
 */
export const getFrameBudget = (targetFPS: number = 120): number => {
  return 1000 / targetFPS; // ms per frame (8.33ms for 120 FPS)
};

/**
 * Mesh grouping optimization for reduced draw calls (Codex v4.7 Phase 1)
 */
export const shouldGroupMeshes = (meshCount: number, currentFPS: number): boolean => {
  // Group meshes if count is high and FPS is below target
  return meshCount > 50 && currentFPS < 110;
};
