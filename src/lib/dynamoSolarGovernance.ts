// src/lib/dynamoSolarGovernance.ts
// Enhanced Dynamo Governance with real-time Solar Context

import { solarGovernance } from './solarGovernanceIntegration';

export interface EnhancedGovernanceDecision {
  originalRecommendation: string;
  solarContext: {
    solarActivityLevel: string;
    solarResonance: number;
    solarActivityModifier: number;
    recommendation: string;
  };
  adjustedVoteWeight: number;
  finalRecommendation: string;
  confidenceAdjustment: number;
}

export class DynamoSolarGovernance {
  
  async enhanceGovernanceDecision(
    originalRecommendation: string,
    baseVoteWeight: number = 1.0
  ): Promise<EnhancedGovernanceDecision> {
    
    // Get current solar context
    const solarContext = await solarGovernance.getSolarContextForGovernance();
    
    // Calculate adjusted vote weight
    const adjustedVoteWeight = Math.max(0.5, Math.min(1.5, baseVoteWeight + solarContext.solarActivityModifier));
    
    // Adjust confidence based on solar conditions
    let confidenceAdjustment = 0;
    if (solarContext.solarActivityLevel === 'storm') {
      confidenceAdjustment = -0.15;
    } else if (solarContext.solarActivityLevel === 'active') {
      confidenceAdjustment = -0.08;
    } else if (solarContext.solarActivityLevel === 'quiet') {
      confidenceAdjustment = 0.05;
    }
    
    // Create final recommendation
    let finalRecommendation = originalRecommendation;
    if (solarContext.solarActivityLevel === 'storm') {
      finalRecommendation = `${originalRecommendation} [SOLAR STORM WARNING]`;
    } else if (solarContext.solarActivityLevel === 'active') {
      finalRecommendation = `${originalRecommendation} [Elevated Solar Activity]`;
    }
    
    return {
      originalRecommendation,
      solarContext: {
        solarActivityLevel: solarContext.solarActivityLevel,
        solarResonance: solarContext.solarResonance,
        solarActivityModifier: solarContext.solarActivityModifier,
        recommendation: solarContext.recommendation
      },
      adjustedVoteWeight,
      finalRecommendation,
      confidenceAdjustment
    };
  }
}

// Singleton
export const dynamoSolarGovernance = new DynamoSolarGovernance();