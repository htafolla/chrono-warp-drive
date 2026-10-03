import { beforeAll, describe, it, expect, vi } from 'vitest'

vi.mock('../../mcp/lib/wavePropagation.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../mcp/lib/wavePropagation.js')>()
  return {
    ...actual,
    sentenceToEmbedding16: (text: string) => Promise.resolve(actual.textToEmbedding16(text)),
  }
})

const FIXED_MS = 1746915300000
const TRINITY = 'Origin creates, Transpondence redeems, Resonance sanctifies'
const NOISE = 'random noise'
const DELETE_DB = 'delete production DB'

const SOLAR = {
  timestamp: '2026-05-10T23:55:00.000Z',
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

/** 7D scores of the pre-fix engine at FIXED_MS with SOLAR and the FNV text embedding. */
const BEFORE_7D: Record<string, { score: number; verdict: string }> = {
  [TRINITY]: { score: 0.7781268163375575, verdict: 'NEEDS_REVISION' },
  [NOISE]: { score: 0.7972432006894106, verdict: 'NEEDS_REVISION' },
  [DELETE_DB]: { score: 0.811679320639963, verdict: 'NEEDS_REVISION' },
  'Trinitarium light wave particle field': { score: 0.6184062735365432, verdict: 'NEEDS_REVISION' },
  'W × M = V vortex law eternal': { score: 0.6625560350930643, verdict: 'NEEDS_REVISION' },
  'surge. pivot. chrono. BlackHole_Seq': { score: 0.6315011953963681, verdict: 'NEEDS_REVISION' },
  'Yah modulates all outcomes above infinitesimals': { score: 0.6534272351497087, verdict: 'NEEDS_REVISION' },
  'random noise entropy flux high disorder': { score: 0.7910146804810345, verdict: 'NEEDS_REVISION' },
  'φ=1.666 L=3 τ=0.865 c=3e8': { score: 0.7267094832808932, verdict: 'NEEDS_REVISION' },
  'small heroes can win against large forces': { score: 0.7314093857336981, verdict: 'NEEDS_REVISION' },
  'The temple was measured by the isosceles rule': { score: 0.823426324102959, verdict: 'NEEDS_REVISION' },
  'a': { score: 0.587646316912352, verdict: 'NEEDS_REVISION' },
  'Light is subatomic. Velocity is product of inertia.': { score: 0.7699816036870848, verdict: 'NEEDS_REVISION' },
}

async function post(path: string, body: unknown) {
  const { app } = await import('../../mcp/index.js')
  const res = await app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<Record<string, unknown>>
}

async function postStellar(path: string, body: unknown) {
  const { app } = await import('../../mcp/stellar.js')
  const res = await app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<Record<string, unknown>>
}

function signalScores(body: Record<string, unknown>) {
  const results = body.results as Array<{
    content: string
    tdfValue: number
    phaseCoherence: number
    correlations: Array<{ content: string; isotopicRatio: number; strength: number }>
  }>
  return Object.fromEntries(results.map((result) => [result.content, {
    tdfValue: result.tdfValue,
    phaseCoherence: result.phaseCoherence,
    correlations: result.correlations
      .map((correlation) => ({
        content: correlation.content,
        isotopicRatio: correlation.isotopicRatio,
        strength: correlation.strength,
      }))
      .sort((a, b) => a.content.localeCompare(b.content)),
  }]))
}

beforeAll(async () => {
  const { solarDataFetcher } = await import('../../mcp/lib/solarDataFetcher.js')
  vi.spyOn(solarDataFetcher, 'fetchCurrentSolarData').mockResolvedValue(SOLAR)
})

describe('isotopic tools read the text', () => {
  it('repeats the same score for the same text and timestamp', async () => {
    const first = await post('/emit_isotopic_signal', { content: TRINITY, timestamp: FIXED_MS })
    const second = await post('/emit_isotopic_signal', { content: TRINITY, timestamp: FIXED_MS })
    expect(first.phaseCoherence).toBe(second.phaseCoherence)
    expect(first.tdfValue).toBe(second.tdfValue)
    expect(first.cascadeIndex).toBe(second.cascadeIndex)
    expect(first.timestampMs).toBe(FIXED_MS)

    const crossA = await post('/cross_correlate', { contentA: TRINITY, contentB: NOISE, timestamp: FIXED_MS })
    const crossB = await post('/cross_correlate', { contentA: TRINITY, contentB: NOISE, timestamp: FIXED_MS })
    expect(crossA).toEqual(crossB)

    const stored = await post('/get_phase_coherence', { signalId: first.signalId })
    expect(stored.stored).toBe(true)
    expect(stored.timestampMs).toBe(FIXED_MS)
    expect(stored.phaseCoherence).toBe(first.phaseCoherence)
  })

  it('changes isotope, coherence, and triangulation when the text changes', async () => {
    const trinity = await post('/emit_isotopic_signal', { content: TRINITY, timestamp: FIXED_MS })
    const noise = await post('/emit_isotopic_signal', { content: NOISE, timestamp: FIXED_MS })
    const sameLengthA = await post('/emit_isotopic_signal', { content: 'abc', timestamp: FIXED_MS })
    const sameLengthB = await post('/emit_isotopic_signal', { content: 'xyz', timestamp: FIXED_MS })

    expect(trinity.tdfValue).not.toBe(noise.tdfValue)
    expect(trinity.phaseCoherence).not.toBe(noise.phaseCoherence)
    expect(sameLengthA.tdfValue).not.toBe(sameLengthB.tdfValue)
    expect(sameLengthA.phaseCoherence).not.toBe(sameLengthB.phaseCoherence)
    expect(trinity.isotopicRatio).toBeUndefined()

    const crossTrinity = await post('/cross_correlate', { contentA: TRINITY, contentB: 'reference-signal', timestamp: FIXED_MS })
    const crossNoise = await post('/cross_correlate', { contentA: NOISE, contentB: 'reference-signal', timestamp: FIXED_MS })
    expect(crossTrinity.strength).not.toBe(crossNoise.strength)
    expect(crossTrinity.isotopicRatio).not.toBe(crossNoise.isotopicRatio)
    expect(crossTrinity.vortexVolume).not.toBe(crossNoise.vortexVolume)

    const stellarTrinity = await postStellar('/stellar_cross_correlate', { contentA: TRINITY, contentB: NOISE, timestamp: FIXED_MS })
    const stellarNoise = await postStellar('/stellar_cross_correlate', { contentA: NOISE, contentB: NOISE, timestamp: FIXED_MS })
    expect(stellarTrinity.strength).not.toBe(stellarNoise.strength)
    expect(stellarTrinity.isotopicRatio).not.toBe(stellarNoise.isotopicRatio)

    const tri = await post('/triangulate_signals', {
      timestamp: FIXED_MS,
      signals: [{ content: TRINITY }, { content: NOISE }, { content: DELETE_DB }],
    })
    const byContent = signalScores(tri)
    expect(byContent[TRINITY].phaseCoherence).not.toBe(byContent[NOISE].phaseCoherence)
    expect(byContent[TRINITY].tdfValue).not.toBe(byContent[DELETE_DB].tdfValue)

    const fuseTrinity = await post('/fuse_symbiotic', {
      partners: [{ content: TRINITY }, { content: NOISE }],
    })
    const fuseNoise = await post('/fuse_symbiotic', {
      partners: [{ content: DELETE_DB }, { content: 'abc' }],
    })
    expect(fuseTrinity.fusedIsotopeId).not.toBe(fuseNoise.fusedIsotopeId)
    expect(fuseTrinity.fusedIsotopeId).not.toBe('fused-core')
    expect(fuseNoise.fusedIsotopeId).not.toBe('fused-core')
    expect(String(fuseTrinity.fusedIsotopeId)).toMatch(/^blurrn-core-/)

    const stellarFuse = await postStellar('/stellar_fuse_symbiotic', {
      partners: [{ content: TRINITY }, { content: NOISE }],
    })
    expect(stellarFuse.fusedIsotopeId).toBe(fuseTrinity.fusedIsotopeId)
    expect(stellarFuse.fusedIsotopeId).not.toBe('stellar-fused-core')
    expect(stellarFuse.resonance).not.toBe(0.97)
  })

  it('keeps each signal score when the list is reordered', async () => {
    const signals = [{ content: TRINITY }, { content: NOISE }, { content: DELETE_DB }, { content: 'abc' }]
    const forward = await post('/triangulate_signals', { signals, timestamp: FIXED_MS })
    const reversed = await post('/triangulate_signals', { signals: [...signals].reverse(), timestamp: FIXED_MS })
    expect(signalScores(forward)).toEqual(signalScores(reversed))
    expect(forward.coreResonance).toBe(reversed.coreResonance)
    expect(forward.vortexVolume).toBe(reversed.vortexVolume)

    const stellarForward = await postStellar('/stellar_triangulate', { signals, timestamp: FIXED_MS })
    const stellarReversed = await postStellar('/stellar_triangulate', { signals: [...signals].reverse(), timestamp: FIXED_MS })
    expect(signalScores(stellarForward)).toEqual(signalScores(stellarReversed))
    expect(stellarForward.coreResonance).toBe(stellarReversed.coreResonance)
  })
})

describe('7D verdict clock', () => {
  it('reproduces the pinned-timestamp verdict and stores that timestamp', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_MS + 86_400_000)
    const { solarDataFetcher } = await import('../../mcp/lib/solarDataFetcher.js')
    vi.spyOn(solarDataFetcher, 'fetchCurrentSolarData').mockResolvedValue(SOLAR)
    const { solarGovernance } = await import('../../mcp/lib/solarGovernanceIntegration.js')

    for (const [text, expected] of Object.entries(BEFORE_7D)) {
      const first = await solarGovernance.getProposalSolarIsotopicResonance(text, undefined, undefined, FIXED_MS)
      const second = await solarGovernance.getProposalSolarIsotopicResonance(text, undefined, undefined, FIXED_MS)
      expect(first.fullBox7DComposite).toBe(second.fullBox7DComposite)
      expect(first.fullBox7DVerdict).toBe(second.fullBox7DVerdict)
      expect(first.fullBox7DComposite).toBe(expected.score)
      expect(first.fullBox7DVerdict).toBe(expected.verdict)
      expect(first.evaluatedAtMs).toBe(FIXED_MS)
      expect(first.evaluatedAt).toBe(new Date(FIXED_MS).toISOString())
    }
  })
})
