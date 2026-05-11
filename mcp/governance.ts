// mcp/governance.ts - Dynamo Governance Layer v4.8.3 (Refined)
// For 0xRay / StringRay - Isotopic Temporal Vortex Governance

import { Hono, Context } from 'hono';
import { z } from 'zod';

// Blurrn Constants
const PHI = 1.666;
const TAU = 0.865;

const app = new Hono();

function ok(c: Context, data: Record<string, unknown>) {
  return c.json({ success: true, ...data });
}

function fail(c: Context, message: string, status: any = 400) {
  return c.json({ success: false, error: message }, status);
}

// Input Schema
const GovernanceSchema = z.object({
  proposalId: z.string().min(3),
  proposalText: z.string().min(30),
  codeDiff: z.string().optional(),
  agentReviews: z.array(z.string()).min(1),
  historicalSignalIds: z.array(z.string()).optional()
});

// Refined Blurrn-Native Decision Matrix (v4.8.3)
function applyDecisionMatrix(resonance: number, isotopicRatio: number, vortexVolume: number, historicalCoherence: number) {
  const reasons: string[] = [];
  let recommendation = "NEEDS REVISION";
  let confidence = 0.75;
  let voteWeight = 1.0;

  // High bar - tied to PHI
  if (resonance >= 0.92 && isotopicRatio >= 0.95) {
    recommendation = "PASS";
    confidence = 0.97;
    voteWeight = 1.4;
    reasons.push("High symbiotic resonance (PHI-aligned)");
  }
  // Medium bar - tied to TAU
  else if (resonance >= 0.82 && isotopicRatio >= 0.88) {
    recommendation = "PASS";
    confidence = 0.89;
    voteWeight = 1.15;
    reasons.push("Solid alignment above TAU threshold");
  }
  // Low bar
  else if (resonance < 0.75 || isotopicRatio < 0.80) {
    recommendation = "REJECT";
    confidence = 0.84;
    reasons.push("Signal below critical threshold (1 - TAU)");
  } else {
    reasons.push("Moderate resonance - requires refinement");
  }

  // Vortex Volume check (W x M = V)
  if (vortexVolume < 2.5e25) {
    reasons.push("Low inertial mass (W x M = V)");
    if (recommendation === "PASS") recommendation = "NEEDS REVISION";
  }

  // Historical coherence bonus/penalty
  if (historicalCoherence < 0.70) {
    reasons.push("Weak historical alignment with past decisions");
    if (recommendation === "PASS") recommendation = "NEEDS REVISION";
  } else if (historicalCoherence > 0.90) {
    reasons.push("Strong continuity with previous governance");
    voteWeight *= 1.1;
  }

  return { recommendation, confidence, voteWeight, reasons };
}

app.post('/governance', async (c: Context) => {
  const parsed = GovernanceSchema.safeParse(await c.req.json());
  if (!parsed.success) return fail(c, parsed.error.issues.map(i => i.message).join('; '));

  const { proposalId, proposalText, codeDiff, agentReviews, historicalSignalIds = [] } = parsed.data;

  // === Step 1: Emit proposal as isotopic signal ===
  const proposalSignal = await callDynamoTool('emit_isotopic_signal', { content: proposalText });

  // === Step 2: Cross-correlate with code (if present) ===
  let codeResonance = 0.5;
  if (codeDiff) {
    const codeResult = await callDynamoTool('cross_correlate', {
      contentA: proposalText,
      contentB: codeDiff
    });
    codeResonance = codeResult.strength || 0.5;
  }

  // === Step 3: Triangulate all current signals ===
  const currentSignals = [proposalText, ...agentReviews];
  const triangulation = await callDynamoTool('triangulate_signals', {
    signals: currentSignals.map(text => ({ content: text }))
  });

  // === Step 4: Fuse symbiotically ===
  const fusion = await callDynamoTool('fuse_symbiotic', {
    partners: currentSignals.map(text => ({ content: text }))
  });

  // === Step 5: Historical Alignment (NEW in v4.8.3) ===
  let historicalCoherence = 0.80; // default
  if (historicalSignalIds.length > 0) {
    const historicalTri = await callDynamoTool('triangulate_signals', {
      signals: historicalSignalIds.map(id => ({ content: id }))
    });
    historicalCoherence = historicalTri.coreResonance || 0.80;
  }

  // === Step 6: Final Scores ===
  const resonance = triangulation.coreResonance || 0.85;
  const isotopicRatio = proposalSignal.isotopicRatio || 0.90;
  const vortexVolume = triangulation.vortexVolume || 3.0e25;

  // === Step 7: Apply Refined Decision Matrix ===
  const decision = applyDecisionMatrix(resonance, isotopicRatio, vortexVolume, historicalCoherence);

  return ok(c, {
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
    note: "Refined v4.8.3 - Blurrn-native matrix with historical alignment"
  });
});

// Health check
app.get('/health', (c: Context) => c.json({
  status: 'ok',
  name: 'blurrn-governance',
  version: '4.8.3',
  description: 'Dynamo Governance Layer for 0xRay / StringRay'
}));

export default app;

// Helper function (placeholder - replace with actual tool caller in production)
async function callDynamoTool(tool: string, args: any) {
  // In real deployment this would call the main Dynamo MCP
  // For now we return simulated high-quality results
  if (tool === 'emit_isotopic_signal') return { isotopicRatio: 0.94 + Math.random() * 0.05 };
  if (tool === 'cross_correlate') return { strength: 0.87 + Math.random() * 0.1 };
  if (tool === 'triangulate_signals') return { coreResonance: 0.89 + Math.random() * 0.08, vortexVolume: 3.2e25 + Math.random() * 0.5e25 };
  if (tool === 'fuse_symbiotic') return { fusedIsotopeId: `governance-${Date.now()}` };
  return {};
}
