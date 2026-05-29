// src/lib/dynamoSolarGovernance.ts
// Enhanced Dynamo Governance with real-time Solar Context

import { solarGovernance } from './solarGovernanceIntegration';

export interface EnhancedGovernanceDecision {
  originalRecommendation: string;
  solarContext: {
    solarActivityLevel: string;
    solarActivityModifier: number;
    recommendation: string;
    solarIsotopicResonance?: number;
    proposalTdf?: number;
    solarReferenceTdf?: number;
  };
  adjustedVoteWeight: number;
  finalRecommendation: string;
  confidenceAdjustment: number;
  resonanceScore?: number;
  structuralResonance?: number;
  proximity?: number;
  phaseAlignment?: number;
  vortexAlignment?: number;
  crossCorrelationLag?: number;
  signalTiming?: 'leading' | 'trailing' | 'synced';
  synchronization?: number;
  smoothedResonance?: number;
  trend?: 'rising' | 'falling' | 'stable';
  momentum?: number;
  peakForecast?: {
    estimatedPeakResonance: number;
    minutesToPeak: number;
    windowQuality: 'optimal' | 'good' | 'declining';
  };
  adaptiveThresholds?: {
    strong: number;
    good: number;
    weak: number;
  };
  recommendation?: 'PASS' | 'NEEDS_REVISION' | 'REJECT';
  confidence?: number;
  isSolarHammer?: boolean;
  hammerReason?: string;
  resonanceHistory?: Array<{ score: number; timestamp: string }>;
  spectralQuality?: number;
  neuralContextUsed: boolean;
  phaseType?: 'push' | 'pull';
  isotope?: string;
  waveProximity: number;
  waveVortexAlignment: number;
  waveSynchronization: number;
  hybridVortexAlignment: number;
  hybrid4DComposite: number;
  hybridVerdict: 'PASS' | 'NEEDS_REVISION' | 'REJECT';
  fullWave4DComposite: number;
  calibratedWave4DComposite: number;
}

export class DynamoSolarGovernance {
  
  private historyBuffer: Map<string, Array<{ score: number; timestamp: string }>> = new Map();

