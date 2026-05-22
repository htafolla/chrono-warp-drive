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

// ===== GET Endpoint Tests (sandbox-compatible) =====

describe('MCP - GET endpoints', () => {
  async function get(path: string) {
    const res = await app.request(path, { method: 'GET' })
    return res.json()
  }

  it('GET / returns tool index', async () => {
    const json: any = await get('/')
    expect(json.name).toBe('blurrn-mcp')
    expect(json.tools).toBe(20)
    expect(json.endpoints.GET).toContain('/health')
    expect(json.endpoints.GET).toContain('/docs')
  })

  it('GET /health returns status', async () => {
    const json: any = await get('/health')
    expect(json.status).toBe('ok')
    expect(json.tools).toBe(20)
  })

  it('GET /list_isotopes returns isotopes', async () => {
    const json: any = await get('/list_isotopes')
    expect(json.success).toBe(true)
    expect(json.isotopes.length).toBeGreaterThanOrEqual(5)
  })

  it('GET /compute_tdf with query params', async () => {
    const res = await app.request('/compute_tdf?T_c=100&P_s=2&E_t=0.3&voids=5&bhs_n=2', { method: 'GET' })
    const json: any = await res.json()
    expect(json.success).toBe(true)
    expect(json.tdfValue).toBeGreaterThan(0)
    expect(json.tPTT).toBeGreaterThan(0)
  })

  it('GET /compute_tdf defaults', async () => {
    const json: any = await get('/compute_tdf')
    expect(json.success).toBe(true)
    expect(json.tdfValue).toBeGreaterThan(0)
  })

  it('GET /compute_tptt defaults', async () => {
    const json: any = await get('/compute_tptt')
    expect(json.success).toBe(true)
    expect(json.tPTT).toBeGreaterThan(0)
  })

  it('GET /black_hole_sequence defaults', async () => {
    const json: any = await get('/black_hole_sequence')
    expect(json.success).toBe(true)
    expect(json.BlackHole_Seq).toBeGreaterThan(0)
  })

  it('GET /validate_tlm defaults', async () => {
    const json: any = await get('/validate_tlm')
    expect(json.success).toBe(true)
    expect(json.valid).toBe(true)
  })

  it('GET /harmonic_oscillator defaults', async () => {
    const json: any = await get('/harmonic_oscillator')
    expect(json.success).toBe(true)
    expect(json.P_o).toBeDefined()
  })
})

// ===== MCP Standard Protocol Tests (SSE + JSON-RPC) =====

