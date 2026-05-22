// mcp/lib/solarGovernanceIntegration.ts
// Integrates real-time solar data into Dynamo governance decisions

import { fetchCurrentSolarData } from './solarDataFetcher.js'

export interface SolarGovernanceContext {
  solarActivityLevel: string
  solarResonance: number
  solarActivityModifier: number // -0.15 to +0.05
  currentSunMetamorphosisIndex: number
  timestamp: string
  recommendation: string
}

export class SolarGovernanceIntegration {

  async getSolarContextForGovernance(): Promise<SolarGovernanceContext> {
    try {
      const solarData = await fetchCurrentSolarData()

      // Use actual solar activity from NOAA
      const baseResonance = 0.6735

      let resonanceModifier = 0
      let activityModifier = 0
      let recommendation = 'Standard governance conditions'

      switch (solarData.activityLevel) {
        case 'quiet':
          resonanceModifier = 0.02
          activityModifier = 0.05
          recommendation = 'Calm solar conditions - high decision stability'
          break
        case 'moderate':
          resonanceModifier = 0
          activityModifier = 0
          recommendation = 'Normal solar conditions'
          break
        case 'active':
          resonanceModifier = -0.03
          activityModifier = -0.08
          recommendation = 'Elevated solar activity - consider increased caution'
          break
        case 'storm':
          resonanceModifier = -0.08
          activityModifier = -0.15
          recommendation = 'Solar storm detected - recommend delayed or weighted decisions'
          break
      }

      const finalResonance = Math.max(0.4, Math.min(0.95, baseResonance + resonanceModifier))

      return {
        solarActivityLevel: solarData.activityLevel,
        solarResonance: finalResonance,
        solarActivityModifier: activityModifier,
        currentSunMetamorphosisIndex: baseResonance,
        timestamp: solarData.timestamp,
        recommendation,
      }
    } catch (error) {
      console.error('Error getting solar governance context:', error)
      return {
        solarActivityLevel: 'moderate',
        solarResonance: 0.6735,
        solarActivityModifier: 0,
        currentSunMetamorphosisIndex: 0.6735,
        timestamp: new Date().toISOString(),
        recommendation: 'Unable to fetch solar data - using neutral context',
      }
    }
  }
}

export const solarGovernance = new SolarGovernanceIntegration()
