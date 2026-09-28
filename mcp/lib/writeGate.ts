import { createHash, createHmac, timingSafeEqual } from 'crypto'

/**
 * HMAC-SHA256 over containerHash|containerId|recipient|expiresAt with a server-only
 * secret, compared via timingSafeEqual, so /vortex/mint never needs a wallet key.
 * EIP-191 would require a secp256k1 signing key (wallet-shaped); this does not.
 * The recipient and expiry are inside the MAC, so a copied signature fails when
 * `to` changes or when the signed expiry has passed.
 */
export const VORTEX_SIGNING_KEY_ENV = 'VORTEX_SIGNING_KEY'
export const MCP_WRITE_API_KEY_ENV = 'MCP_WRITE_API_KEY'
export const MINT_GLOBAL_BUDGET_ENV = 'MINT_GLOBAL_BUDGET'
export const MINT_GLOBAL_WINDOW_ENV = 'MINT_GLOBAL_WINDOW_MS'

/** Persist cooldown: 1 per 10 seconds globally, same as main. */
export const PERSIST_COOLDOWN_MS = 10_000

export const MINT_RATE_LIMIT = 5
export const MINT_RATE_WINDOW_MS = 60_000
/** Extra cap on the `to` address. Callers choose `to`, so this is not the wallet protection. */
export const MINT_ADDRESS_CAP = 8
/** How long a server-issued mint signature stays valid. */
export const MINT_SIGNATURE_TTL_SECONDS = 600
/** Reject expiries further ahead than this, including millisecond timestamps. */
export const MINT_SIGNATURE_MAX_AHEAD_SECONDS = 60 * 60
/** Chain-write budget across every caller. 0 blocks every mint. */
export const DEFAULT_MINT_GLOBAL_BUDGET = 10
export const DEFAULT_MINT_GLOBAL_WINDOW_MS = 60_000

const ZERO_BYTES32 = '0x' + '00'.repeat(32)

let lastPersistAt = 0
let signingKeyReads = 0
const mintedContainers = new Set<string>()
const inFlightContainers = new Set<string>()
const addressMintCounts = new Map<string, number>()
const rateBuckets = new Map<string, number[]>()
const globalBudgetStamps: number[] = []
const pendingBudget = new Map<string, number>()
let nextVerifyError: Error | null = null

export function signingKeyReadCount(): number {
  return signingKeyReads
}

export function resetWriteGuardsForTests(): void {
  lastPersistAt = 0
  signingKeyReads = 0
  mintedContainers.clear()
  inFlightContainers.clear()
  addressMintCounts.clear()
  rateBuckets.clear()
  globalBudgetStamps.length = 0
  pendingBudget.clear()
  nextVerifyError = null
}

/** Test seam. The next verifyVortexSignature call throws instead of returning. */
export function throwOnNextVerifyForTests(error: Error): void {
  nextVerifyError = error
}

function readNonNegativeInt(raw: string | undefined, fallback: number, allowZero: boolean): number {
  if (raw === undefined || raw.trim() === '') return fallback
  if (!/^\d+$/.test(raw.trim())) return fallback
  const parsed = Number(raw.trim())
  if (!Number.isSafeInteger(parsed)) return fallback
  if (parsed === 0) return allowZero ? 0 : fallback
  return parsed
}

/** Read at claim time so tests and hosts can change it without a restart of the module cache. */
export function mintGlobalBudget(): number {
  return readNonNegativeInt(process.env[MINT_GLOBAL_BUDGET_ENV], DEFAULT_MINT_GLOBAL_BUDGET, true)
}

export function mintGlobalWindowMs(): number {
  return readNonNegativeInt(process.env[MINT_GLOBAL_WINDOW_ENV], DEFAULT_MINT_GLOBAL_WINDOW_MS, false)
}

function digestEqual(left: string, right: string): boolean {
  const a = createHash('sha256').update(left, 'utf8').digest()
  const b = createHash('sha256').update(right, 'utf8').digest()
  return timingSafeEqual(a, b)
}

export function bearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null
  const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader.trim())
  return match ? match[1] : null
}

export type WriteAuth =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string }

/** Failure fields. `in` checks so this narrows without strictNullChecks. */
export function rejectedWrite(auth: WriteAuth): { status: 401 | 503; error: string } | null {
  if (auth.ok) return null
  if ('status' in auth && 'error' in auth) return { status: auth.status, error: auth.error }
  return { status: 401, error: 'Unauthorized' }
}