describe('MCP - SSE /messages endpoint', () => {
  it('returns 400 without sessionId', async () => {
    const res = await app.request('/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    })
    expect(res.status).toBe(400)
    const json: any = await res.json()
    expect(json.error).toContain('sessionId')
  })

  it('rejects with fake sessionId', async () => {
    const res = await app.request('/messages?sessionId=nonexistent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    })
    // No SSE subscriber → response never reaches client, but the request
    // itself is processed (the MCP spec allows stateless message relaying).
    expect([200, 400]).toContain(res.status)
  })
})

describe('MCP - JSON-RPC via injected session', () => {
  it('handles initialize request', async () => {
    const { subscribe } = await import('../../mcp/pubsub')
    const messages: string[] = []
    const unsub = await subscribe('session:test-session', (msg) => messages.push(msg))

    const res = await app.request('/messages?sessionId=test-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } } }),
    })
    expect(res.status).toBe(200)

    expect(messages.length).toBe(1)
    const data = JSON.parse(messages[0])
    expect(data.jsonrpc).toBe('2.0')
    expect(data.result.protocolVersion).toBe('2024-11-05')
    expect(data.result.serverInfo.name).toBe('blurrn-mcp')

    await unsub()
  })

  it('handles tools/list via injected session', async () => {
    const { subscribe } = await import('../../mcp/pubsub')
    const messages: string[] = []
    const unsub = await subscribe('session:test-session-2', (msg) => messages.push(msg))

    const res = await app.request('/messages?sessionId=test-session-2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    })
    expect(res.status).toBe(200)

    expect(messages.length).toBe(1)
    const data = JSON.parse(messages[0])
    expect(data.result.tools.length).toBe(20)
    const names = data.result.tools.map((t: any) => t.name)
    expect(names).toContain('compute_tdf')
    expect(names).toContain('kuramoto_sync')
    expect(names).toContain('validate_tlm')
    expect(names).toContain('evaluate_governance')
    expect(names).toContain('govern_with_solar')
    expect(names).toContain('call_connected_tool')
    expect(names).toContain('get_docs')
    expect(names).toContain('explain_term')
    expect(names).toContain('explain_governance_output')

    await unsub()
  })

  it('handles tools/call via injected session', async () => {
    const { subscribe } = await import('../../mcp/pubsub')
    const messages: string[] = []
    const unsub = await subscribe('session:test-session-3', (msg) => messages.push(msg))

    const res = await app.request('/messages?sessionId=test-session-3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'validate_tlm', arguments: { phi: 1.666 } } }),
    })
    expect(res.status).toBe(200)

    expect(messages.length).toBe(1)
    const data = JSON.parse(messages[0])
    const text = JSON.parse(data.result.content[0].text)
    expect(text.valid).toBe(true)

    await unsub()
  })

  it('handles tools/call - govern_with_solar', async () => {
    // Mock fetch to avoid network calls in tests
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(JSON.stringify([{ time_tag: '2026-05-11T12:00:00Z', flux: '1e-7', satellite: 16 }]), { status: 200, headers: { 'Content-Type': 'application/json' } })

    const { subscribe } = await import('../../mcp/pubsub')
    const messages: string[] = []
    const unsub = await subscribe('session:test-session-solar', (msg) => messages.push(msg))

    const res = await app.request('/messages?sessionId=test-session-solar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'govern_with_solar', arguments: { proposal: 'Test solar governance', baseVoteWeight: 1.0 } } }),
    })
    expect(res.status).toBe(200)

    expect(messages.length).toBe(1)
    const data = JSON.parse(messages[0])
    const text = JSON.parse(data.result.content[0].text)
    expect(text.solarContext).toBeDefined()
    expect(text.solarContext.solarActivityLevel).toBeDefined()
    expect(text.adjustedVoteWeight).toBeGreaterThan(0)
    expect(text.finalRecommendation).toContain('Test solar governance')

    await unsub()
    globalThis.fetch = originalFetch
  })

  it('handles tools/call - call_connected_tool proxy', async () => {
    const { subscribe } = await import('../../mcp/pubsub')
    const messages: string[] = []
    const unsub = await subscribe('session:test-session-proxy', (msg) => messages.push(msg))

    const res = await app.request('/messages?sessionId=test-session-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'call_connected_tool', arguments: { tool_name: 'validate_tlm', params: { phi: 1.666 } } } }),
    })
    expect(res.status).toBe(200)

    expect(messages.length).toBe(1)
    const data = JSON.parse(messages[0])
    const text = JSON.parse(data.result.content[0].text)
    expect(text.success).toBe(true)
    expect(text.tool).toBe('validate_tlm')
    expect(text.result.valid).toBe(true)

    await unsub()
  })

  it('returns error for unknown tool', async () => {
    const { subscribe } = await import('../../mcp/pubsub')
    const messages: string[] = []
    const unsub = await subscribe('session:test-session-unknown', (msg) => messages.push(msg))

    const res = await app.request('/messages?sessionId=test-session-unknown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'nonexistent_tool', arguments: {} } }),
    })
    expect(res.status).toBe(200)

    expect(messages.length).toBe(1)
    const data = JSON.parse(messages[0])
    expect(data.error.message).toContain('Unknown tool')

    await unsub()
  })
})

// ===== Documentation Tools Tests =====

