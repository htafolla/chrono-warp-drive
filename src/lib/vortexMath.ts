// src/lib/vortexMath.ts
// Canonical vortex TDF math for the solar isotopic hammer (frontend mirror).

const PHI = 1.666;
const TAU = 0.865;
const C = 3e8;
const L = 3;

export interface VortexTdfParams {
  T_c: number;
  P_s: number;
  E_t: number;
  delta_t: number;
  voids: number;
  bhs_n: number;
}

export function tPTT(T_c: number, P_s: number, E_t: number, delta_t: number): number {
  return T_c * (P_s / E_t) * PHI * (C / delta_t);
}

export function blackHoleSequence(voids: number, n: number): number {
  return ((L * voids) * Math.pow(PHI, n)) % Math.PI;
}

export function computeFullTDF(params: VortexTdfParams): { tptt: number; bhs: number; tdf: number } {
  const tptt = tPTT(params.T_c, params.P_s, params.E_t, params.delta_t);
  const bhs = blackHoleSequence(params.voids, params.bhs_n);
  const rawTdf = tptt * TAU * (1 / bhs);
  const fingerprint = Math.round(rawTdf / 1e9) % 100000000;
  const tdf = 5.781e12 + fingerprint;
  return { tptt, bhs, tdf };
}
