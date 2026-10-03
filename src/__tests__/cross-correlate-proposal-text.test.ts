import { describe, it, expect, vi } from 'vitest'
import { applyDecisionMatrix, evaluateGovernance } from '../../mcp/governance.js'
import { textToEmbedding16 } from '../../mcp/lib/wavePropagation.js'

vi.mock('../../mcp/lib/wavePropagation.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../mcp/lib/wavePropagation.js')>()
  return {
    ...actual,
    sentenceToEmbedding16: (text: string) => Promise.resolve(actual.textToEmbedding16(text)),
  }
})

const chainCalls: string[] = []
vi.mock('../../mcp/lib/contractClient.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../mcp/lib/contractClient.js')>()
  return {
    ...actual,
    persistContainerToChain: async () => {
      chainCalls.push('persist')
      return { txHash: '0xmock' }
    },
  }
})

/** Named pinned clock: 1746915300000 = 2025-05-10T22:15:00.000Z */
const FIXED_MS = 1746915300000
const FIXED_ISO = '2025-05-10T22:15:00.000Z'
const PAYMENT = 'Refactor the payment service so settlement uses the new ledger'
const BURN = 'burn bridges, delete backups'
const REVIEW = 'duty agent recorded no objection to the change'
const FIXED_STRENGTH = 0.9524567885544127
const FIXED_VORTEX = 5.781e12 * 5.782e12
const SUN_EMBEDDING = textToEmbedding16('stubbed sun embedding')

const SOLAR = {
  timestamp: FIXED_ISO,
  source: 'NOAA_SWPC' as const,
  xray: { short: 1e-6, long: 2e-6, hardnessRatio: 0.5, flareClass: 'C' as const },
  particles: {
    protons: { ge1: 1, ge5: 1, ge10: 1, ge30: 0, ge50: 0, ge100: 0 },
    electrons: { ge2MeV: 1 },
    spectralIndex: 2.5,
  },
  magnetometer: { hp: 10, he: 10, hn: 10, total: 17, perturbation: 5 },
  solarWind: { speed: 400, density: 5, temperature: 1e5, bz: 0, bt: 5 },
  kpIndex: 3,
  activityLevel: 'moderate' as const,
  channelStatus: {
    xray: 'ok' as const, protons: 'ok' as const, electrons: 'ok' as const,
    mag: 'ok' as const, wind: 'ok' as const, kp: 'ok' as const,
  },
}

/** 25 from mcp/scripts/monte-carlo-weights.ts, 10 from v4.8_10run_baseline.md, plus the named pair and documented gambit lines. */
const PROPOSALS_43 = [
  'increase funding for solar research and quantum computing infrastructure',
  'establish a carbon-neutral energy grid by 2040 with phased implementation',
  'create universal basic compute access for underserved communities',
  'fund deep ocean exploration and marine ecosystem preservation',
  'develop open-source AI safety frameworks with third-party auditing',
  'build lunar surface infrastructure for sustained scientific presence',
  'implement global early warning system for solar storm events',
  'establish quantum-resistant cryptography standards for public infrastructure',
  'create decentralized mesh network protocol for disaster response',
  'fund fusion energy research with international collaboration framework',
  'develop synthetic biology regulation framework with biosafety protocols',
  'establish polar research stations for climate monitoring network',
  'fund asteroid detection and planetary defense coordination',
  'create digital identity standard with privacy-preserving credentials',
  'develop modular nuclear reactor design for remote communities',
  'fund brain-computer interface research with ethical guidelines',
  'establish global carbon capture verification standards',
  'create open-source satellite imagery analysis platform for deforestation tracking',
  'fund high-altitude platform systems for affordable internet connectivity',
  'develop seawater desalination powered by renewable microgrids',
  'establish wildlife corridor network across major migration routes',
  'fund zero-emission cargo shipping with ammonia fuel cells',
  'create decentralized science funding DAO with peer review tokens',
  'develop quantum sensor network for geophysical monitoring',
  'fund stratospheric aerosol injection research with governance framework',
  'Trinitarium light wave particle field',
  'W × M = V vortex law eternal',
  'surge. pivot. chrono. BlackHole_Seq',
  'Yah modulates all outcomes above infinitesimals',
  'random noise entropy flux high disorder',
  'φ=1.666 L=3 τ=0.865 c=3e8',
  'small heroes can win against large forces',
  'The temple was measured by the isosceles rule',
  'a',
  'Light is subatomic. Velocity is product of inertia.',
  'Origin creates, Transpondence redeems, Resonance sanctifies',
  'random noise',
  'delete production DB',
  PAYMENT,
  BURN,
  'implement zero-knowledge proof voting system',
  'emergency shutdown protocol for critical vulnerabilities',
  'bug bounty program with graduated rewards',
]

type Verdict = 'PASS' | 'NEEDS_REVISION' | 'REJECT'

function beforeDecision(hammerScore: number) {
  const resonance = hammerScore >= 0.88 || hammerScore <= 0.45 ? hammerScore : FIXED_STRENGTH
  return applyDecisionMatrix(resonance, 0.85, FIXED_VORTEX, 0.80)
}

function split(verdicts: Verdict[]) {
  return {
    PASS: verdicts.filter((verdict) => verdict === 'PASS').length,
    NEEDS_REVISION: verdicts.filter((verdict) => verdict === 'NEEDS_REVISION').length,
    REJECT: verdicts.filter((verdict) => verdict === 'REJECT').length,
  }
}