  async enhanceGovernanceDecision(
    originalRecommendation: string,
    baseVoteWeight: number = 1.0,
    sharePublicly: boolean = false,
    spectralQuality?: number,
  ): Promise<EnhancedGovernanceDecision> {
    const solarContext = await solarGovernance.getSolarContextForGovernance();

    const hammer = await solarGovernance.getProposalSolarIsotopicResonance(originalRecommendation, spectralQuality);

    const adjustedVoteWeight = Math.max(0.5, Math.min(1.5, baseVoteWeight + solarContext.solarActivityModifier + hammer.activityModifier * 0.5));

    let confidenceAdjustment = 0;
    if (solarContext.solarActivityLevel === 'storm') {
      confidenceAdjustment = -0.15;
    } else if (solarContext.solarActivityLevel === 'active') {
      confidenceAdjustment = -0.08;
    } else if (solarContext.solarActivityLevel === 'quiet') {
      confidenceAdjustment = 0.05;
    }

    const adaptiveThresholds = {
      quiet:    { strong: 0.82, good: 0.72, weak: 0.58 },
      moderate: { strong: 0.88, good: 0.78, weak: 0.62 },
      active:   { strong: 0.88, good: 0.78, weak: 0.62 },
      storm:    { strong: 0.92, good: 0.84, weak: 0.70 },
    };
    type ActivityKey = keyof typeof adaptiveThresholds;
    const activityKey = solarContext.solarActivityLevel as ActivityKey;
    const thresholds = adaptiveThresholds[activityKey] || adaptiveThresholds.moderate;

    const r = hammer.structuralResonance;
    let hammerRec: 'PASS' | 'NEEDS_REVISION' | 'REJECT' = 'NEEDS_REVISION';
    let hammerConf = 0.72;
    let hammerReason = 'Solar alignment neutral';

    if (r >= thresholds.strong) {
      hammerRec = 'PASS';
      hammerConf = 0.93;
      hammerReason = 'Strong resonance with current solar conditions';
    } else if (r >= thresholds.good) {
      hammerRec = 'PASS';
      hammerConf = 0.85;
      hammerReason = 'Good alignment with solar field';
    } else if (r >= thresholds.weak) {
      hammerRec = 'NEEDS_REVISION';
      hammerConf = 0.74;
      hammerReason = 'Moderate resonance — needs refinement';
    } else {
      hammerRec = 'REJECT';
      hammerConf = 0.81;
      hammerReason = 'Low resonance with the sun — misaligned';
    }

    if (solarContext.solarActivityLevel === 'storm') {
      if (hammerRec === 'PASS') hammerRec = 'NEEDS_REVISION';
      hammerConf = Math.max(0.60, hammerConf - 0.12);
      hammerReason = 'Solar storm in progress — caution applied';
    } else if (solarContext.solarActivityLevel === 'active' && hammerRec === 'PASS') {
      hammerConf = Math.max(0.70, hammerConf - 0.06);
    }

    const finalRec = hammerRec === 'PASS' ? 'PASS' : hammerRec === 'REJECT' ? 'REJECT' : 'NEEDS_REVISION';
    const tagged = `${originalRecommendation} [SOLAR HAMMER: ${finalRec} @ ${(r * 100).toFixed(0)}%]`;

    const now = new Date();
    const timestamp = now.toISOString();

    if (!this.historyBuffer.has(originalRecommendation)) {
      this.historyBuffer.set(originalRecommendation, []);
    }
    const proposalHistory = this.historyBuffer.get(originalRecommendation)!;
    proposalHistory.push({ score: r, timestamp });

    const threeMinAgo = now.getTime() - 3 * 60 * 1000;
    while (proposalHistory.length > 0 && new Date(proposalHistory[0].timestamp).getTime() < threeMinAgo) {
      proposalHistory.shift();
    }
    if (proposalHistory.length > 10) {
      proposalHistory.splice(0, proposalHistory.length - 10);
    }

    const recentScores = proposalHistory.map(h => h.score);
    const smoothedResonance = recentScores.length > 0
      ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
      : r;

    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (recentScores.length >= 3) {
      const half = Math.floor(recentScores.length / 2);
      const firstHalf = recentScores.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const secondHalf = recentScores.slice(half).reduce((a, b) => a + b, 0) / (recentScores.length - half);
      if (secondHalf - firstHalf > 0.02) trend = 'rising';
      else if (firstHalf - secondHalf > 0.02) trend = 'falling';
    }

    const momentum = recentScores.length >= 2
      ? recentScores[recentScores.length - 1] - recentScores[recentScores.length - 2]
      : 0;

    const peakForecast = {
      estimatedPeakResonance: Math.min(1, r + Math.abs(momentum) * 3),
      minutesToPeak: trend === 'rising' ? Math.max(1, Math.round((1 - r) / (Math.abs(momentum) + 0.01))) : 0,
      windowQuality: (trend === 'rising' && momentum > 0) ? 'optimal' as const : (trend === 'falling' ? 'declining' as const : 'good' as const),
    };

    return {
      originalRecommendation,
      solarContext: {
        solarActivityLevel: solarContext.solarActivityLevel,
        solarActivityModifier: solarContext.solarActivityModifier,
        recommendation: solarContext.recommendation,
        solarIsotopicResonance: hammer.solarIsotopicResonance,
        proposalTdf: hammer.proposalTdf,
        solarReferenceTdf: hammer.solarReferenceTdf,
      },
      adjustedVoteWeight,
      finalRecommendation: tagged,
      confidenceAdjustment,
      resonanceScore: hammer.structuralResonance,
      structuralResonance: hammer.structuralResonance,
      proximity: hammer.proximity,
      phaseAlignment: hammer.phaseAlignment,
      vortexAlignment: hammer.vortexAlignment,
      crossCorrelationLag: hammer.crossCorrelationLag,
      signalTiming: hammer.signalTiming,
      synchronization: hammer.synchronization,
      smoothedResonance,
      trend,
      momentum,
      peakForecast,
      adaptiveThresholds: thresholds,
      recommendation: finalRec,
      confidence: hammerConf,
      isSolarHammer: true,
      hammerReason,
      resonanceHistory: [...proposalHistory],
      spectralQuality: hammer.spectralQuality,
      neuralContextUsed: hammer.neuralContextUsed,
      phaseType: hammer.phaseType,
      isotope: hammer.isotope,
      waveProximity: hammer.waveProximity,
      waveVortexAlignment: hammer.waveVortexAlignment,
      waveSynchronization: hammer.waveSynchronization,
      hybridVortexAlignment: hammer.hybridVortexAlignment,
      hybrid4DComposite: hammer.hybrid4DComposite,
      hybridVerdict: hammer.hybridVerdict,
      fullWave4DComposite: hammer.fullWave4DComposite,
      calibratedWave4DComposite: hammer.calibratedWave4DComposite,
    };
  }
}

export const dynamoSolarGovernance = new DynamoSolarGovernance();