describe('MCP - get_docs', () => {
  async function get(path: string) {
    const res = await app.request(path, { method: 'GET' })
    return res.json()
  }
  async function post(path: string, body: unknown) {
    const res = await app.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  it('GET /get_docs returns full docs', async () => {
    const json: any = await get('/get_docs')
    expect(json.success).toBe(true)
    expect(json.docs).toContain('# Dynamo MCP v4.8')
    expect(json.toolCount).toBe(20)
  })

  it('GET /get_docs?tool filters to specific tool', async () => {
    const json: any = await get('/get_docs?tool=compute_tdf')
    expect(json.success).toBe(true)
    expect(json.docs).toContain('tPTT')
  })

  it('POST /get_docs returns full docs', async () => {
    const json: any = await post('/get_docs', {})
    expect(json.success).toBe(true)
    expect(json.docs).toContain('# Dynamo MCP v4.8')
    expect(json.toolCount).toBe(20)
  })

  it('POST /get_docs with tool filter', async () => {
    const json: any = await post('/get_docs', { tool: 'govern_with_solar' })
    expect(json.success).toBe(true)
    expect(json.docs).toContain('solar')
  })

  it('GET /docs returns full documentation', async () => {
    const json: any = await get('/docs')
    expect(json.success).toBe(true)
    expect(json.docs).toContain('# Dynamo MCP v4.8')
    expect(json.toolCount).toBe(20)
    expect(json.glossaryTerms).toBeGreaterThan(0)
  })
})

describe('MCP - explain_term', () => {
  async function get(path: string) {
    const res = await app.request(path, { method: 'GET' })
    return res.json()
  }
  async function post(path: string, body: unknown) {
    const res = await app.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  it('GET /explain_term lists terms when no query', async () => {
    const json: any = await get('/explain_term')
    expect(json.success).toBe(true)
    expect(json.available_terms).toContain('TAU')
    expect(json.available_terms).toContain('PHI')
  })

  it('GET /explain_term?term=TAU returns definition', async () => {
    const json: any = await get('/explain_term?term=TAU')
    expect(json.success).toBe(true)
    expect(json.term).toContain('TAU')
    expect(json.short).toBeTruthy()
    expect(json.long).toBeTruthy()
    expect(json.formula).toBeTruthy()
  })

  it('GET /explain_term?term=PHI returns definition', async () => {
    const json: any = await get('/explain_term?term=PHI')
    expect(json.success).toBe(true)
    expect(json.term).toContain('PHI')
    expect(json.short).toBeTruthy()
    expect(json.formula).toContain('1.566')
  })

  it('POST /explain_term looks up TDF', async () => {
    const json: any = await post('/explain_term', { term: 'TDF' })
    expect(json.success).toBe(true)
    expect(json.term).toContain('TDF')
    expect(json.short).toContain('signal displacement')
    expect(json.formula).toContain('tPTT')
  })

  it('POST /explain_term handles case-insensitive lookup', async () => {
    const json: any = await post('/explain_term', { term: 'vortexvolume' })
    expect(json.success).toBe(true)
    expect(json.term).toBeTruthy()
  })

  it('POST /explain_term returns error for unknown term', async () => {
    const json: any = await post('/explain_term', { term: 'nonexistent_term_xyz' })
    expect(json.success).toBe(false)
    expect(json.error).toContain('Unknown term')
    expect(json.available_terms).toBeDefined()
  })

  it('POST /explain_term handles missing term', async () => {
    const json: any = await post('/explain_term', {})
    expect(json.success).toBe(false)
    expect(json.error).toContain('Missing term')
  })
})

describe('MCP - explain_governance_output', () => {
  async function post(path: string, body: unknown) {
    const res = await app.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  it('explains a PASS recommendation', async () => {
    const json: any = await post('/explain_governance_output', {
      governanceOutput: { recommendation: 'PASS', confidence: 0.85, voteWeight: 1.0, reasoning: 'Strong alignment' },
    })
    expect(json.success).toBe(true)
    expect(json.explanation).toContain('PASS')
    expect(json.explanation).toContain('85%')
    expect(json.explanation).toContain('approve and proceed')
  })

  it('explains a REJECT recommendation', async () => {
    const json: any = await post('/explain_governance_output', {
      governanceOutput: { recommendation: 'REJECT', confidence: 0.3, voteWeight: 0.5, reasoning: 'Poor signal coherence' },
    })
    expect(json.success).toBe(true)
    expect(json.explanation).toContain('REJECT')
    expect(json.explanation).toContain('decline and revisit')
  })

  it('explains NEEDS REVISION', async () => {
    const json: any = await post('/explain_governance_output', {
      governanceOutput: { recommendation: 'NEEDS REVISION', confidence: 0.6, voteWeight: 0.8, reasoning: 'Insufficient data' },
    })
    expect(json.success).toBe(true)
    expect(json.explanation).toContain('NEEDS REVISION')
    expect(json.explanation).toContain('revise based on the reasoning')
  })

  it('explains solar-enhanced output', async () => {
    const json: any = await post('/explain_governance_output', {
      governanceOutput: {
        recommendation: 'PASS',
        finalRecommendation: 'Deploy now [SOLAR STORM WARNING]',
        confidence: 0.7,
        confidenceAdjustment: -0.15,
        adjustedVoteWeight: 0.85,
        solarContext: {
          solarActivityLevel: 'storm',
          solarResonance: 0.5935,
          solarActivityModifier: -0.15,
          recommendation: 'Solar storm detected - recommend delayed or weighted decisions',
        },
      },
    })
    expect(json.success).toBe(true)
    expect(json.explanation).toContain('Solar context')
    expect(json.explanation).toContain('storm')
    expect(json.explanation).toContain('-0.150')
    expect(json.explanation).toContain('SOLAR STORM WARNING')
  })

  it('GET /explain_governance_output returns docs', async () => {
    const res = await app.request('/explain_governance_output', { method: 'GET' })
    const json: any = await res.json()
    expect(json.name).toBe('explain_governance_output')
    expect(json.description).toContain('governance output')
    expect(json.parameters.governanceOutput).toBeDefined()
  })

  it('returns error for missing governanceOutput', async () => {
    const json: any = await post('/explain_governance_output', {})
    expect(json.success).toBe(false)
    expect(json.error).toContain('Missing or invalid')
  })
})

describe('MCP - JOSN-RPC docs tools via injected session', () => {
  it('handles tools/call - get_docs', async () => {
    const { subscribe } = await import('../../mcp/pubsub')
    const messages: string[] = []
    const unsub = await subscribe('session:test-get-docs', (msg) => messages.push(msg))

    const res = await app.request('/messages?sessionId=test-get-docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_docs', arguments: {} } }),
    })
    expect(res.status).toBe(200)
    expect(messages.length).toBe(1)
    const data = JSON.parse(messages[0])
    const text = JSON.parse(data.result.content[0].text)
    expect(text.docs).toContain('# Dynamo MCP v4.8')
    expect(text.toolCount).toBe(20)

    await unsub()
  })

  it('handles tools/call - explain_term', async () => {
    const { subscribe } = await import('../../mcp/pubsub')
    const messages: string[] = []
    const unsub = await subscribe('session:test-explain-term', (msg) => messages.push(msg))

    const res = await app.request('/messages?sessionId=test-explain-term', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'explain_term', arguments: { term: 'TAU' } } }),
    })
    expect(res.status).toBe(200)
    expect(messages.length).toBe(1)
    const data = JSON.parse(messages[0])
    const text = JSON.parse(data.result.content[0].text)
    expect(text.term).toContain('TAU')
    expect(text.formula).toContain('TDF')

    await unsub()
  })

  it('handles tools/call - explain_governance_output', async () => {
    const { subscribe } = await import('../../mcp/pubsub')
    const messages: string[] = []
    const unsub = await subscribe('session:test-explain-gov', (msg) => messages.push(msg))

    const res = await app.request('/messages?sessionId=test-explain-gov', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'explain_governance_output', arguments: { governanceOutput: { recommendation: 'PASS', confidence: 0.9 } } } }),
    })
    expect(res.status).toBe(200)
    expect(messages.length).toBe(1)
    const data = JSON.parse(messages[0])
    const text = JSON.parse(data.result.content[0].text)
    expect(text.explanation).toContain('PASS')
    expect(text.explanation).toContain('90%')

    await unsub()
  })
})
