// mcp/lib/dynamoSolarGovernance.ts
// Enhanced Dynamo Governance with real-time Solar Context

import { solarGovernance } from './solarGovernanceIntegration.js'

export interface EnhancedGovernanceDecision {
  originalRecommendation: string
  solarContext: {
    solarActivityLevel: string
    solarActivityModifier: number
    recommendation: string
    // Hammer fields now surfaced
    solarIsotopicResonance?: number
    proposalTdf?: number
    solarReferenceTdf?: number
  }
  adjustedVoteWeight: number
  finalRecommendation: string
  confidenceAdjustment: number
  // THE SOLAR ISOTOPIC HAMMER — direct resonance score (0-1) that can override
  resonanceScore?: number
  recommendation?: 'PASS' | 'NEEDS_REVISION' | 'REJECT'
  confidence?: number
  isSolarHammer?: boolean
  hammerReason?: string
}

export interface PublicFeedEntry {
  proposal: string
  resonanceScore: number
  recommendation: string
  activityLevel: string
  timestamp: string
}

const MAX_FEED_ENTRIES = 50
const publicFeed: PublicFeedEntry[] = []

export function getPublicFeed(): PublicFeedEntry[] {
  return publicFeed
}

export class DynamoSolarGovernance {

  async enhanceGovernanceDecision(
    originalRecommendation: string,
    baseVoteWeight: number = 1.0,
    sharePublicly: boolean = false,
  ): Promise<EnhancedGovernanceDecision> {
    // Always fetch the generic context (for backward compat + UI labels)
    const solarContext = await solarGovernance.getSolarContextForGovernance()

    // THE FIX: compute the real per-proposal solar isotopic resonance hammer
    const hammer = await solarGovernance.getProposalSolarIsotopicResonance(originalRecommendation)

    const adjustedVoteWeight = Math.max(0.5, Math.min(1.5, baseVoteWeight + solarContext.solarActivityModifier + hammer.activityModifier * 0.5))

    let confidenceAdjustment = 0
    if (solarContext.solarActivityLevel === 'storm') {
      confidenceAdjustment = -0.15
    } else if (solarContext.solarActivityLevel === 'active') {
      confidenceAdjustment = -0.08
    } else if (solarContext.solarActivityLevel === 'quiet') {
      confidenceAdjustment = 0.05
    }

    // === SOLAR ISOTOPIC HAMMER DECISION (can override) ===
    // resonanceScore is the direct sun-aligned score. High = PASS hammer, low = REJECT hammer
    const r = hammer.solarIsotopicResonance
    let hammerRec: 'PASS' | 'NEEDS_REVISION' | 'REJECT' = 'NEEDS_REVISION'
    let hammerConf = 0.72
    let hammerReason = 'Solar alignment neutral'

if (r >= 0.88) {
      hammerRec = 'PASS'
      hammerConf = 0.93
      hammerReason = 'Strong resonance with current solar conditions'
    } else if (r >= 0.78) {
      hammerRec = 'PASS'
      hammerConf = 0.85
      hammerReason = 'Good alignment with solar field'
    } else if (r >= 0.62) {
      hammerRec = 'NEEDS_REVISION'
      hammerConf = 0.74
      hammerReason = 'Moderate resonance — needs refinement'
    } else {
      hammerRec = 'REJECT'
      hammerConf = 0.81
      hammerReason = 'Low resonance with the sun — misaligned'
    }

    // Storm veto / caution on top of hammer
    if (solarContext.solarActivityLevel === 'storm') {
      if (hammerRec === 'PASS') hammerRec = 'NEEDS_REVISION'
      hammerConf = Math.max(0.60, hammerConf - 0.12)
      hammerReason = 'Solar storm in progress — caution applied'
    } else if (solarContext.solarActivityLevel === 'active' && hammerRec === 'PASS') {
      hammerConf = Math.max(0.70, hammerConf - 0.06)
    }

    // Storm veto / caution on top of hammer
    if (solarContext.solarActivityLevel === 'storm') {
      if (hammerRec === 'PASS') hammerRec = 'NEEDS_REVISION'
      hammerConf = Math.max(0.60, hammerConf - 0.12)
      hammerReason += ' [SOLAR STORM — caution applied]'
    } else if (solarContext.solarActivityLevel === 'active' && hammerRec === 'PASS') {
      hammerConf = Math.max(0.70, hammerConf - 0.06)
    }

    const finalRec = hammerRec === 'PASS' ? 'PASS' : hammerRec === 'REJECT' ? 'REJECT' : 'NEEDS_REVISION'
    const tagged = `${originalRecommendation} [SOLAR HAMMER: ${finalRec} @ ${(r*100).toFixed(0)}%]`

    if (sharePublicly && originalRecommendation.length >= 3) {
      publicFeed.unshift({
        proposal: originalRecommendation,
        resonanceScore: r,
        recommendation: finalRec,
        activityLevel: solarContext.solarActivityLevel,
        timestamp: new Date().toISOString(),
      })
      if (publicFeed.length > MAX_FEED_ENTRIES) publicFeed.pop()
    }

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
      // Direct hammer outputs for UI / callers to use as overriding signal
      resonanceScore: hammer.solarIsotopicResonance,
      recommendation: finalRec,
      confidence: hammerConf,
      isSolarHammer: true,
      hammerReason,
    }
  }
}

export const dynamoSolarGovernance = new DynamoSolarGovernance()
