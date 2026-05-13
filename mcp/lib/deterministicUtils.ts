// Deterministic Utils for BLURRN v4.6
// Replaces Math.random() with deterministic pseudo-random functions

export const PHI = 1.666; // TLM alignment factor

/**
 * Deterministic seed function using sine-based pseudo-random generation
 * Formula: Math.sin(cycle * index * φ) * 1000 % 999
 */
export const deterministicSeed = (cycle: number, index: number, phi: number = PHI): number => {
  return Math.abs(Math.sin(cycle * index * phi) * 1000) % 999;
};

/**
 * Normalized deterministic random (0-1 range)
 */
export const deterministicRandom = (cycle: number, index: number, phi: number = PHI): number => {
  return deterministicSeed(cycle, index, phi) / 999;
};

/**
 * Deterministic random in range (min-max)
 */
export const deterministicRange = (
  cycle: number, 
  index: number, 
  min: number, 
  max: number, 
  phi: number = PHI
): number => {
  return min + deterministicRandom(cycle, index, phi) * (max - min);
};

/**
 * Deterministic spherical coordinates for star field
 */
export const deterministicSpherical = (cycle: number, index: number, radius: number, depth: number) => {
  const r = radius + deterministicRandom(cycle, index) * depth;
  const theta = deterministicRandom(cycle, index + 1) * Math.PI * 2;
  const phi = Math.acos(2 * deterministicRandom(cycle, index + 2) - 1);
  
  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi)
  };
};

/**
 * Deterministic array selection
 */
export const deterministicSelect = <T>(array: T[], cycle: number, index: number): T => {
  const randomIndex = Math.floor(deterministicRandom(cycle, index) * array.length);
  return array[randomIndex];
};

/**
 * Generate deterministic cycle from timestamp for consistent initialization
 */
export const generateCycle = (timestamp?: number): number => {
  return Math.floor((timestamp || Date.now()) / 1000) % 1000000;
};