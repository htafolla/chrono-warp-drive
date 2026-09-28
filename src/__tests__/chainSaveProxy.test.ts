import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { maxDuration } from '../../api/govern-chain'
import {
  CHAIN_SAVE_BODY_MAX,
  CHAIN_SAVE_RATE_LIMIT,
  GENERIC_CHAIN_SAVE_ERROR,
  handleChainSave,
  resetChainSaveGuardsForTests,
  type ChainSaveLimitStore,
} from '../server/chainSaveProxy'

const SAMPLE_KEY = 'sample-write-key-9f3c2a'
const ORIGIN = 'https://dynamo.rippel.ai'
const SECRET = 'turnstile-test-secret'
const VERCEL_IP = '203.0.113.10'

class MemoryLimitStore implements ChainSaveLimitStore {
  readonly values = new Map<string, string>()

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null
  }

  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value)
  }
}

function chainBody(overrides: Record<string, unknown> = {}) {
  return {
    proposal: 'Deploy the new agent to production',
    baseVoteWeight: 1,
    sharePublicly: false,
    persistToChain: true,
    spectralQuality: null,
    sunNeuralEmbedding: null,
    ...overrides,
  }
}

function headers(extra: Record<string, string> = {}) {
  return {
    origin: ORIGIN,
    'x-vercel-forwarded-for': VERCEL_IP,
    'x-forwarded-for': '198.51.100.20',
    ...extra,
  }
}

function readyEnv(extra: Record<string, string> = {}) {
  return {
    MCP_WRITE_API_KEY: SAMPLE_KEY,
    TURNSTILE_SECRET_KEY: SECRET,
    CHAIN_SAVE_ALLOWED_ORIGINS: ORIGIN,
    DYNAMO_MCP_URL: 'https://mcp-production-80e2.up.railway.app',
    ...extra,
  }
}

function countingFetch(body: unknown = { success: true, recommendation: 'PASS' }, status = 200) {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = []
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify(body), { status })
  }) as typeof fetch
  return { calls, fetchImpl }
}

afterEach(() => {
  resetChainSaveGuardsForTests()
})

