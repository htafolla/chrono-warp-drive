import { beforeEach, describe, expect, it, vi } from 'vitest'
import { privateKeyToAccount } from 'viem/accounts'
import { VORTEX_TREASURY } from '../../mcp/lib/chainPort'
import {
  BASE_USDC,
  PERSIST_USDC_ATOMIC,
  PERSIST_USDC_CAP_ATOMIC,
  exactUsdcRequirements,
  resetX402ForTests,
  persistFailureCause,
  settleExactPayment,
  transferAuthorizationTypes,
  usdcDomain,
  verifyExactPayment,
} from '../../mcp/lib/x402Exact'

const PAYER = privateKeyToAccount(`0x${'11'.repeat(32)}`)

beforeEach(() => {
  resetX402ForTests()
  delete process.env.X402_FACILITATOR_URL
  delete process.env.X402_FACILITATOR_TOKEN
})

async function signedPayment(value = PERSIST_USDC_ATOMIC.toString()): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const nonce = `0x${Math.floor(Math.random() * 1e9).toString(16).padStart(64, '0')}` as `0x${string}`
  const authorization = {
    from: PAYER.address,
    to: VORTEX_TREASURY,
    value,
    validAfter: '0',
    validBefore: String(now + 30),
    nonce,
  }
  const signature = await PAYER.signTypedData({
    domain: usdcDomain(),
    types: transferAuthorizationTypes,
    primaryType: 'TransferWithAuthorization',
    message: {
      from: authorization.from,
      to: authorization.to,
      value: BigInt(value),
      validAfter: 0n,
      validBefore: BigInt(authorization.validBefore),
      nonce,
    },
  })
  return Buffer.from(JSON.stringify({
    x402Version: 2,
    accepted: { ...exactUsdcRequirements(), amount: value },
    payload: { signature, authorization },
  }), 'utf8').toString('base64')
}

describe('x402 exact USDC on Base', () => {
  it('caps the persist price at 0.01 USDC', () => {
    expect(PERSIST_USDC_CAP_ATOMIC).toBe(10_000n)
    expect(PERSIST_USDC_ATOMIC).toBe(PERSIST_USDC_CAP_ATOMIC)
    const requirements = exactUsdcRequirements()
    expect(requirements.scheme).toBe('exact')
    expect(requirements.network).toBe('eip155:8453')
    expect(requirements.asset).toBe(BASE_USDC)
    expect(requirements.amount).toBe('10000')
    expect(requirements.payTo).toBe(VORTEX_TREASURY)
  })

  it('accepts a signed exact payment and rejects a tampered signature', async () => {
    const encoded = await signedPayment()
    const verified = await verifyExactPayment(encoded)
    expect(verified.ok).toBe(true)
    if (!verified.ok) return
    const broken = Buffer.from(JSON.stringify({
      ...verified.payment.raw,
      payload: {
        ...(verified.payment.raw.payload as Record<string, unknown>),
        signature: `0x${'ab'.repeat(65)}`,
      },
    }), 'utf8').toString('base64')
    const rejected = await verifyExactPayment(broken)
    expect(rejected.ok).toBe(false)
    if (!rejected.ok) expect(rejected.status).toBe(401)
  })

  it('rejects an amount above the 0.01 USDC cap', async () => {
    const rejected = await verifyExactPayment(await signedPayment('10001'))
    expect(rejected.ok).toBe(false)
    if (!rejected.ok) expect(rejected.status).toBe(401)
  })

  it('does not settle or consume the nonce when no facilitator is configured', async () => {
    const verified = await verifyExactPayment(await signedPayment())
    expect(verified.ok).toBe(true)
    if (!verified.ok) return
    const unsettled = await settleExactPayment(verified.payment)
    expect(unsettled.ok).toBe(false)
    if (!unsettled.ok) expect(unsettled.status).toBe(503)
    const again = await verifyExactPayment(Buffer.from(JSON.stringify(verified.payment.raw), 'utf8').toString('base64'))
    expect(again.ok).toBe(true)
  })

  it('sends the Clearing bearer on verify then settle, and a non-2xx settle is not success', async () => {
    const token = 'test-facilitator-token'
    process.env.X402_FACILITATOR_URL = 'https://clearing.example'
    process.env.X402_FACILITATOR_TOKEN = token
    const calls: Array<{ url: string; authorization: string | null }> = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      calls.push({ url: String(url), authorization: headers.get('authorization') })
      if (String(url).endsWith('/verify')) {
        return new Response(JSON.stringify({ isValid: true }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response(JSON.stringify({ error: 'unavailable' }), { status: 503, headers: { 'content-type': 'application/json' } })
    }))
    try {
      const verified = await verifyExactPayment(await signedPayment())
      expect(verified.ok).toBe(true)
      if (!verified.ok) return
      const settled = await settleExactPayment(verified.payment)
      expect(settled.ok).toBe(false)
      if (!settled.ok) expect(settled.status).toBe(503)
      expect(calls.map((call) => call.url)).toEqual([
        'https://clearing.example/verify',
        'https://clearing.example/settle',
      ])
      expect(calls.every((call) => call.authorization === `Bearer ${token}`)).toBe(true)
      expect(JSON.stringify(settled)).not.toContain(token)
      const retry = await verifyExactPayment(Buffer.from(JSON.stringify(verified.payment.raw), 'utf8').toString('base64'))
      expect(retry.ok).toBe(true)
    } finally {
      vi.unstubAllGlobals()
    }

    calls.length = 0
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      calls.push({ url: String(url), authorization: headers.get('authorization') })
      if (String(url).endsWith('/verify')) {
        return new Response(JSON.stringify({ isValid: true }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response(JSON.stringify({ error: 'denied' }), { status: 401, headers: { 'content-type': 'application/json' } })
    }))
    try {
      const verified = await verifyExactPayment(await signedPayment())
      expect(verified.ok).toBe(true)
      if (!verified.ok) return
      const settled = await settleExactPayment(verified.payment)
      expect(settled.ok).toBe(false)
      if (!settled.ok) expect(settled.status).toBe(401)
      expect(calls.map((call) => call.url)).toEqual([
        'https://clearing.example/verify',
        'https://clearing.example/settle',
      ])
      expect(JSON.stringify(settled)).not.toContain(token)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('redacts http and wss urls from a persist failure cause', () => {
    expect(persistFailureCause(new Error('insufficient funds for gas * price + value'))).toBe('deployer gas balance too low')
    const cause = persistFailureCause(new Error('writer rejected wss://rpc.example/secret and https://rpc.example/v'))
    expect(cause).toContain('[url]')
    expect(cause).not.toContain('wss://')
    expect(cause).not.toContain('https://')
  })

  it('does not call Clearing when the facilitator URL is set and the token is not', async () => {
    process.env.X402_FACILITATOR_URL = 'https://clearing.example'
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    try {
      const verified = await verifyExactPayment(await signedPayment())
      expect(verified.ok).toBe(true)
      if (!verified.ok) return
      const settled = await settleExactPayment(verified.payment)
      expect(settled.ok).toBe(false)
      if (!settled.ok) {
        expect(settled.status).toBe(503)
        expect(settled.error).toBe('x402 facilitator token not configured')
      }
      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
