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
})

describe('MCP - cross_correlate', () => {
  it('correlates two signals', async () => {
    const json: any = await post('/cross_correlate', { contentA: 'hello', contentB: 'world' })
    expect(json.success).toBe(true)
    expect(json.strength).toBeGreaterThan(0)
    expect(json.vortexVolume).toBeGreaterThan(0)
  })

  it('works without contentB', async () => {
    const json: any = await post('/cross_correlate', { contentA: 'hello' })
    expect(json.success).toBe(true)
    expect(json.strength).toBeGreaterThan(0)
  })
})

describe('MCP - compute_tdf', () => {
  it('computes TDF with defaults', async () => {
    const json: any = await post('/compute_tdf', {})
    expect(json.success).toBe(true)
    expect(json.tdfValue).toBeGreaterThan(0)
    expect(json.S_L).toBeGreaterThan(0)
    expect(json.tau).toBe(0.865)
  })

  it('accepts custom parameters', async () => {
    const json: any = await post('/compute_tdf', { phi: 1.666, delta_t: 1e-6, e_t: 0.5 })
    expect(json.success).toBe(true)
    expect(json.tdfValue).toBeGreaterThan(0)
  })
})

describe('MCP - list_isotopes', () => {
  it('returns isotopes', async () => {
    const json: any = await post('/list_isotopes', {})
    expect(json.success).toBe(true)
    expect(json.isotopes.length).toBeGreaterThan(0)
    expect(json.isotopes[0]).toHaveProperty('name')
    expect(json.isotopes[0]).toHaveProperty('factor')
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
  it('returns coherence for a signal ID', async () => {
    const json: any = await post('/get_phase_coherence', { signalId: 'test-123' })
    expect(json.success).toBe(true)
    expect(json.phaseCoherence).toBeGreaterThan(0)
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
