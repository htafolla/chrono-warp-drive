import { isAddress, verifyTypedData, type Address, type Hex } from 'viem'
import { VORTEX_TREASURY } from './chainPort.js'
import { authorizeWrite, type WriteAuth } from './writeGate.js'

/**
 * Groover's registry checks an apiKey only inside mint_suit and issue_sui_binding.
 * It has no public verify route for an apiKey or a DID-signed request.
 * persistToChain therefore accepts an x402 v2 exact USDC payment on Base.
 * The price is the cap: 0.01 USDC (10000 atomic units, 6 decimals).
 */
export const X402_VERSION = 2
export const BASE_CHAIN_ID = 8453
export const BASE_CAIP2 = 'eip155:8453'
export const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const
export const USDC_DOMAIN_NAME = 'USD Coin'
export const USDC_DOMAIN_VERSION = '2'
export const PERSIST_USDC_ATOMIC = 10_000n
export const PERSIST_USDC_CAP_ATOMIC = 10_000n
export const PERSIST_PAYMENT_TIMEOUT_SECONDS = 60
export const X402_FACILITATOR_URL_ENV = 'X402_FACILITATOR_URL'

const TRANSFER_AUTHORIZATION = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'validAfter', type: 'uint256' },
  { name: 'validBefore', type: 'uint256' },
  { name: 'nonce', type: 'bytes32' },
] as const

export const transferAuthorizationTypes = {
  TransferWithAuthorization: TRANSFER_AUTHORIZATION,
} as const

export function usdcDomain(): {
  name: typeof USDC_DOMAIN_NAME
  version: typeof USDC_DOMAIN_VERSION
  chainId: typeof BASE_CHAIN_ID
  verifyingContract: typeof BASE_USDC
} {
  return {
    name: USDC_DOMAIN_NAME,
    version: USDC_DOMAIN_VERSION,
    chainId: BASE_CHAIN_ID,
    verifyingContract: BASE_USDC,
  }
}

export interface ExactUsdcRequirements {
  scheme: 'exact'
  network: typeof BASE_CAIP2
  amount: string
  asset: typeof BASE_USDC
  payTo: typeof VORTEX_TREASURY
  maxTimeoutSeconds: number
  extra: {
    assetTransferMethod: 'eip3009'
    name: typeof USDC_DOMAIN_NAME
    version: typeof USDC_DOMAIN_VERSION
  }
}

export function exactUsdcRequirements(): ExactUsdcRequirements {
  return {
    scheme: 'exact',
    network: BASE_CAIP2,
    amount: PERSIST_USDC_ATOMIC.toString(),
    asset: BASE_USDC,
    payTo: VORTEX_TREASURY,
    maxTimeoutSeconds: PERSIST_PAYMENT_TIMEOUT_SECONDS,
    extra: {
      assetTransferMethod: 'eip3009',
      name: USDC_DOMAIN_NAME,
      version: USDC_DOMAIN_VERSION,
    },
  }
}

export interface ExactAuthorization {
  from: Address
  to: Address
  value: string
  validAfter: string
  validBefore: string
  nonce: Hex
}

export interface ExactPayment {
  raw: Record<string, unknown>
  authorization: ExactAuthorization
  signature: Hex
}

export type PersistGrant =
  | { ok: true; via: 'operator' }
  | { ok: true; via: 'x402'; payment: ExactPayment }
  | { ok: false; status: 401 | 503; error: string }

type SettleResult = { ok: true } | { ok: false; status: 401 | 503; error: string }

const usedNonces = new Set<string>()
const inflightNonces = new Set<string>()
let testSettler: ((payment: ExactPayment) => Promise<SettleResult>) | null = null

export function resetX402ForTests(): void {
  usedNonces.clear()
  inflightNonces.clear()
  testSettler = null
}

export function setX402SettlerForTests(settler: ((payment: ExactPayment) => Promise<SettleResult>) | null): void {
  testSettler = settler
}

function unauthorized(): { ok: false; status: 401; error: string } {
  return { ok: false, status: 401, error: 'Unauthorized' }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function decodeBase64(value: string): string | null {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  if (normalized.length === 0 || normalized.length % 4 === 1) return null
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) return null
  const buf = Buffer.from(normalized, 'base64')
  if (buf.length === 0) return null
  return buf.toString('utf8')
}

export function decodePaymentPayload(raw: string): unknown | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const jsonText = trimmed.startsWith('{') ? trimmed : decodeBase64(trimmed)
  if (jsonText === null) return null
  try {
    return JSON.parse(jsonText) as unknown
  } catch {
    return null
  }
}

function parseUint(value: unknown): bigint | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value) || value.length > 20) return null
  return BigInt(value)
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase()
}

function nonceKey(nonce: string): string {
  return nonce.toLowerCase()
}

function readAccepted(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null
  if (value.scheme !== 'exact' || value.network !== BASE_CAIP2) return null
  if (typeof value.asset !== 'string' || !sameAddress(value.asset, BASE_USDC)) return null
  if (typeof value.payTo !== 'string' || !sameAddress(value.payTo, VORTEX_TREASURY)) return null
  if (value.amount !== PERSIST_USDC_ATOMIC.toString()) return null
  if (value.extra !== undefined) {
    if (!isRecord(value.extra)) return null
    if (value.extra.name !== undefined && value.extra.name !== USDC_DOMAIN_NAME) return null
    if (value.extra.version !== undefined && value.extra.version !== USDC_DOMAIN_VERSION) return null
    if (value.extra.assetTransferMethod !== undefined && value.extra.assetTransferMethod !== 'eip3009') return null
  }
  return value
}

