import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { app } from '../../mcp/stellar'

// Mock backend responses so tests don't need real TensorFlow.js running
const originalFetch = globalThis.fetch
beforeAll(() => {
  globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
    const u = url.toString()
    if (u.includes('/process-spectrum')) {
      return new Response(JSON.stringify({ metamorphosisIndex: { value: 0.88, resonance: 0.88, isotopicRatio: 0.97, confidence: 0.95, synapticSequence: 'temporal phase coherence achieved' }, confidenceScore: 0.95, synapticSequence: 'temporal phase coherence achieved' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (u.includes('/calculate-metamorphosis-index')) {
      return new Response(JSON.stringify({ value: 0.88, resonance: 0.88, isotopicRatio: 0.97, confidence: 0.95, synapticSequence: 'temporal phase coherence achieved', confidenceScore: 0.95 }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (u.includes('/isotopic-embedding')) {
      return new Response(JSON.stringify({ isotopicRatio: 0.97, resonance: 0.88, confidenceScore: 0.95, synapticSequence: 'temporal phase coherence achieved' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (u.includes('/process-stellar-spectrum')) {
      return new Response(JSON.stringify({ success: true, star: { name: 'Vega', spectralType: 'A0V', temperature: 9602 }, metamorphosisIndex: 0.91, confidenceScore: 0.96, synapticSequence: 'dimensional flux stabilized', engine: 'real-tensorflow + real-stellar-library' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (u.includes('/process-current-sun')) {
      return new Response(JSON.stringify({ success: true, solarData: { timestamp: '2026-05-11T12:00:00Z', xrayFlux: 1e-7, xrayFluxString: '1.0e-7', activityLevel: 'quiet', source: 'NOAA-GOES' }, metamorphosisIndex: 0.67, confidenceScore: 0.82, synapticSequence: 'temporal phase coherence achieved', engine: 'real-tensorflow + real-time-solar-data' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (u.includes('/list-stars')) {
      return new Response(JSON.stringify({ success: true, count: 17, stars: [{ name: 'Vega', spectralType: 'A0V', temperature: 9602 }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  }
})

afterAll(() => {
  globalThis.fetch = originalFetch
})

async function post(path: string, body: unknown) {
  const res = await app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

const sampleWavelengths = [400, 450, 500, 550, 600]
const sampleFluxes = [1.0, 1.2, 1.5, 1.3, 1.1]

// ===== REST Endpoint Tests =====

describe('Stellar - REST endpoints', () => {
  it('GET / returns tool index', async () => {
    const res = await app.request('/', { method: 'GET' })
    const json: any = await res.json()
    expect(json.name).toBe('blurrn-stellar-mcp')
    expect(json.tools).toBe(9)
    expect(json.engine).toBe('real-tensorflow')
  })

  it('GET /health returns status', async () => {
    const res = await app.request('/health', { method: 'GET' })
    const json: any = await res.json()
    expect(json.status).toBe('ok')
    expect(json.neuralFusion).toBe('real')
  })

  it('stellar_process_spectrum with valid input', async () => {
    const json: any = await post('/stellar_process_spectrum', {
      wavelengths: sampleWavelengths,
      fluxes: sampleFluxes,
      objectType: 'star',
    })
    expect(json.success).toBe(true)
    expect(json.metamorphosisIndex.resonance).toBeGreaterThanOrEqual(0)
    expect(json.metamorphosisIndex.resonance).toBeLessThanOrEqual(1)
    expect(json.metamorphosisIndex.isotopicRatio).toBeGreaterThan(0.85)
    expect(json.metamorphosisIndex.confidence).toBeGreaterThan(0.1)
    expect(json.metamorphosisIndex.synapticSequence).toBeTruthy()
    expect(json.neuralSpectraLength).toBe(100)
    expect(json.engine).toBe('real-tensorflow')
  })

  it('stellar_calculate_metamorphosis_index returns core fields', async () => {
    const json: any = await post('/stellar_calculate_metamorphosis_index', {
      wavelengths: sampleWavelengths,
      fluxes: sampleFluxes,
    })
    expect(json.success).toBe(true)
    expect(json.resonance).toBeGreaterThanOrEqual(0)
    expect(json.isotopicRatio).toBeGreaterThan(0.85)
    expect(json.confidence).toBeGreaterThan(0)
    expect(json.synapticSequence).toBeTruthy()
  })

  it('stellar_generate_sed with defaults', async () => {
    const json: any = await post('/stellar_generate_sed', {})
    expect(json.success).toBe(true)
    expect(json.sed.wavelength).toHaveLength(50)
    expect(json.sed.flux).toHaveLength(50)
    expect(json.parameters.temperature).toBe(5800)
  })

  it('stellar_generate_sed with custom params', async () => {
    const json: any = await post('/stellar_generate_sed', { temperature: 10000, luminosity: 2.0, metallicity: 0.5 })
    expect(json.success).toBe(true)
    expect(json.parameters.temperature).toBe(10000)
  })

  it('stellar_generate_sed rejects out-of-range temperature', async () => {
    const json: any = await post('/stellar_generate_sed', { temperature: 100000 })
    expect(json.success).toBe(false)
  })

  it('stellar_isotopic_embedding returns embedding', async () => {
    const json: any = await post('/stellar_isotopic_embedding', {
      wavelengths: sampleWavelengths,
      fluxes: sampleFluxes,
    })
    expect(json.success).toBe(true)
    expect(json.isotopicRatio).toBeGreaterThan(0.85)
    expect(json.phaseCoherence).toBeGreaterThanOrEqual(0)
    expect(json.embedding).toHaveLength(8)
    expect(json.provenance).toContain('stellar')
  })

  it('stellar_cross_correlate returns high resonance', async () => {
    const json: any = await post('/stellar_cross_correlate', { contentA: 'alpha', contentB: 'beta' })
    expect(json.success).toBe(true)
    expect(json.strength).toBeGreaterThan(0.9)
  })

  it('stellar_cross_correlate works without contentB', async () => {
    const json: any = await post('/stellar_cross_correlate', { contentA: 'alpha' })
    expect(json.success).toBe(true)
    expect(json.strength).toBeGreaterThan(0.9)
  })

  it('stellar_triangulate with valid signals', async () => {
    const json: any = await post('/stellar_triangulate', {
      signals: [{ content: 'a' }, { content: 'b' }, { content: 'c' }],
    })
    expect(json.success).toBe(true)
    expect(json.signalCount).toBe(3)
  })

  it('stellar_fuse_symbiotic with valid partners', async () => {
    const json: any = await post('/stellar_fuse_symbiotic', {
      partners: [{ content: 'a' }, { content: 'b' }],
    })
    expect(json.success).toBe(true)
    expect(json.fused).toBe(true)
    expect(json.partnerCount).toBe(2)
  })

  it('process_real_star with valid star name', async () => {
    const json: any = await post('/process_real_star', { starName: 'Vega' })
    expect(json.success).toBe(true)
    expect(json.star.name).toBe('Vega')
    expect(json.engine).toContain('real')
  })

  it('process_current_sun returns live solar data', async () => {
    const json: any = await post('/process_current_sun', {})
    expect(json.success).toBe(true)
    expect(json.solarData).toBeDefined()
    expect(json.solarData.activityLevel).toBeDefined()
    expect(json.metamorphosisIndex).toBeGreaterThan(0)
    expect(json.engine).toContain('real-time-solar-data')
  })

  it('list_real_stars returns stars', async () => {
    const res = await app.request('/list_real_stars', { method: 'GET' })
    const json: any = await res.json()
    expect(json.success).toBe(true)
    expect(json.count).toBeGreaterThan(0)
  })
})

// ===== MCP Protocol Tests =====

describe('Stellar - SSE /messages endpoint', () => {
  it('returns 400 without sessionId', async () => {
    const res = await app.request('/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('Stellar - JSON-RPC via injected session', () => {
  it('handles initialize request', async () => {
    const { subscribe } = await import('../../mcp/pubsub')
    const messages: string[] = []
    const unsub = await subscribe('stellar:test-session', (msg) => messages.push(msg))

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
    expect(data.result.serverInfo.name).toBe('blurrn-stellar-mcp')

    await unsub()
  })

  it('handles tools/list', async () => {
    const { subscribe } = await import('../../mcp/pubsub')
    const messages: string[] = []
    const unsub = await subscribe('stellar:test-session-list', (msg) => messages.push(msg))

    const res = await app.request('/messages?sessionId=test-session-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    })
    expect(res.status).toBe(200)

    expect(messages.length).toBe(1)
    const data = JSON.parse(messages[0])
    expect(data.result.tools).toHaveLength(9)
    const names = data.result.tools.map((t: any) => t.name)
    expect(names).toContain('stellar_process_spectrum')
    expect(names).toContain('stellar_calculate_metamorphosis_index')
    expect(names).toContain('stellar_generate_sed')
    expect(names).toContain('process_real_star')
    expect(names).toContain('process_current_sun')

    await unsub()
  })

  it('handles tools/call - stellar_process_spectrum', async () => {
    const { subscribe } = await import('../../mcp/pubsub')
    const messages: string[] = []
    const unsub = await subscribe('stellar:test-session-call', (msg) => messages.push(msg))

    const res = await app.request('/messages?sessionId=test-session-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'stellar_process_spectrum', arguments: { wavelengths: sampleWavelengths, fluxes: sampleFluxes } } }),
    })
    expect(res.status).toBe(200)

    expect(messages.length).toBe(1)
    const data = JSON.parse(messages[0])
    const text = JSON.parse(data.result.content[0].text)
    expect(text.metamorphosisIndex.resonance).toBeGreaterThanOrEqual(0)
    expect(text.metamorphosisIndex.synapticSequence).toBeTruthy()

    await unsub()
  })

  it('handles tools/call - stellar_generate_sed', async () => {
    const { subscribe } = await import('../../mcp/pubsub')
    const messages: string[] = []
    const unsub = await subscribe('stellar:test-session-sed', (msg) => messages.push(msg))

    const res = await app.request('/messages?sessionId=test-session-sed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'stellar_generate_sed', arguments: { temperature: 5800 } } }),
    })
    expect(res.status).toBe(200)

    expect(messages.length).toBe(1)
    const data = JSON.parse(messages[0])
    const text = JSON.parse(data.result.content[0].text)
    expect(text.sed.wavelength).toHaveLength(50)
    expect(text.parameters.temperature).toBe(5800)

    await unsub()
  })

  it('handles tools/call - process_real_star', async () => {
    const { subscribe } = await import('../../mcp/pubsub')
    const messages: string[] = []
    const unsub = await subscribe('stellar:test-session-star', (msg) => messages.push(msg))

    const res = await app.request('/messages?sessionId=test-session-star', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'process_real_star', arguments: { starName: 'Vega' } } }),
    })
    expect(res.status).toBe(200)

    expect(messages.length).toBe(1)
    const data = JSON.parse(messages[0])
    const text = JSON.parse(data.result.content[0].text)
    expect(text.star.name).toBe('Vega')
    expect(text.engine).toContain('real')

    await unsub()
  })

  it('returns error for unknown tool', async () => {
    const { subscribe } = await import('../../mcp/pubsub')
    const messages: string[] = []
    const unsub = await subscribe('stellar:test-session-unknown', (msg) => messages.push(msg))

    const res = await app.request('/messages?sessionId=test-session-unknown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'nonexistent', arguments: {} } }),
    })
    expect(res.status).toBe(200)

    expect(messages.length).toBe(1)
    const data = JSON.parse(messages[0])
    expect(data.error.message).toContain('Unknown tool')

    await unsub()
  })

  it('handles tools/call - process_current_sun', async () => {
    const { subscribe } = await import('../../mcp/pubsub')
    const messages: string[] = []
    const unsub = await subscribe('stellar:test-session-sun', (msg) => messages.push(msg))

    const res = await app.request('/messages?sessionId=test-session-sun', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'process_current_sun', arguments: {} } }),
    })
    expect(res.status).toBe(200)

    expect(messages.length).toBe(1)
    const data = JSON.parse(messages[0])
    const text = JSON.parse(data.result.content[0].text)
    expect(text.solarData).toBeDefined()
    expect(text.solarData.activityLevel).toBeDefined()
    expect(text.metamorphosisIndex).toBeGreaterThan(0)
    expect(text.engine).toContain('real-time-solar-data')

    await unsub()
  })

  it('rejects missing sessionId with 400', async () => {
    const res = await app.request('/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'nonexistent', arguments: {} } }),
    })
    expect(res.status).toBe(400)
  })
})
