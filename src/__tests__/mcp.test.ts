import { describe, it, expect } from 'vitest'
import { app } from '../../mcp/index'

async function post(path: string, body: unknown) {
  const res = await app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

describe('MCP - emit_isotopic_signal', () => {
  it('emits a signal with valid content', async () => {
    const json: any = await post('/emit_isotopic_signal', { content: 'test signal' })
    expect(json.success).toBe(true)
    expect(json.signalId).toMatch(/^blurrn-core-/)
    expect(json.isotopicRatio).toBeGreaterThan(0)
    expect(json.tdfValue).toBeGreaterThan(0)
  })

  it('rejects empty content', async () => {
    const json: any = await post('/emit_isotopic_signal', { content: '' })
    expect(json.success).toBe(false)
    expect(json.error).toBeTruthy()
  })

  it('computes isotopic ratio against a reference', async () => {
    const a: any = await post('/emit_isotopic_signal', { content: 'alpha' })
    const b: any = await post('/emit_isotopic_signal', { content: 'beta', referenceId: a.signalId })
    expect(b.success).toBe(true)
    expect(b.isotopicRatio).toBeGreaterThan(0)
  })
})

describe('MCP - cross_correlate', () => {
  it('correlates two signals', async () => {
    const json: any = await post('/cross_correlate', { contentA: 'hello', contentB: 'world' })
    expect(json.success).toBe(true)
    expect(json.strength).toBeGreaterThan(0)
    expect(json.vortexVolume).toBeGreaterThan(0)
    expect(json.isotopicRatio).toBeGreaterThan(0)
  })

  it('works without contentB', async () => {
    const json: any = await post('/cross_correlate', { contentA: 'hello' })
    expect(json.success).toBe(true)
    expect(json.strength).toBeGreaterThan(0)
  })
})

describe('MCP - compute_tdf', () => {
  it('computes TDF with full formula chain (defaults)', async () => {
    const json: any = await post('/compute_tdf', {})
    expect(json.success).toBe(true)
    expect(json.tdfValue).toBeGreaterThan(0)
    expect(json.S_L).toBeGreaterThan(0)
    expect(json.tau).toBe(0.865)
    expect(json.tPTT).toBeGreaterThan(0)
    expect(json.BlackHole_Seq).toBeGreaterThan(0)
    expect(json.parameters.T_c).toBe(137)
  })

  it('accepts custom parameters', async () => {
    const json: any = await post('/compute_tdf', { T_c: 100, P_s: 2.0, E_t: 0.3, delta_t: 1e-6, voids: 5, bhs_n: 2 })
    expect(json.success).toBe(true)
    expect(json.tdfValue).toBeGreaterThan(0)
    expect(json.tPTT).toBeGreaterThan(0)
    expect(json.BlackHole_Seq).toBeGreaterThan(0)
  })
})

describe('MCP - list_isotopes', () => {
  it('returns both standard and Blurrn isotopes', async () => {
    const json: any = await post('/list_isotopes', {})
    expect(json.success).toBe(true)
    expect(json.isotopes.length).toBeGreaterThanOrEqual(5)
    expect(json.isotopes.some((i: any) => i.type === 'standard')).toBe(true)
    expect(json.isotopes.some((i: any) => i.type === 'blurrn')).toBe(true)
    expect(json.isotopes.some((i: any) => i.name === 'Trinitarium-166')).toBe(true)
  })
})

describe('MCP - optimize_cascade', () => {
  it('optimizes cascade with given iterations', async () => {
    const json: any = await post('/optimize_cascade', { n: 10, deltaPhase: 0.1 })
    expect(json.success).toBe(true)
    expect(json.iterations).toBe(10)
    expect(json.finalEfficiency).toBeGreaterThan(0)
    expect(json.peakEfficiency).toBeGreaterThan(0)
    expect(json.results).toHaveLength(10)
  })

  it('rejects n > 5000', async () => {
    const json: any = await post('/optimize_cascade', { n: 10000 })
    expect(json.success).toBe(false)
    expect(json.error).toBeTruthy()
  })
})

describe('MCP - get_phase_coherence', () => {
  it('returns coherence for a stored signal ID', async () => {
    const emit: any = await post('/emit_isotopic_signal', { content: 'store-me' })
    const json: any = await post('/get_phase_coherence', { signalId: emit.signalId })
    expect(json.success).toBe(true)
    expect(json.phaseCoherence).toBeGreaterThan(0)
    expect(json.stored).toBe(true)
  })

  it('falls back for unknown IDs', async () => {
    const json: any = await post('/get_phase_coherence', { signalId: 'unknown-id' })
    expect(json.success).toBe(true)
    expect(json.phaseCoherence).toBeGreaterThan(0)
    expect(json.stored).toBe(false)
  })
})

describe('MCP - triangulate_signals', () => {
  it('triangulates multiple signals', async () => {
    const json: any = await post('/triangulate_signals', {
      signals: [{ content: 'a' }, { content: 'b' }, { content: 'c' }],
    })
    expect(json.success).toBe(true)
    expect(json.signalCount).toBe(3)
    expect(json.results).toHaveLength(3)
  })
})

describe('MCP - fuse_symbiotic', () => {
  it('fuses multiple signals', async () => {
    const json: any = await post('/fuse_symbiotic', {
      partners: [{ content: 'a' }, { content: 'b' }],
    })
    expect(json.success).toBe(true)
    expect(json.fused).toBe(true)
    expect(json.partnerCount).toBe(2)
    expect(json.fusedEmbedding).toBeDefined()
  })
})

// ===== New Tool Tests =====

describe('MCP - compute_tptt', () => {
  it('computes tPTT with defaults', async () => {
    const json: any = await post('/compute_tptt', {})
    expect(json.success).toBe(true)
    expect(json.tPTT).toBeGreaterThan(0)
  })

  it('accepts custom parameters', async () => {
    const json: any = await post('/compute_tptt', { T_c: 100, P_s: 2.0, E_t: 0.3, delta_t: 1e-6 })
    expect(json.success).toBe(true)
    expect(json.tPTT).toBeGreaterThan(0)
  })
})

describe('MCP - black_hole_sequence', () => {
  it('computes BlackHole_Seq with defaults', async () => {
    const json: any = await post('/black_hole_sequence', {})
    expect(json.success).toBe(true)
    expect(json.BlackHole_Seq).toBeGreaterThan(0)
  })
})

describe('MCP - kuramoto_sync', () => {
  it('computes Kuramoto frequency update', async () => {
    const json: any = await post('/kuramoto_sync', {
      phases: [0, Math.PI / 2, Math.PI],
      frequencies: [1, 1.5, 2],
    })
    expect(json.success).toBe(true)
    expect(json.frequencyUpdate).toBeDefined()
    expect(json.phaseCoherence).toBeGreaterThanOrEqual(0)
  })
})

describe('MCP - wave_function', () => {
  it('computes wave amplitude with defaults', async () => {
    const json: any = await post('/wave_function', {})
    expect(json.success).toBe(true)
    expect(json.amplitude).toBeGreaterThan(0)
  })
})

describe('MCP - harmonic_oscillator', () => {
  it('computes P_o', async () => {
    const json: any = await post('/harmonic_oscillator', { t: 0.001 })
    expect(json.success).toBe(true)
    expect(json.P_o).toBeGreaterThan(-2)
    expect(json.P_o).toBeLessThan(2)
  })
})

describe('MCP - validate_tlm', () => {
  it('validates PHI = 1.666', async () => {
    const json: any = await post('/validate_tlm', { phi: 1.666 })
    expect(json.success).toBe(true)
    expect(json.valid).toBe(true)
  })

  it('rejects out-of-range phi', async () => {
    const json: any = await post('/validate_tlm', { phi: 2.0 })
    expect(json.success).toBe(true)
    expect(json.valid).toBe(false)
  })
})
