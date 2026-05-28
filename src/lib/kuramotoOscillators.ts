// src/lib/kuramotoOscillators.ts
// Kuramoto oscillator model for Dynamo governance (frontend mirror).
// Phase 1: Push/pull dynamics, isotope factors, fractal toggle, 3D trajectory.

const PHI_DARK = Math.PI / 6;
const K = 0.5;
const N = 3;
const S = 0.1;
const TIMESTEPS = 20;
const DT = 0.05;

export type PhaseType = 'push' | 'pull';

export interface Isotope {
  type: string
  factor: number
}

export const ISOTOPES: Record<string, Isotope> = {
  'C-12': { type: 'C-12', factor: 1.0 },
  'C-14': { type: 'C-14', factor: 0.8 },
};

export interface KuramotoTrajectoryPoint {
  timestep: number
  theta: [number, number, number]
  omega: [number, number, number]
}

export interface KuramotoResult {
  phaseAlignment: number
  signalTiming: 'leading' | 'trailing' | 'synced'
  phaseCoherenceProposal: number
  phaseCoherenceSun: number
  trajectories: KuramotoTrajectoryPoint[]
  phaseType: PhaseType
  isotope: string
}

function mod2pi(p: number): number {
  p = p % (2 * Math.PI);
  return p < 0 ? p + 2 * Math.PI : p;
}

function orderParameter(thetas: number[]): number {
  let sumCos = 0, sumSin = 0;
  for (const t of thetas) {
    sumCos += Math.cos(t);
    sumSin += Math.sin(t);
  }
  const avgCos = sumCos / thetas.length;
  const avgSin = sumSin / thetas.length;
  return Math.sqrt(avgCos * avgCos + avgSin * avgSin);
}

function kuramotoStep(
  thetas: number[],
  omegas: number[],
  idx: number,
  phaseType: PhaseType,
  isotope: Isotope,
  fractalToggle: boolean
): number {
  const phiOffset = phaseType === 'push' ? Math.PI / 4 : -Math.PI / 4;
  let sum = 0;
  for (let j = 0; j < Math.min(N, thetas.length); j++) {
    if (j !== idx && !isNaN(thetas[j])) {
      sum += Math.sin(
        thetas[j] - thetas[idx] + PHI_DARK + phiOffset +
        (fractalToggle ? S * isotope.factor : 0)
      );
    }
  }
  return omegas[idx] + (K / Math.max(N - 1, 1)) * sum;
}

function phaseTypeFromActivity(activityLevel?: string): PhaseType {
  if (!activityLevel) return 'pull';
  switch (activityLevel) {
    case 'quiet':
    case 'moderate':
      return 'pull';
    case 'active':
    case 'storm':
      return 'push';
    default:
      return 'pull';
  }
}

export function runKuramotoCoupling(
  proposalTdf: number,
  solarRefTdf: number,
  activityLevel?: string,
  isotopeType?: string,
  fractalToggle?: boolean
): KuramotoResult {
  const propPhase = mod2pi((proposalTdf % 1e6) / 1e6 * 2 * Math.PI);
  const sunPhase = mod2pi((solarRefTdf % 1e6) / 1e6 * 2 * Math.PI);
  const sysPhase = mod2pi((propPhase + sunPhase) / 2);

  const propOmega = (proposalTdf % 1e6) / 1e6 * 2;
  const sunOmega = (solarRefTdf % 1e6) / 1e6 * 2;
  const sysOmega = (propOmega + sunOmega) / 2;

  let thetas = [propPhase, sunPhase, sysPhase];
  let omegas = [propOmega, sunOmega, sysOmega];

  const phaseType = phaseTypeFromActivity(activityLevel);
  const isotope = ISOTOPES[isotopeType || 'C-12'] || ISOTOPES['C-12'];
  const useFractal = fractalToggle !== false;

  const trajectories: KuramotoTrajectoryPoint[] = [];

  for (let step = 0; step < TIMESTEPS; step++) {
    const nextOmegas = omegas.map((_, i) =>
      kuramotoStep(thetas, omegas, i, phaseType, isotope, useFractal)
    );
    omegas = nextOmegas;
    for (let i = 0; i < N; i++) thetas[i] = mod2pi(thetas[i] + omegas[i] * DT);

    trajectories.push({
      timestep: step,
      theta: [thetas[0], thetas[1], thetas[2]],
      omega: [omegas[0], omegas[1], omegas[2]],
    });
  }

  const r = orderParameter(thetas);
  const phaseAlignment = Math.max(0.15, Math.min(0.99, r));

  const propToSun = mod2pi(thetas[1] - thetas[0]);
  const signalTiming: 'leading' | 'trailing' | 'synced' =
    propToSun < 0.2 || propToSun > 2 * Math.PI - 0.2 ? 'synced' :
    propToSun < Math.PI ? 'leading' : 'trailing';

  return {
    phaseAlignment,
    signalTiming,
    phaseCoherenceProposal: Math.cos(thetas[0]),
    phaseCoherenceSun: Math.cos(thetas[1]),
    trajectories,
    phaseType,
    isotope: isotope.type,
  };
}
