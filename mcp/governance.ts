// mcp/governance.ts - Dynamo Governance Layer v4.8.3 (Refined)
// For 0xRay / StringRay - Isotopic Temporal Vortex Governance
// Integrated into Dynamo MCP with real tool handlers

import { Hono, Context } from 'hono'
import { z } from 'zod'

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

// Refined Blurrn-Native Decision Matrix (v4.8.4)
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

  // Isotopic Ratio (phase coherence) — now purely advisory
  if (isotopicRatio < 0.55) {
    reasons.push('Low phase coherence')
    confidence = Math.max(0.65, confidence - 0.07)
    voteWeight *= 0.93
  } else if (isotopicRatio > 0.88) {
    reasons.push('High phase coherence')
    voteWeight *= 1.03
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

  const proposalSignal = await handlers['emit_isotopic_signal']({ content: proposalText })
  let codeResonance = 0.5
  if (codeDiff) {
    const codeResult = await handlers['cross_correlate']({ contentA: proposalText, contentB: codeDiff })
    codeResonance = codeResult.strength || 0.5
  }

  const currentSignals = [proposalText, ...agentReviews]
  const triangulation = await handlers['triangulate_signals']({
    signals: currentSignals.map((text: string) => ({ content: text })),
  })

  const fusion = await handlers['fuse_symbiotic']({
    partners: currentSignals.map((text: string) => ({ content: text })),
  })

  let historicalCoherence = 0.80
  if (historicalSignalIds.length > 0) {
    const historicalTri = await handlers['triangulate_signals']({
      signals: historicalSignalIds.map((id: string) => ({ content: id })),
    })
    historicalCoherence = historicalTri.coreResonance || 0.80
  }

  const resonance = triangulation.coreResonance || 0.85
  const isotopicRatio = proposalSignal.isotopicRatio || 0.85
  const vortexVolume = triangulation.vortexVolume || 3.0e25

  const decision = applyDecisionMatrix(resonance, isotopicRatio, vortexVolume, historicalCoherence)

  return {
    proposalId,
    governanceIsotopeId: fusion.fusedIsotopeId,
    resonanceScore: resonance,
    isotopicRatio,
    vortexVolume,
    historicalCoherence,
    recommendation: decision.recommendation,
    confidence: decision.confidence,
    voteWeight: decision.voteWeight,
    reasons: decision.reasons,
    note: 'Refined v4.8.3 - Blurrn-native matrix with historical alignment',
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