/** Fail closed when MCP_WRITE_API_KEY is unset. Comparison is constant-time. */
export function authorizeWrite(authorizationHeader: string | undefined): WriteAuth {
  const expected = process.env[MCP_WRITE_API_KEY_ENV]
  if (!expected || expected.trim() === '') {
    return { ok: false, status: 503, error: 'Write API key is not configured' }
  }
  const provided = bearerToken(authorizationHeader)
  if (!provided || !digestEqual(provided, expected)) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
}

/** Reads VORTEX_SIGNING_KEY. Blank is unset. Does not read the deployer key. */
export function readVortexSigningKey(): string | null {
  signingKeyReads += 1
  const raw = process.env[VORTEX_SIGNING_KEY_ENV]
  if (!raw || raw.trim() === '') return null
  return raw
}

export function vortexSigningMessage(
  containerHash: string,
  containerId: string,
  recipient: string,
  expiresAt: number,
): string {
  return `${containerHash.toLowerCase()}|${containerId.toLowerCase()}|${recipient.toLowerCase()}|${Math.trunc(expiresAt)}`
}

export function signVortex(
  containerHash: string,
  containerId: string,
  recipient: string,
  expiresAt: number,
  key: string,
): string {
  return createHmac('sha256', key)
    .update(vortexSigningMessage(containerHash, containerId, recipient, expiresAt), 'utf8')
    .digest('hex')
}

function fixedTimeFalse(expected: Buffer): boolean {
  timingSafeEqual(expected, expected)
  return false
}

export type VortexSignatureVerdict =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'expired' }

/** Failure reason. `in` checks so this narrows without strictNullChecks. */
export function rejectedSignature(verdict: VortexSignatureVerdict): 'invalid' | 'expired' | null {
  if (verdict.ok) return null
  if ('reason' in verdict) return verdict.reason
  return 'invalid'
}

/**
 * Fail closed when key is null. MAC is checked before expiry so a copied
 * signature presented to a different recipient is "invalid", not "expired".
 * A matching MAC is expired when nowSeconds >= expiresAt.
 */
export function verifyVortexSignature(
  containerHash: string,
  containerId: string,
  recipient: string,
  expiresAt: number,
  signatureHex: string,
  key: string | null,
  nowSeconds = Math.floor(Date.now() / 1000),
): VortexSignatureVerdict {
  if (nextVerifyError) {
    const error = nextVerifyError
    nextVerifyError = null
    throw error
  }
  if (!key || typeof signatureHex !== 'string' || !Number.isInteger(expiresAt)) {
    return { ok: false, reason: 'invalid' }
  }
  if (expiresAt > nowSeconds + MINT_SIGNATURE_MAX_AHEAD_SECONDS) {
    return { ok: false, reason: 'invalid' }
  }
  const expected = createHmac('sha256', key)
    .update(vortexSigningMessage(containerHash, containerId, recipient, expiresAt), 'utf8')
    .digest()
  const normalized = signatureHex.trim().replace(/^0x/i, '')
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    fixedTimeFalse(expected)
    return { ok: false, reason: 'invalid' }
  }
  const provided = Buffer.from(normalized, 'hex')
  if (provided.length !== expected.length || !timingSafeEqual(expected, provided)) {
    if (provided.length !== expected.length) fixedTimeFalse(expected)
    return { ok: false, reason: 'invalid' }
  }
  if (nowSeconds >= expiresAt) return { ok: false, reason: 'expired' }
  return { ok: true }
}

export function isBytes32(value: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(value) && value.toLowerCase() !== ZERO_BYTES32
}

export function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value)
}

