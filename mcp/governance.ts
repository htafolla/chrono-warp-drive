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

// Refined Blurrn-Native Decision Matrix (v4.8.3)
export function applyDecisionMatrix(
  resonance: number,
  isotopicRatio: number,
  vortexVolume: number,
  historicalCoherence: number,
) {
  const reasons: string[] = []
  let recommendation = 'NEEDS_REVISION'
  let confidence = 0.75
  let voteWeight = 1.0

  if (resonance >= 0.92) {
    recommendation = 'PASS'
    confidence = isotopicRatio >= 0.95 ? 0.97 : 0.93
    voteWeight = isotopicRatio >= 0.95 ? 1.4 : 1.2
    reasons.push('High symbiotic resonance (PHI-aligned)')
  } else if (resonance >= 0.82) {
    recommendation = 'PASS'
    confidence = isotopicRatio >= 0.88 ? 0.89 : 0.85
    voteWeight = 1.15
    reasons.push('Solid alignment above TAU threshold')
  } else if (resonance < 0.75) {
    recommendation = 'REJECT'
    confidence = 0.84
    reasons.push('Signal below critical threshold (1 - TAU)')
  } else {
    reasons.push('Moderate resonance - requires refinement')
  }

  if (resonance >= 0.75 && isotopicRatio < 0.50) {
    reasons.push('Low isotopic alignment — consider revision')
    confidence *= 0.9
  }

  if (vortexVolume < 2.5e25) {
    reasons.push('Low inertial mass (W x M = V)')
    if (recommendation === 'PASS') recommendation = 'NEEDS_REVISION'
  }

  if (historicalCoherence < 0.70) {
    reasons.push('Weak historical alignment with past decisions')
    if (recommendation === 'PASS') recommendation = 'NEEDS_REVISION'
  } else if (historicalCoherence > 0.90) {
    reasons.push('Strong continuity with previous governance')
    voteWeight *= 1.1
  }

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
