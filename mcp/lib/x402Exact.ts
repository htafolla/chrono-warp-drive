import { isAddress, verifyTypedData, type Address, type Hex } from 'viem'
import { VORTEX_TREASURY } from './chainPort.js'
import { notePaidUnfulfilledRecord, resetPaidUnfulfilledForTests } from './paidUnfulfilled.js'
import { authorizeWrite, bearerToken, type WriteAuth } from './writeGate.js'

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
export const X402_FACILITATOR_TOKEN_ENV = 'X402_FACILITATOR_TOKEN'

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
  | { ok: false; status: 401 | 402 | 503; error: string }

export interface PaymentRequiredChallenge {
  x402Version: typeof X402_VERSION
  error: string
  resource: { url: string; description: string; mimeType: 'application/json' }
  accepts: [ExactUsdcRequirements]
  extensions: Record<string, never>
}

/** x402 v2 PaymentRequired object. The HTTP form is also the PAYMENT-REQUIRED header, base64-encoded. */
export function paymentRequiredChallenge(resourceUrl: string, error: string): PaymentRequiredChallenge {
  return {
    x402Version: X402_VERSION,
    error,
    resource: {
      url: resourceUrl,
      description: 'Persist a non-REJECT govern_with_solar verdict',
      mimeType: 'application/json',
    },
    accepts: [exactUsdcRequirements()],
    extensions: {},
  }
}

export function encodePaymentRequiredHeader(challenge: PaymentRequiredChallenge): string {
  return Buffer.from(JSON.stringify(challenge), 'utf8').toString('base64')
}

export type SettleResult =
  | { ok: true; transaction: `0x${string}` }
  | { ok: false; status: 401 | 503; error: string }

const SETTLE_TX = /^0x[0-9a-fA-F]{64}$/

function isSettleTx(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && SETTLE_TX.test(value)
}

/**
 * Process memory only. A restart forgets every set.
 * The real replay guard is the on-chain USDC EIP-3009 nonce: Base USDC
 * reverts transferWithAuthorization once that nonce is consumed.
 * A settled payment whose chain write did not finish is a durable paid-unfulfilled
 * record (Redis), not this set. Resume claims that record; it does not settle again.
 */
const usedNonces = new Set<string>()
const inflightNonces = new Set<string>()
let testSettler: ((payment: ExactPayment) => Promise<SettleResult>) | null = null

export function resetX402ForTests(): void {
  usedNonces.clear()
  inflightNonces.clear()
  resetPaidUnfulfilledForTests()
  testSettler = null
}

function facilitatorToken(): string | null {
  const token = process.env[X402_FACILITATOR_TOKEN_ENV]
  if (typeof token !== 'string' || token.trim() === '') return null
  return token.trim()
}

/**
 * null when a settler or a URL plus token can settle.
 * A URL without a token fails before any Clearing call.
 */
export function facilitatorConfigError(): string | null {
  if (testSettler) return null
  if (!facilitatorBase()) return 'x402 facilitator is not configured'
  if (!facilitatorToken()) return 'x402 facilitator token not configured'
  return null
}

/** True when a test settler or an https facilitator with a token can settle. */
export function x402SettlementReady(): boolean {
  return facilitatorConfigError() === null
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

type FacilitatorPost =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: 401 | 503 }

function facilitatorHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  const token = facilitatorToken()
  if (token) headers.authorization = `Bearer ${token}`
  return headers
}

/** Clearing 401/503 and any other non-2xx are not a settlement. */
async function postFacilitator(path: '/verify' | '/settle', body: unknown): Promise<FacilitatorPost> {
  const base = facilitatorBase()
  if (!base) return { ok: false, status: 503 }
  try {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: facilitatorHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return { ok: false, status: response.status === 503 ? 503 : 401 }
    const parsed: unknown = await response.json()
    if (!isRecord(parsed)) return { ok: false, status: 401 }
    return { ok: true, body: parsed }
  } catch {
    return { ok: false, status: 503 }
  }
}

function facilitatorDenied(status: 401 | 503): SettleResult {
  if (status === 503) return { ok: false, status: 503, error: 'x402 facilitator is not configured' }
  return unauthorized()
}

