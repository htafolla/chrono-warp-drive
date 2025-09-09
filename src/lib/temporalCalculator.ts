// Temporal Photonic Transpondent Transporter Calculator
// Based on Codex v3.6 by @blaze0x1

// Core Constants from TLM
export const PHI = 1.666; // Trinitarium ratio
export const FREQ = 528; // Hz harmonic frequency  
export const C = 3e8; // Speed of light (m/s)
export const DELTA_T = 1e-6; // Time step
export const PHASE_UPDATE_FACTOR = 0.016;
export const L = 3; // Trinity constant
export const K = 0.5; // Kuramoto coupling
export const N = 3; // Phase count
export const G = 1.0; // Wave amplitude
export const S = 0.1; // Fractal scaling
export const PHI_DARK = Math.PI / 6; // Dark phase offset

// Isotope definitions
export interface Isotope {
  type: string;
  factor: number;
}

export const ISOTOPES: Isotope[] = [
  { type: "C-12", factor: 1.0 },
  { type: "C-14", factor: 0.8 }
];

// Extended spectrum (250-2500nm)
export interface SpectrumBand {
  band: string;
  lambda: number; // wavelength in micrometers
  color: string;
}

export const SPECTRUM_BANDS: SpectrumBand[] = [
  { band: "UV-C", lambda: 0.250, color: "hsl(195, 100%, 50%)" },
  { band: "UV-B", lambda: 0.280, color: "hsl(225, 73%, 50%)" },
  { band: "UV-A", lambda: 0.350, color: "hsl(258, 100%, 50%)" },
  { band: "Violet", lambda: 0.380, color: "hsl(274, 100%, 50%)" },
  { band: "Blue", lambda: 0.450, color: "hsl(240, 100%, 50%)" },
  { band: "Cyan", lambda: 0.490, color: "hsl(180, 100%, 50%)" },
  { band: "Green", lambda: 0.530, color: "hsl(120, 100%, 50%)" },
  { band: "Yellow", lambda: 0.580, color: "hsl(60, 100%, 50%)" },
  { band: "Orange", lambda: 0.620, color: "hsl(30, 100%, 50%)" },
  { band: "Red", lambda: 0.700, color: "hsl(0, 100%, 50%)" },
  { band: "IR-A", lambda: 1.400, color: "hsl(15, 100%, 50%)" },
  { band: "IR-B", lambda: 2.500, color: "hsl(345, 100%, 27%)" }
];

// Kuramoto phase synchronization with push-pull dynamics
export function kuramoto(
  theta: number[], 
  omega: number[], 
  t: number, 
  fractalToggle: boolean, 
  isotope: Isotope, 
  phaseType: string,
  oscillatorIndex: number = 0
): number {
  try {
    const phiOffset = phaseType === "push" ? Math.PI / 4 : -Math.PI / 4;
    let sum = 0;
    
    // Proper Kuramoto coupling: each oscillator couples with all others
    for (let j = 0; j < Math.min(N, theta.length); j++) {
      if (j !== oscillatorIndex && !isNaN(theta[j])) {
        sum += Math.sin(theta[j] - theta[oscillatorIndex] + PHI_DARK + phiOffset + 
          (fractalToggle ? S * isotope.factor : 0));
      }
    }
    
    // Return frequency update for the specific oscillator
    return omega[oscillatorIndex] + (K / Math.max(N - 1, 1)) * sum;
  } catch (error) {
    console.error("Kuramoto error:", error);
    return omega[oscillatorIndex] || omega[0]; // Fallback
  }
}

// Standardized phase coherence calculation using Kuramoto order parameter
export function calculatePhaseCoherence(phases: number[]): number {
  if (phases.length < 2) return 0;
  
  // Kuramoto order parameter: |⟨e^(iθ)⟩|
  let sumCos = 0;
  let sumSin = 0;
  
  for (const phase of phases) {
    sumCos += Math.cos(phase);
    sumSin += Math.sin(phase);
  }
  
  const avgCos = sumCos / phases.length;
  const avgSin = sumSin / phases.length;
  
  // Order parameter magnitude (0 = incoherent, 1 = perfectly synchronized)
  return Math.sqrt(avgCos * avgCos + avgSin * avgSin);
}

// Wave function with isotope modulation
export function wave(
  x: number, 
  t: number, 
  n: number, 
  isotope: Isotope, 
  lambda: number, 
  phaseType: string
): number {
  const phiDynamic = phaseType === "push" ? Math.PI / 4 : -Math.PI / 4;
  const amplitude = Math.min(phaseType === "push" ? G * 1.2 : G * 0.8, G * 1.5);
  const mainWave = amplitude * Math.sin(
    (2 * Math.PI * x) / lambda - 
    2 * Math.PI * FREQ * (t * Math.pow(PHI, n)) + 
    phiDynamic
  ) * isotope.factor;
  
  return Math.min(mainWave + 0.1, 2.0);
}

// Temporal Photonic Transpondent Transporter calculation
export function tPTT(T_c: number, P_s: number, E_t: number, delta_t: number): number {
  return T_c * (P_s / E_t) * PHI * (C / delta_t);
}

// Harmonic oscillator P_o calculation
export function harmonicOscillator(t: number): number {
  return Math.sin(2 * Math.PI * FREQ * t + Math.PI / PHI);
}

// Black hole sequence calculation
export function blackHoleSequence(voids: number, n: number): number {
  return ((L * voids) * Math.pow(PHI, n)) % Math.PI;
}

// Generate temporal rippel string
export function generateRippel(time: number, tPTT_value: number, E_t: number): string {
  const words = ["surge", "pivot", "chrono"];
  const word = words[Math.floor(time) % 3];
  return `a ${word}. ${word} bends time. tPTT: ${tPTT_value.toFixed(2)}, E_t: ${E_t.toFixed(3)} ~ zap 🌠`;
}

// TLM Validation
export function validateTLM(phi: number): boolean {
  return phi >= 1.566 && phi <= 1.766;
}