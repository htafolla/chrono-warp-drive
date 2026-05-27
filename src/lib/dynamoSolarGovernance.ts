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
  recommendation?: 'PASS' | 'NEEDS_REVISION' | 'REJECT';
  confidence?: number;
  isSolarHammer?: boolean;
  hammerReason?: string;
  resonanceHistory?: Array<{ score: number; timestamp: string }>;
}

export class DynamoSolarGovernance {
  
  async enhanceGovernanceDecision(
    originalRecommendation: string,
    baseVoteWeight: number = 1.0
  ): Promise<EnhancedGovernanceDecision> {
    const solarContext = await solarGovernance.getSolarContextForGovernance();

    const hammer = await solarGovernance.getProposalSolarIsotopicResonance(originalRecommendation);

    const adjustedVoteWeight = Math.max(0.5, Math.min(1.5, baseVoteWeight + solarContext.solarActivityModifier + hammer.activityModifier * 0.5));

    let confidenceAdjustment = 0;
    if (solarContext.solarActivityLevel === 'storm') {
      confidenceAdjustment = -0.15;
    } else if (solarContext.solarActivityLevel === 'active') {
      confidenceAdjustment = -0.08;
    } else if (solarContext.solarActivityLevel === 'quiet') {
      confidenceAdjustment = 0.05;
    }

    const r = hammer.structuralResonance;
    let hammerRec: 'PASS' | 'NEEDS_REVISION' | 'REJECT' = 'NEEDS_REVISION';
    let hammerConf = 0.72;
    let hammerReason = 'Solar alignment neutral';

    if (r >= 0.88) {
      hammerRec = 'PASS';
      hammerConf = 0.93;
      hammerReason = 'Strong resonance with current solar conditions';
    } else if (r >= 0.78) {
      hammerRec = 'PASS';
      hammerConf = 0.85;
      hammerReason = 'Good alignment with solar field';
    } else if (r >= 0.62) {
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
      recommendation: finalRec,
      confidence: hammerConf,
      isSolarHammer: true,
      hammerReason,
    };
  }
}

export const dynamoSolarGovernance = new DynamoSolarGovernance();