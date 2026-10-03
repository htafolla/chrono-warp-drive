import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TextDerivedSignal } from '../../mcp/lib/signalFromText'

vi.mock('../../mcp/lib/wavePropagation.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../mcp/lib/wavePropagation.js')>()
  return {
    ...actual,
    sentenceToEmbedding16: (text: string) => Promise.resolve(actual.textToEmbedding16(text)),
  }
})

const TEXT = 'Origin creates, Transpondence redeems, Resonance sanctifies'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('missing readings stay on the text', () => {
  it('uses proposal coherence when no review strength and no history are present', async () => {
    const { dynamoSolarGovernance } = await import('../../mcp/lib/dynamoSolarGovernance.js')
    vi.spyOn(dynamoSolarGovernance, 'enhanceGovernanceDecision').mockRejectedValue(new Error('sun down'))
    const { evaluateGovernance } = await import('../../mcp/governance.js')
    const result = await evaluateGovernance(
      {
        emit_isotopic_signal: async () => ({ ok: true }),
        fuse_symbiotic: async () => ({ fusedIsotopeId: 'blurrn-core-1' }),
        cross_correlate: async () => ({}),
        triangulate_signals: async () => ({ coreResonance: 0 }),
      },
      {
        proposalId: 'prop-text',
        proposalText: TEXT,
        agentReviews: ['one review long enough to be present'],
        source: 'human',
      },
    )
    const coherence = new TextDerivedSignal(TEXT).phaseCoherence
    expect(result.resonanceScore).toBe(coherence)
    expect(result.historicalCoherence).toBe(coherence)
  })

  it('keeps a triangulated core of zero', async () => {
    const { dynamoSolarGovernance } = await import('../../mcp/lib/dynamoSolarGovernance.js')
    vi.spyOn(dynamoSolarGovernance, 'enhanceGovernanceDecision').mockRejectedValue(new Error('sun down'))
    const { evaluateGovernance } = await import('../../mcp/governance.js')
    const result = await evaluateGovernance(
      {
        emit_isotopic_signal: async () => ({ ok: true }),
        fuse_symbiotic: async () => ({ fusedIsotopeId: 'blurrn-core-2' }),
        cross_correlate: async () => ({ strength: 0.5, isotopicRatio: 0.5, vortexVolume: 1 }),
        triangulate_signals: async () => ({ coreResonance: 0 }),
      },
      {
        proposalId: 'prop-zero',
        proposalText: TEXT,
        agentReviews: ['one review long enough to be present'],
        historicalSignalIds: ['old-a', 'old-b'],
        source: 'human',
      },
    )
    expect(result.historicalCoherence).toBe(0)
  })

  it('rejects a hammer whose solar read throws', async () => {
    const { solarDataFetcher } = await import('../../mcp/lib/solarDataFetcher.js')
    vi.spyOn(solarDataFetcher, 'fetchCurrentSolarData').mockRejectedValue(new Error('no sun'))
    const { solarGovernance } = await import('../../mcp/lib/solarGovernanceIntegration.js')
    const result = await solarGovernance.getProposalSolarIsotopicResonance(TEXT, undefined, undefined, 1746915300000)
    const derived = new TextDerivedSignal(TEXT)
    expect(result.hybridVerdict).toBe('REJECT')
    expect(result.fullBoxVerdict).toBe('REJECT')
    expect(result.fullBox7DVerdict).toBe('REJECT')
    expect(result.isotope).toBe(derived.getIsotopeId())
    expect(result.isotope).not.toBe('C-12')
    expect(result.structuralResonance).toBe(0)
    expect(result.phaseCoherenceProposal).toBe(derived.phaseCoherence)
    expect(result.phaseCoherenceSun).toBe(0)
    expect(result.solarReferenceTdf).toBe(0)
    expect(result.signalTiming).toBe('trailing')
  })
})