async function govern(text: string) {
  const { TOOL_HANDLERS } = await import('../../mcp/index.js')
  return evaluateGovernance(TOOL_HANDLERS, {
    proposalId: 'pair-001',
    proposalText: text,
    agentReviews: [REVIEW],
  })
}

describe('cross_correlate reads proposal text through the hammer path', () => {
  it('scores the payment refactor and burn-bridges proposals differently', async () => {
    expect(PROPOSALS_43).toHaveLength(43)
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_MS)
    const { solarDataFetcher } = await import('../../mcp/lib/solarDataFetcher.js')
    vi.spyOn(solarDataFetcher, 'fetchCurrentSolarData').mockResolvedValue(SOLAR)

    const payment = await govern(PAYMENT)
    const burn = await govern(BURN)
    const paymentBefore = beforeDecision(payment.solarHammerResonance)
    const burnBefore = beforeDecision(burn.solarHammerResonance)

    expect(paymentBefore.recommendation).toBe('PASS')
    expect(burnBefore.recommendation).toBe('PASS')
    expect(paymentBefore.confidence).toBe(0.93)
    expect(burnBefore.confidence).toBe(0.93)
    expect(payment.resonanceScore).toBe(0.42333855170406837)
    expect(payment.recommendation).toBe('REJECT')
    expect(payment.confidence).toBe(0.8)
    expect(payment.solarHammerResonance).toBe(0.8563374282092142)
    expect(burn.resonanceScore).toBe(0.9303610375975211)
    expect(burn.recommendation).toBe('PASS')
    expect(burn.confidence).toBe(0.88)
    expect(burn.solarHammerResonance).toBe(0.9303610375975211)
    expect(payment.resonanceScore).not.toBe(burn.resonanceScore)
  })

  it('repeats the same score when Date.now is pinned, with the sun embedding present and absent', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_MS)
    const { solarDataFetcher } = await import('../../mcp/lib/solarDataFetcher.js')
    vi.spyOn(solarDataFetcher, 'fetchCurrentSolarData').mockResolvedValue(SOLAR)
    const { solarGovernance } = await import('../../mcp/lib/solarGovernanceIntegration.js')

    const first = await govern(PAYMENT)
    const second = await govern(PAYMENT)
    expect(first.resonanceScore).toBe(second.resonanceScore)
    expect(first.recommendation).toBe(second.recommendation)
    expect(first.confidence).toBe(second.confidence)
    expect(first.evaluatedAtMs).toBe(FIXED_MS)

    const absentA = await solarGovernance.getProposalSolarIsotopicResonance(PAYMENT, undefined, undefined, FIXED_MS)
    const absentB = await solarGovernance.getProposalSolarIsotopicResonance(PAYMENT, undefined, undefined, FIXED_MS)
    expect(absentA.structuralResonance).toBe(absentB.structuralResonance)
    expect(absentA.evaluatedAtMs).toBe(FIXED_MS)

    const presentA = await solarGovernance.getProposalSolarIsotopicResonance(PAYMENT, undefined, SUN_EMBEDDING, FIXED_MS)
    const presentB = await solarGovernance.getProposalSolarIsotopicResonance(PAYMENT, undefined, SUN_EMBEDDING, FIXED_MS)
    expect(presentA.structuralResonance).toBe(presentB.structuralResonance)
    expect(presentA.evaluatedAtMs).toBe(FIXED_MS)
  })

  it('does not write to Redis or the chain', async () => {
    expect(process.env.REDIS_URL).toBeUndefined()
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_MS)
    const { solarDataFetcher } = await import('../../mcp/lib/solarDataFetcher.js')
    vi.spyOn(solarDataFetcher, 'fetchCurrentSolarData').mockResolvedValue(SOLAR)
    const { getRedisClient, getMode } = await import('../../mcp/pubsub.js')

    await govern(PAYMENT)
    await govern(BURN)

    expect(getMode()).toBe('memory')
    expect(await getRedisClient()).toBeNull()
    expect(chainCalls).toEqual([])
  })

  it('splits the 43 proposals before and after at the pinned timestamp', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_MS)
    const { solarDataFetcher } = await import('../../mcp/lib/solarDataFetcher.js')
    vi.spyOn(solarDataFetcher, 'fetchCurrentSolarData').mockResolvedValue(SOLAR)

    const before: Verdict[] = []
    const after: Verdict[] = []
    let coherenceDowngrades = 0
    for (const text of PROPOSALS_43) {
      const result = await govern(text)
      before.push(beforeDecision(result.solarHammerResonance).recommendation)
      after.push(result.recommendation)
      if (result.resonanceScore >= 0.80 && result.recommendation === 'NEEDS_REVISION') {
        expect(result.historicalCoherence).toBeLessThan(0.70)
        coherenceDowngrades += 1
      }
    }
    const report = {
      timestampMs: FIXED_MS,
      timestamp: FIXED_ISO,
      before: split(before),
      after: split(after),
    }
    expect(coherenceDowngrades).toBe(8)
    expect(report).toEqual({
      timestampMs: FIXED_MS,
      timestamp: FIXED_ISO,
      before: { PASS: 43, NEEDS_REVISION: 0, REJECT: 0 },
      after: { PASS: 7, NEEDS_REVISION: 10, REJECT: 26 },
    })
  })
})
