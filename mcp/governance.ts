// mcp/governance.ts - Dynamo Governance Layer v4.8.3 (Refined)
// For 0xRay / StringRay - Isotopic Temporal Vortex Governance
// Integrated into Dynamo MCP with real tool handlers

import { Hono, Context } from 'hono'
import { z } from 'zod'
import { dynamoSolarGovernance } from './lib/dynamoSolarGovernance.js'

// Blurrn Constants
const PHI = 1.666
const TAU = 0.865

// Input Schema
export const GovernanceSchema = z.object({
  proposalId: z.string().min(3),
  proposalText: z.string().min(30),
  codeDiff: z.string().optional(),
  agentReviews: z.array(z.string()).min(1),
  historicalSignalIds: z.array(z.string()).optional(),
})

// Refined Blurrn-Native Decision Matrix (v4.8.5)
export function applyDecisionMatrix(
  resonance: number,
  isotopicRatio: number,
  vortexVolume: number,
  historicalCoherence: number,
) {
  const reasons: string[] = []
  let recommendation: 'PASS' | 'NEEDS_REVISION' | 'REJECT' = 'NEEDS_REVISION'
  let confidence = 0.72
  let voteWeight = 1.0

  // === Primary Driver: Resonance ===
  if (resonance >= 0.90) {
    recommendation = 'PASS'
    confidence = 0.93
    voteWeight = 1.28
    reasons.push('High symbiotic resonance')
  } else if (resonance >= 0.80) {
    recommendation = 'PASS'
    confidence = 0.86
    voteWeight = 1.15
    reasons.push('Strong resonance above stability threshold')
  } else if (resonance >= 0.68) {
    recommendation = 'NEEDS_REVISION'
    confidence = 0.76
    voteWeight = 1.0
    reasons.push('Moderate resonance — refinement recommended')
  } else {
    recommendation = 'REJECT'
    confidence = 0.80
    voteWeight = 0.65
    reasons.push('Low resonance — insufficient signal coherence')
  }

  // === Soft Modifiers Only (never change the primary recommendation) ===

  // Vortex Volume (inertial mass)
  if (vortexVolume < 2.5e25) {
    reasons.push('Low inertial mass (W x M = V)')
    if (recommendation === 'PASS') {
      recommendation = 'NEEDS_REVISION'
      confidence = Math.max(0.70, confidence - 0.06)
      voteWeight *= 0.88
    }
  } else if (vortexVolume > 4.5e25) {
    reasons.push('High inertial mass — strong decision anchoring')
    voteWeight *= 1.07
  }

  // Isotopic Ratio (phase coherence) — legacy metric, advisory only
  if (isotopicRatio < 0.55) {
    reasons.push('Low phase coherence (legacy)')
    confidence = Math.max(0.65, confidence - 0.05)
  } else if (isotopicRatio > 0.88) {
    reasons.push('High phase coherence (legacy)')
  }

  // Historical Coherence
  if (historicalCoherence < 0.70) {
    reasons.push('Weak historical alignment with past decisions')
    if (recommendation === 'PASS') recommendation = 'NEEDS_REVISION'
  } else if (historicalCoherence > 0.90) {
    reasons.push('Strong continuity with previous governance')
    voteWeight *= 1.08
  }

  // Final clamping
  confidence = Math.max(0.5, Math.min(0.98, confidence))
  voteWeight = Math.max(0.5, Math.min(1.6, voteWeight))

  return { recommendation, confidence, voteWeight, reasons }
}

// Governance engine — calls real Dynamo MCP tool handlers
export async function evaluateGovernance(
  handlers: Record<string, (args: any) => any>,
  params: z.infer<typeof GovernanceSchema>,
) {
  const { proposalId, proposalText, codeDiff, agentReviews, historicalSignalIds = [] } = params

  // 1. Emit the proposal as an isotopic signal
  const proposalSignal = await handlers['emit_isotopic_signal']({ content: proposalText })
  const isotopicRatio = proposalSignal.isotopicRatio ?? 0.85

  // 2. Use fuse_symbiotic only to get the governance isotope ID
  const fusion = await handlers['fuse_symbiotic']({
    partners: [proposalText, ...agentReviews].map((text: string) => ({ content: text })),
  })
  const governanceIsotopeId = fusion.fusedIsotopeId

  // 3. Derive resonance from real cross_correlate calls (proposal ↔ each agent review)
  const strengths: number[] = []
  let vortexVolume = 3.0e25

  for (const review of agentReviews) {
    const cross = await handlers['cross_correlate']({
      contentA: proposalText,
      contentB: review,
    })
    if (typeof cross.strength === 'number') {
      strengths.push(cross.strength)
    }
    if (cross.metadata?.vortexVolume && cross.metadata.vortexVolume > 1e24) {
      vortexVolume = cross.metadata.vortexVolume
    }
  }

  const resonance = strengths.length > 0
    ? strengths.reduce((sum, s) => sum + s, 0) / strengths.length
    : 0.78

  // 4. Historical coherence
  let historicalCoherence = 0.80
  if (historicalSignalIds.length > 0) {
    const historicalTri = await handlers['triangulate_signals']({
      signals: historicalSignalIds.map((id: string) => ({ content: id })),
    })
    historicalCoherence = historicalTri.coreResonance || 0.80
  }

  // 5. Solar isotopic hammer (direct from sun, can override)
  let solarHammerRes = resonance
  let hammerNote = ''
  try {
    const hammer = await dynamoSolarGovernance.enhanceGovernanceDecision(proposalText, 1.0)
    if (typeof hammer.resonanceScore === 'number') {
      solarHammerRes = hammer.resonanceScore
      hammerNote = ` | solar-hammer:${(solarHammerRes*100).toFixed(0)}%`
      // If hammer is extreme, let it drive the rec (override)
      if (solarHammerRes >= 0.88 || solarHammerRes <= 0.45) {
        resonance = solarHammerRes // use hammer as the resonance for matrix
      }
    }
  } catch {}

  // 6. Run the decision matrix (now with possible hammer override)
  const decision = applyDecisionMatrix(resonance, isotopicRatio, vortexVolume, historicalCoherence)

  return {
    proposalId,
    governanceIsotopeId,
    resonanceScore: resonance,
    solarHammerResonance: solarHammerRes,
    recommendation: decision.recommendation,
    confidence: decision.confidence,
    voteWeight: decision.voteWeight,
    reasons: decision.reasons,
    note: 'v4.8.6-solar-hammer - resonance prioritizes sun-isotopic alignment' + hammerNote,
    diagnostics: {
      isotopicRatio,
      vortexVolume,
      historicalCoherence,
    },
  }
}

// Route factory — mounted into Dynamo MCP
export function createGovernanceRouter(handlers: Record<string, (args: any) => any>) {
  const gov = new Hono()

  gov.post('/governance', async (c: Context) => {
    const parsed = GovernanceSchema.safeParse(await c.req.json())
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.issues.map((i: any) => i.message).join('; ') }, 400)
    }
    const result = await evaluateGovernance(handlers, parsed.data)
    return c.json({ success: true, ...result })
  })

  return gov
}