function readAuthorization(value: unknown): ExactAuthorization | null {
  if (!isRecord(value)) return null
  const from = value.from
  const to = value.to
  const nonce = value.nonce
  if (typeof from !== 'string' || !isAddress(from)) return null
  if (typeof to !== 'string' || !isAddress(to) || !sameAddress(to, VORTEX_TREASURY)) return null
  if (typeof nonce !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(nonce)) return null
  const amount = parseUint(value.value)
  const validAfter = parseUint(value.validAfter)
  const validBefore = parseUint(value.validBefore)
  if (amount === null || validAfter === null || validBefore === null) return null
  if (amount !== PERSIST_USDC_ATOMIC || amount > PERSIST_USDC_CAP_ATOMIC) return null
  const now = BigInt(Math.floor(Date.now() / 1000))
  if (now < validAfter || now >= validBefore) return null
  const remaining = validBefore - now
  if (remaining > BigInt(PERSIST_PAYMENT_TIMEOUT_SECONDS + 15)) return null
  if (typeof value.value !== 'string' || typeof value.validAfter !== 'string' || typeof value.validBefore !== 'string') {
    return null
  }
  return {
    from,
    to,
    value: value.value,
    validAfter: value.validAfter,
    validBefore: value.validBefore,
    nonce: nonce as Hex,
  }
}

/** Local EIP-3009 check. Does not settle and does not move funds. */
export async function verifyExactPayment(raw: string): Promise<{ ok: true; payment: ExactPayment } | { ok: false; status: 401; error: string }> {
  const decoded = decodePaymentPayload(raw)
  if (!isRecord(decoded)) return unauthorized()
  if (decoded.x402Version !== X402_VERSION) return unauthorized()
  if (!readAccepted(decoded.accepted)) return unauthorized()
  if (!isRecord(decoded.payload)) return unauthorized()
  const signature = decoded.payload.signature
  if (typeof signature !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(signature)) return unauthorized()
  const authorization = readAuthorization(decoded.payload.authorization)
  if (!authorization) return unauthorized()
  if (usedNonces.has(nonceKey(authorization.nonce)) || inflightNonces.has(nonceKey(authorization.nonce))) {
    return unauthorized()
  }
  let signed = false
  try {
    signed = await verifyTypedData({
      address: authorization.from,
      domain: usdcDomain(),
      types: transferAuthorizationTypes,
      primaryType: 'TransferWithAuthorization',
      message: {
        from: authorization.from,
        to: authorization.to,
        value: BigInt(authorization.value),
        validAfter: BigInt(authorization.validAfter),
        validBefore: BigInt(authorization.validBefore),
        nonce: authorization.nonce,
      },
      signature: signature as Hex,
    })
  } catch {
    signed = false
  }
  if (!signed) return unauthorized()
  return {
    ok: true,
    payment: { raw: decoded, authorization, signature: signature as Hex },
  }
}

function facilitatorBase(): string | null {
  const raw = process.env[X402_FACILITATOR_URL_ENV]
  if (!raw || raw.trim() === '') return null
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'https:') return null
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

async function postFacilitator(path: '/verify' | '/settle', body: unknown): Promise<Record<string, unknown> | null> {
  const base = facilitatorBase()
  if (!base) return null
  try {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return null
    const parsed: unknown = await response.json()
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

async function facilitatorSettle(payment: ExactPayment): Promise<SettleResult> {
  if (!facilitatorBase()) {
    return { ok: false, status: 503, error: 'x402 facilitator is not configured' }
  }
  const body = {
    x402Version: X402_VERSION,
    paymentPayload: payment.raw,
    paymentRequirements: exactUsdcRequirements(),
  }
  const verified = await postFacilitator('/verify', body)
  if (!verified || verified.isValid !== true) return unauthorized()
  const settled = await postFacilitator('/settle', body)
  if (!settled || settled.success !== true) return unauthorized()
  return { ok: true }
}

/** Settle a payment that verifyExactPayment already accepted. One nonce, one settlement. */
export async function settleExactPayment(payment: ExactPayment): Promise<SettleResult> {
  const key = nonceKey(payment.authorization.nonce)
  if (usedNonces.has(key) || inflightNonces.has(key)) return unauthorized()
  inflightNonces.add(key)
  try {
    const result = testSettler ? await testSettler(payment) : await facilitatorSettle(payment)
    if (result.ok) {
      inflightNonces.delete(key)
      usedNonces.add(key)
      return result
    }
    inflightNonces.delete(key)
    return result
  } catch {
    inflightNonces.delete(key)
    return unauthorized()
  }
}

/**
 * Operator bearer wins when it matches. Otherwise a verified x402 exact payment
 * is enough. A missing payment keeps the existing 401/503 write-key behavior.
 */
export async function authorizePersist(input: {
  authorizationHeader?: string
  payment?: string
}): Promise<PersistGrant> {
  const operator: WriteAuth = authorizeWrite(input.authorizationHeader)
  if (operator.ok) return { ok: true, via: 'operator' }
  const payment = input.payment?.trim()
  if (payment) {
    const verified = await verifyExactPayment(payment)
    if (!verified.ok) return unauthorized()
    return { ok: true, via: 'x402', payment: verified.payment }
  }
  return { ok: false, status: operator.status, error: operator.error }
}