describe('chain save proxy', () => {
  it('attaches the write key on the server and forwards only the chain-save payload', async () => {
    const { calls, fetchImpl } = countingFetch()
    const store = new MemoryLimitStore()
    const payload = chainBody({ spectralQuality: 0.5, sunNeuralEmbedding: Array.from({ length: 16 }, () => 0.1) })
    const result = await handleChainSave({
      method: 'POST',
      headers: headers(),
      body: { ...payload, turnstileToken: 'token-ok' },
      env: readyEnv(),
      now: 1_000,
      fetchImpl,
      limitStore: store,
      verifyImpl: async () => true,
    })
    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://mcp-production-80e2.up.railway.app/govern_with_solar')
    const sent = calls[0].init?.headers as Record<string, string>
    expect(sent.authorization).toBe(`Bearer ${SAMPLE_KEY}`)
    expect(JSON.parse(String(calls[0].init?.body))).toEqual(payload)
    expect(JSON.stringify(result.body)).not.toContain(SAMPLE_KEY)
    expect(JSON.stringify(result.body)).not.toContain('MCP_WRITE_API_KEY')
    expect(JSON.stringify(calls[0].init?.body)).not.toContain('turnstileToken')
  })

  it('returns a clear error when the write key is missing and does not call upstream', async () => {
    const { calls, fetchImpl } = countingFetch()
    const result = await handleChainSave({
      method: 'POST',
      headers: headers(),
      body: { ...chainBody(), turnstileToken: 'token-ok' },
      env: readyEnv({ MCP_WRITE_API_KEY: '' }),
      now: 2_000,
      fetchImpl,
      limitStore: new MemoryLimitStore(),
      verifyImpl: async () => true,
    })
    expect(result.status).toBe(503)
    expect(result.body.error).toBe('Write API key is not configured')
    expect(calls).toHaveLength(0)
  })

  it('rejects a bad origin before any upstream call', async () => {
    const { calls, fetchImpl } = countingFetch()
    const result = await handleChainSave({
      method: 'POST',
      headers: headers({ origin: 'https://evil.example' }),
      body: { ...chainBody(), turnstileToken: 'token-ok' },
      env: readyEnv(),
      now: 3_000,
      fetchImpl,
      limitStore: new MemoryLimitStore(),
      verifyImpl: async () => true,
    })
    expect(result.status).toBe(403)
    expect(result.body.error).toBe('Origin is not allowed')
    expect(calls).toHaveLength(0)

    const missing = await handleChainSave({
      method: 'POST',
      headers: { 'x-vercel-forwarded-for': '203.0.113.11' },
      body: { ...chainBody(), turnstileToken: 'token-ok' },
      env: readyEnv(),
      now: 3_000,
      fetchImpl,
      limitStore: new MemoryLimitStore(),
      verifyImpl: async () => true,
    })
    expect(missing.status).toBe(403)
    expect(calls).toHaveLength(0)
  })

  it('refuses a faked allowlisted origin when no turnstile token is present', async () => {
    const { calls, fetchImpl } = countingFetch()
    const result = await handleChainSave({
      method: 'POST',
      headers: headers({ origin: ORIGIN, referer: 'https://dynamo.rippel.ai/deploy' }),
      body: chainBody(),
      env: readyEnv(),
      now: 4_000,
      fetchImpl,
      limitStore: new MemoryLimitStore(),
      verifyImpl: async () => true,
    })
    expect(result.status).toBe(403)
    expect(result.body.error).toBe('Caller verification failed')
    expect(calls).toHaveLength(0)
  })

  it('returns 503 and forwards nothing when turnstile or the limiter store is not configured', async () => {
    const { calls, fetchImpl } = countingFetch()
    const noSecret = await handleChainSave({
      method: 'POST',
      headers: headers(),
      body: { ...chainBody(), turnstileToken: 'token-ok' },
      env: { MCP_WRITE_API_KEY: SAMPLE_KEY, CHAIN_SAVE_ALLOWED_ORIGINS: ORIGIN, CHAIN_SAVE_LIMIT_STORE_URL: 'redis://127.0.0.1:6379' },
      now: 5_000,
      fetchImpl,
      limitStore: new MemoryLimitStore(),
      verifyImpl: async () => true,
    })
    expect(noSecret.status).toBe(503)
    expect(noSecret.body.error).toBe('Caller verification is not configured')
    expect(calls).toHaveLength(0)

    const noStore = await handleChainSave({
      method: 'POST',
      headers: headers(),
      body: { ...chainBody(), turnstileToken: 'token-ok' },
      env: readyEnv(),
      now: 5_000,
      fetchImpl,
      verifyImpl: async () => true,
    })
    expect(noStore.status).toBe(503)
    expect(noStore.body.error).toBe('Chain save limiter is not configured')
    expect(calls).toHaveLength(0)
  })

  it('trips a small per-IP rate limit on the Vercel client IP', async () => {
    const { calls, fetchImpl } = countingFetch({ success: true })
    const store = new MemoryLimitStore()
    const env = readyEnv()
    for (let n = 0; n < CHAIN_SAVE_RATE_LIMIT; n += 1) {
      const ok = await handleChainSave({
        method: 'POST',
        headers: headers({ 'x-forwarded-for': `1.2.3.${n}` }),
        body: { ...chainBody(), turnstileToken: 'token-ok' },
        env,
        now: 10_000,
        fetchImpl,
        limitStore: store,
        verifyImpl: async () => true,
      })
      expect(ok.status).toBe(200)
    }
    const blocked = await handleChainSave({
      method: 'POST',
      headers: headers({ 'x-forwarded-for': '9.9.9.9' }),
      body: { ...chainBody(), turnstileToken: 'token-ok' },
      env,
      now: 10_000,
      fetchImpl,
      limitStore: store,
      verifyImpl: async () => true,
    })
    expect(blocked.status).toBe(429)
    expect(blocked.body.error).toBe('Too many chain saves')
    expect(calls).toHaveLength(CHAIN_SAVE_RATE_LIMIT)
  })

  it('shares one limiter store across two instances', async () => {
    const { calls, fetchImpl } = countingFetch({ success: true })
    const shared = new MemoryLimitStore()
    const env = readyEnv()
    const call = (xff: string) => handleChainSave({
      method: 'POST',
      headers: headers({
        'x-vercel-forwarded-for': '203.0.113.50',
        'x-forwarded-for': xff,
      }),
      body: { ...chainBody(), turnstileToken: 'token-ok' },
      env,
      now: 11_000,
      fetchImpl,
      limitStore: shared,
      verifyImpl: async () => true,
    })
    for (let n = 0; n < CHAIN_SAVE_RATE_LIMIT; n += 1) {
      const ok = await call(`10.0.0.${n}`)
      expect(ok.status).toBe(200)
    }
    resetChainSaveGuardsForTests()
    const otherInstance = await call('10.9.9.9')
    expect(otherInstance.status).toBe(429)
    expect(calls).toHaveLength(CHAIN_SAVE_RATE_LIMIT)

    const privateStore = new MemoryLimitStore()
    const fresh = await handleChainSave({
      method: 'POST',
      headers: headers({ 'x-vercel-forwarded-for': '203.0.113.51', 'x-forwarded-for': '10.9.9.9' }),
      body: { ...chainBody(), turnstileToken: 'token-ok' },
      env,
      now: 11_000,
      fetchImpl,
      limitStore: privateStore,
      verifyImpl: async () => true,
    })
    expect(fresh.status).toBe(200)
  })

  it('rejects anything that is not the governance chain-save payload', async () => {
    const { calls, fetchImpl } = countingFetch()
    const env = readyEnv()
    const cases = [
      chainBody({ persistToChain: false }),
      chainBody({ extra: true }),
      { containerId: '0x' + 'ab'.repeat(32), to: '0x' + '11'.repeat(20) },
      chainBody({ proposal: '   ' }),
      chainBody({ baseVoteWeight: 5 }),
      chainBody({ sunNeuralEmbedding: [1, 2, 3] }),
    ]
    for (const [index, body] of cases.entries()) {
      const result = await handleChainSave({
        method: 'POST',
        headers: headers({ 'x-vercel-forwarded-for': `203.0.113.${40 + index}` }),
        body: { ...body, turnstileToken: 'token-ok' },
        env,
        now: 20_000,
        fetchImpl,
        limitStore: new MemoryLimitStore(),
        verifyImpl: async () => true,
      })
      expect(result.status).toBe(400)
    }
    expect(calls).toHaveLength(0)
  })

  it('accepts a same-site referrer when Origin is absent and the token verifies', async () => {
    const { calls, fetchImpl } = countingFetch({ success: true })
    const result = await handleChainSave({
      method: 'POST',
      headers: {
        referer: 'https://dynamo.rippel.ai/deploy',
        'x-vercel-forwarded-for': '203.0.113.30',
      },
      body: { ...chainBody(), turnstileToken: 'token-ok' },
      env: readyEnv(),
      now: 30_000,
      fetchImpl,
      limitStore: new MemoryLimitStore(),
      verifyImpl: async () => true,
    })
    expect(result.status).toBe(200)
    expect(calls).toHaveLength(1)
  })

  it('does not return an upstream error that contains a URL', async () => {
    const secretUrl = 'https://rpc.example/secret/path'
    const { fetchImpl } = countingFetch({
      success: false,
      error: `connect ECONNREFUSED ${secretUrl}`,
      onChainError: secretUrl,
    }, 502)
    const result = await handleChainSave({
      method: 'POST',
      headers: headers(),
      body: { ...chainBody(), turnstileToken: 'token-ok' },
      env: readyEnv(),
      now: 40_000,
      fetchImpl,
      limitStore: new MemoryLimitStore(),
      verifyImpl: async () => true,
    })
    const encoded = JSON.stringify(result)
    expect(encoded).not.toContain(secretUrl)
    expect(encoded).not.toContain('rpc.example')
    expect(encoded).not.toContain('https://')
    expect(result.body.error).toBe(GENERIC_CHAIN_SAVE_ERROR)
    expect(result.body.onChainError).toBeUndefined()
  })

  it('does not spend a rate slot on invalid JSON', async () => {
    const { calls, fetchImpl } = countingFetch({ success: true })
    const store = new MemoryLimitStore()
    const env = readyEnv()
    const bad = await handleChainSave({
      method: 'POST',
      headers: headers(),
      body: '{',
      env,
      now: 60_000,
      fetchImpl,
      limitStore: store,
      verifyImpl: async () => true,
    })
    expect(bad.status).toBe(400)
    expect(calls).toHaveLength(0)
    for (let n = 0; n < CHAIN_SAVE_RATE_LIMIT; n += 1) {
      const ok = await handleChainSave({
        method: 'POST',
        headers: headers(),
        body: { ...chainBody(), turnstileToken: 'token-ok' },
        env,
        now: 60_000,
        fetchImpl,
        limitStore: store,
        verifyImpl: async () => true,
      })
      expect(ok.status).toBe(200)
    }
    expect(calls).toHaveLength(CHAIN_SAVE_RATE_LIMIT)
  })

  it('rejects a body over the size cap before a rate slot or an upstream call', async () => {
    const { calls, fetchImpl } = countingFetch({ success: true })
    const store = new MemoryLimitStore()
    const huge = await handleChainSave({
      method: 'POST',
      headers: headers(),
      body: 'x'.repeat(CHAIN_SAVE_BODY_MAX + 1),
      env: readyEnv(),
      now: 70_000,
      fetchImpl,
      limitStore: store,
      verifyImpl: async () => true,
    })
    expect(huge.status).toBe(413)
    expect(calls).toHaveLength(0)
    const ok = await handleChainSave({
      method: 'POST',
      headers: headers(),
      body: { ...chainBody(), turnstileToken: 'token-ok' },
      env: readyEnv(),
      now: 70_000,
      fetchImpl,
      limitStore: store,
      verifyImpl: async () => true,
    })
    expect(ok.status).toBe(200)
  })

  it('sets maxDuration to 90 so the function outlasts the 60s upstream timeout', () => {
    expect(maxDuration).toBe(90)
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      functions: Record<string, { maxDuration: number }>
    }
    expect(vercel.functions['api/govern-chain.ts'].maxDuration).toBe(90)
  })
})