async function facilitatorSettle(payment: ExactPayment): Promise<SettleResult> {
  if (!facilitatorBase()) {
    return { ok: false, status: 503, error: 'x402 facilitator is not configured' }
  }
  if (!facilitatorToken()) {
    return { ok: false, status: 503, error: 'x402 facilitator token not configured' }
  }
  const body = {
    x402Version: X402_VERSION,
    paymentPayload: payment.raw,
    paymentRequirements: exactUsdcRequirements(),
  }
  const verified = await postFacilitator('/verify', body)
  if (!verified.ok) return facilitatorDenied('status' in verified ? verified.status : 503)
  if (verified.body.isValid !== true) return unauthorized()
  const settled = await postFacilitator('/settle', body)
  if (!settled.ok) return facilitatorDenied('status' in settled ? settled.status : 503)
  const transaction = settled.body.transaction
  if (settled.body.success !== true || !isSettleTx(transaction)) return unauthorized()
  return { ok: true, transaction }
}

/**
 * Settle a payment that verifyExactPayment already accepted.
 * The nonce stays in flight until notePaymentFulfilled or notePaidUnfulfilled.
 * A paid-unfulfilled retry does not come through here: the route claims the durable record.
 */
export async function settleExactPayment(payment: ExactPayment): Promise<SettleResult> {
  const key = nonceKey(payment.authorization.nonce)
  if (usedNonces.has(key) || inflightNonces.has(key)) return unauthorized()
  inflightNonces.add(key)
  try {
    const result = testSettler ? await testSettler(payment) : await facilitatorSettle(payment)
    if (!result.ok || !isSettleTx(result.transaction)) {
      inflightNonces.delete(key)
      return result.ok ? unauthorized() : result
    }
    return { ok: true, transaction: result.transaction }
  } catch {
    inflightNonces.delete(key)
    return unauthorized()
  }
}

/** Chain write failed after settlement. The durable record is what a later resume claims. */
export async function notePaidUnfulfilled(payment: ExactPayment, proposalHash: string, settleTransaction: `0x${string}`): Promise<void> {
  const key = nonceKey(payment.authorization.nonce)
  inflightNonces.delete(key)
  await notePaidUnfulfilledRecord({
    payer: payment.authorization.from,
    nonce: payment.authorization.nonce,
    proposalHash,
    settleTransaction,
    state: 'open',
  })
}

/** Persist succeeded. This nonce cannot authorize another persist. */
export function notePaymentFulfilled(payment: ExactPayment): void {
  const key = nonceKey(payment.authorization.nonce)
  inflightNonces.delete(key)
  usedNonces.add(key)
}

export function persistFailureCause(err: unknown): string {
  const message = err instanceof Error ? err.message : ''
  const lower = message.toLowerCase()
  if (lower.includes('insufficient funds') || lower.includes('gas balance')) return 'deployer gas balance too low'
  if (lower.includes('nonce')) return 'deployer transaction nonce was rejected'
  if (lower.includes('revert') || lower.includes('execution reverted')) return 'registry rejected storeContainer'
  if (lower.includes('timeout') || lower.includes('timed out')) return 'chain receipt timed out'
  const cleaned = message
    .replace(/(?:https?|wss?):\/\/\S+/gi, '[url]')
    .replace(/0x[0-9a-fA-F]{20,}/g, '[hex]')
    .replace(/[\r\n]/g, ' ')
    .slice(0, 160)
    .trim()
  return cleaned || 'chain write failed'
}

/**
 * Operator bearer wins when it matches. A presented bearer that does not match
 * stays 401 (or 503 when the operator key is unset). No bearer and no payment,
 * and a payment that fails verification, are 402 so an x402 client will pay.
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
    if (!verified.ok) return { ok: false, status: 402, error: 'Payment verification failed' }
    return { ok: true, via: 'x402', payment: verified.payment }
  }
  if (bearerToken(input.authorizationHeader)) {
    if ('status' in operator && 'error' in operator) {
      return { ok: false, status: operator.status, error: operator.error }
    }
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: false, status: 402, error: 'PAYMENT-SIGNATURE header is required' }
}
