import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CHAIN_SAVE_RATE_LIMIT,
  handleChainSave,
  resetChainSaveGuardsForTests,
} from '../server/chainSaveProxy'

const SAMPLE_KEY = 'sample-write-key-9f3c2a'
const ORIGIN = 'https://dynamo.rippel.ai'

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
    'x-forwarded-for': '203.0.113.10',
    ...extra,
  }
}

afterEach(() => {
  resetChainSaveGuardsForTests()
})

describe('chain save proxy', () => {
  it('attaches the write key on the server and forwards only the chain-save payload', async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = []
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init })
      return new Response(JSON.stringify({ success: true, recommendation: 'PASS' }), { status: 200 })
    }) as typeof fetch
    const payload = chainBody({ spectralQuality: 0.5, sunNeuralEmbedding: Array.from({ length: 16 }, () => 0.1) })
    const result = await handleChainSave({
      method: 'POST',
      headers: headers(),
      body: payload,
      env: {
        MCP_WRITE_API_KEY: SAMPLE_KEY,
        CHAIN_SAVE_ALLOWED_ORIGINS: ORIGIN,
        DYNAMO_MCP_URL: 'https://mcp-production-80e2.up.railway.app',
      },
      now: 1_000,
      fetchImpl,
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
  })

  it('returns a clear error when the write key is missing and does not call upstream', async () => {
    let called = 0
    const fetchImpl = (async () => {
      called += 1
      return new Response('{}', { status: 200 })
    }) as typeof fetch
    const result = await handleChainSave({
      method: 'POST',
      headers: headers(),
      body: chainBody(),
      env: { CHAIN_SAVE_ALLOWED_ORIGINS: ORIGIN },
      now: 2_000,
      fetchImpl,
    })
    expect(result.status).toBe(503)
    expect(result.body.error).toBe('Write API key is not configured')
    expect(called).toBe(0)
  })

  it('rejects a bad origin before any upstream call', async () => {
    let called = 0
    const fetchImpl = (async () => {
      called += 1
      return new Response('{}', { status: 200 })
    }) as typeof fetch
    const result = await handleChainSave({
      method: 'POST',
      headers: headers({ origin: 'https://evil.example' }),
      body: chainBody(),
      env: { MCP_WRITE_API_KEY: SAMPLE_KEY, CHAIN_SAVE_ALLOWED_ORIGINS: ORIGIN },
      now: 3_000,
      fetchImpl,
    })
    expect(result.status).toBe(403)
    expect(result.body.error).toBe('Origin is not allowed')
    expect(called).toBe(0)

    const missing = await handleChainSave({
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.11' },
      body: chainBody(),
      env: { MCP_WRITE_API_KEY: SAMPLE_KEY, CHAIN_SAVE_ALLOWED_ORIGINS: ORIGIN },
      now: 3_000,
      fetchImpl,
    })
    expect(missing.status).toBe(403)
    expect(called).toBe(0)
  })

  it('trips a small per-IP rate limit', async () => {
    let called = 0
    const fetchImpl = (async () => {
      called += 1
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }) as typeof fetch
    const env = { MCP_WRITE_API_KEY: SAMPLE_KEY, CHAIN_SAVE_ALLOWED_ORIGINS: ORIGIN }
    for (let n = 0; n < CHAIN_SAVE_RATE_LIMIT; n += 1) {
      const ok = await handleChainSave({
        method: 'POST',
        headers: headers(),
        body: chainBody(),
        env,
        now: 10_000,
        fetchImpl,
      })
      expect(ok.status).toBe(200)
    }
    const blocked = await handleChainSave({
      method: 'POST',
      headers: headers(),
      body: chainBody(),
      env,
      now: 10_000,
      fetchImpl,
    })
    expect(blocked.status).toBe(429)
    expect(blocked.body.error).toBe('Too many chain saves')
    expect(called).toBe(CHAIN_SAVE_RATE_LIMIT)
  })

  it('rejects anything that is not the governance chain-save payload', async () => {
    let called = 0
    const fetchImpl = (async () => {
      called += 1
      return new Response('{}', { status: 200 })
    }) as typeof fetch
    const env = { MCP_WRITE_API_KEY: SAMPLE_KEY, CHAIN_SAVE_ALLOWED_ORIGINS: ORIGIN }
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
        headers: headers({ 'x-forwarded-for': `203.0.113.${40 + index}` }),
        body,
        env,
        now: 20_000,
        fetchImpl,
      })
      expect(result.status).toBe(400)
    }
    expect(called).toBe(0)
  })

  it('accepts a same-site referrer when Origin is absent', async () => {
    const fetchImpl = (async () => new Response(JSON.stringify({ success: true }), { status: 200 })) as typeof fetch
    const result = await handleChainSave({
      method: 'POST',
      headers: {
        referer: 'https://dynamo.rippel.ai/deploy',
        'x-forwarded-for': '203.0.113.30',
      },
      body: chainBody(),
      env: { MCP_WRITE_API_KEY: SAMPLE_KEY, CHAIN_SAVE_ALLOWED_ORIGINS: ORIGIN },
      now: 30_000,
      fetchImpl,
    })
    expect(result.status).toBe(200)
  })
})

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else out.push(path)
  }
  return out
}

describe('client bundle', () => {
  it('does not contain the write key name or a sample value', () => {
    const root = join(__dirname, '../..')
    execFileSync('npx', ['vite', 'build'], {
      cwd: root,
      env: { ...process.env, MCP_WRITE_API_KEY: SAMPLE_KEY },
      stdio: 'pipe',
    })
    const files = walk(join(root, 'dist')).filter((path) => /\.(js|css|html|map)$/.test(path))
    expect(files.length).toBeGreaterThan(0)
    const blob = files.map((path) => readFileSync(path, 'utf8')).join('\n')
    expect(blob.includes('MCP_WRITE_API_KEY')).toBe(false)
    expect(blob.includes(SAMPLE_KEY)).toBe(false)
    expect(blob.includes('VITE_MCP_WRITE_API_KEY')).toBe(false)
    expect(blob.includes('NEXT_PUBLIC_MCP_WRITE_API_KEY')).toBe(false)
  }, 180_000)
})