export function isUnixSeconds(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** 32-byte hex HMAC. Non-strings and any other length are rejected before a slot is claimed. */
export function isVortexSignature(value: unknown): value is string {
  return typeof value === 'string' && /^(?:0x)?[0-9a-fA-F]{64}$/.test(value.trim())
}

export function clientRateKey(forwardedFor: string | undefined): string {
  const first = forwardedFor?.split(',')[0]?.trim()
  return first ? first : 'local'
}

export type MintClaim =
  | { ok: true }
  | { ok: false; status: 409 | 429; error: string }

/** Failure fields. `in` checks so this narrows without strictNullChecks. */
export function rejectedMint(claim: MintClaim): { status: 409 | 429; error: string } | null {
  if (claim.ok) return null
  if ('status' in claim && 'error' in claim) return { status: claim.status, error: claim.error }
  return { status: 409, error: 'Container already has a vortex token' }
}

function pruneBudget(now: number, windowMs: number): void {
  const oldestKept = now - windowMs
  let drop = 0
  while (drop < globalBudgetStamps.length && globalBudgetStamps[drop] <= oldestKept) drop += 1
  if (drop > 0) globalBudgetStamps.splice(0, drop)
}

/**
 * Idempotency, per-caller rate limit, per-address cap, then the global mint
 * budget. All checks are in memory and finish before the caller is allowed to
 * touch the chain. One containerId can hold at most one in-flight or completed
 * mint. The budget counts reserved chain writes across every caller.
 */
export function claimMintSlot(input: {
  containerId: string
  recipient: string
  rateKey: string
  now?: number
}): MintClaim {
  const id = input.containerId.toLowerCase()
  if (mintedContainers.has(id) || inFlightContainers.has(id)) {
    return { ok: false, status: 409, error: 'Container already has a vortex token' }
  }
  const now = input.now ?? Date.now()
  const bucket = (rateBuckets.get(input.rateKey) ?? []).filter((stamp) => now - stamp < MINT_RATE_WINDOW_MS)
  if (bucket.length >= MINT_RATE_LIMIT) {
    rateBuckets.set(input.rateKey, bucket)
    return { ok: false, status: 429, error: 'Mint rate limit exceeded' }
  }
  const recipient = input.recipient.toLowerCase()
  if ((addressMintCounts.get(recipient) ?? 0) >= MINT_ADDRESS_CAP) {
    return { ok: false, status: 429, error: 'Per-address mint cap exceeded' }
  }
  const windowMs = mintGlobalWindowMs()
  pruneBudget(now, windowMs)
  if (globalBudgetStamps.length >= mintGlobalBudget()) {
    return { ok: false, status: 429, error: 'Mint budget exceeded' }
  }
  bucket.push(now)
  rateBuckets.set(input.rateKey, bucket)
  globalBudgetStamps.push(now)
  pendingBudget.set(id, now)
  inFlightContainers.add(id)
  return { ok: true }
}

export function commitMintSlot(containerId: string, recipient: string): void {
  const id = containerId.toLowerCase()
  inFlightContainers.delete(id)
  pendingBudget.delete(id)
  mintedContainers.add(id)
  const addr = recipient.toLowerCase()
  addressMintCounts.set(addr, (addressMintCounts.get(addr) ?? 0) + 1)
}

export function releaseMintSlot(containerId: string): void {
  const id = containerId.toLowerCase()
  inFlightContainers.delete(id)
  const stamp = pendingBudget.get(id)
  if (stamp === undefined) return
  pendingBudget.delete(id)
  const index = globalBudgetStamps.lastIndexOf(stamp)
  if (index >= 0) globalBudgetStamps.splice(index, 1)
}

/**
 * A chain write was attempted and failed. The container is not locked.
 * The budget stamp stays: the attempt still counts, and the budget is in-memory per process.
 */
export function abortMintWrite(containerId: string): void {
  const id = containerId.toLowerCase()
  inFlightContainers.delete(id)
  pendingBudget.delete(id)
}

export function rememberMintedContainers(containerIds: string[]): void {
  for (const id of containerIds) mintedContainers.add(id.toLowerCase())
}

export function persistCooldownRemaining(now = Date.now()): number {
  if (now - lastPersistAt >= PERSIST_COOLDOWN_MS) return 0
  return Math.ceil((PERSIST_COOLDOWN_MS - (now - lastPersistAt)) / 1000)
}

export function acquirePersistCooldown(now = Date.now()): { ok: true } | { ok: false; retryAfterSeconds: number } {
  if (now - lastPersistAt < PERSIST_COOLDOWN_MS) {
    const retryAfterSeconds = Math.ceil((PERSIST_COOLDOWN_MS - (now - lastPersistAt)) / 1000)
    return { ok: false, retryAfterSeconds }
  }
  lastPersistAt = now
  return { ok: true }
}

/** Seconds still on the cooldown, or null when the attempt acquired it. */
export function cooldownDenial(result: { ok: true } | { ok: false; retryAfterSeconds: number }): number | null {
  if (result.ok) return null
  if ('retryAfterSeconds' in result) return result.retryAfterSeconds
  return 0
}
