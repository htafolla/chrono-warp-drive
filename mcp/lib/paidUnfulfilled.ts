import { isAddress } from 'viem'
import { getRedisClient } from '../pubsub.js'
import { VORTEX_TREASURY } from './chainPort.js'

/** Same Redis the container list uses. One field per EIP-3009 payment id. */
export const PAID_UNFULFILLED_KEY = 'dynamo:paid-unfulfilled'
/** One operator seed, ever. A second seed does not write another record. */
export const PAID_UNFULFILLED_SEED_KEY = 'dynamo:paid-unfulfilled:seed'

const TX_HASH = /^0x[0-9a-fA-F]{64}$/
const USDC_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

export interface PaidUnfulfilledRecord {
  payer: string
  nonce: string
  proposalHash: string
  settleTransaction: `0x${string}`
  state: 'open' | 'consumed'
}

interface RedisLike {
  hget(key: string, field: string): Promise<string | null>
  eval(script: string, numKeys: number, ...rest: Array<string | number>): Promise<unknown>
}

const memory = new Map<string, PaidUnfulfilledRecord>()

const CLAIM_SCRIPT = `
-- paid-unfulfilled-claim
local raw = redis.call('HGET', KEYS[1], ARGV[1])
if not raw then return false end
local row = cjson.decode(raw)
if row.state ~= 'open' then return false end
if string.lower(row.payer) ~= string.lower(ARGV[2]) then return false end
if string.lower(row.nonce) ~= string.lower(ARGV[3]) then return false end
if string.lower(row.proposalHash) ~= string.lower(ARGV[4]) then return false end
row.state = 'consumed'
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(row))
return row.settleTransaction
`

const NOTE_SCRIPT = `
-- paid-unfulfilled-note
local raw = redis.call('HGET', KEYS[1], ARGV[1])
if raw then
  local row = cjson.decode(raw)
  if row.state == 'consumed' then return 0 end
end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
return 1
`

const REOPEN_SCRIPT = `
-- paid-unfulfilled-reopen
local raw = redis.call('HGET', KEYS[1], ARGV[1])
if not raw then return 0 end
local row = cjson.decode(raw)
if row.state ~= 'consumed' then return 0 end
if string.lower(row.proposalHash) ~= string.lower(ARGV[2]) then return 0 end
row.state = 'open'
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(row))
return 1
`

const SEED_SCRIPT = `
-- paid-unfulfilled-seed
if redis.call('EXISTS', KEYS[2]) == 1 then return 0 end
if redis.call('HEXISTS', KEYS[1], ARGV[1]) == 1 then return 0 end
redis.call('SET', KEYS[2], '1')
redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
return 1
`

type SettleReceipt = { status?: string; logs?: Array<{ address?: string; topics?: string[]; data?: string }> }

let settleReceiptReader: ((txHash: string) => Promise<SettleReceipt | null>) | null = null

export function resetPaidUnfulfilledForTests(): void {
  memory.clear()
  settleReceiptReader = null
}

export function setSettleReceiptReaderForTests(reader: ((txHash: string) => Promise<SettleReceipt | null>) | null): void {
  settleReceiptReader = reader
}

function paymentKey(paymentId: string): string {
  return paymentId.toLowerCase()
}

function same(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase()
}

function isTx(value: string): value is `0x${string}` {
  return TX_HASH.test(value)
}

function parseRecord(raw: string | null): PaidUnfulfilledRecord | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<PaidUnfulfilledRecord>
    if (parsed.state !== 'open' && parsed.state !== 'consumed') return null
    if (typeof parsed.payer !== 'string' || typeof parsed.nonce !== 'string') return null
    if (typeof parsed.proposalHash !== 'string' || typeof parsed.settleTransaction !== 'string') return null
    if (!isTx(parsed.settleTransaction) || !isTx(parsed.nonce) || !isTx(parsed.proposalHash)) return null
    return {
      payer: parsed.payer,
      nonce: parsed.nonce,
      proposalHash: parsed.proposalHash,
      settleTransaction: parsed.settleTransaction,
      state: parsed.state,
    }
  } catch {
    return null
  }
}

function remember(record: PaidUnfulfilledRecord): void {
  memory.set(paymentKey(record.nonce), { ...record })
}

async function redis(): Promise<RedisLike | null> {
  const client = await getRedisClient()
  if (!client) return null
  return client as RedisLike
}

function wroteOne(result: unknown): boolean {
  return result === 1 || result === '1'
}

export async function readPaidUnfulfilled(paymentId: string): Promise<PaidUnfulfilledRecord | null> {
  if (!isTx(paymentId)) return null
  const field = paymentKey(paymentId)
  const client = await redis()
  if (!client) return memory.get(field) ?? null
  const row = parseRecord(await client.hget(PAID_UNFULFILLED_KEY, field))
  if (row) remember(row)
  return row
}

/** Durable open record. A consumed record is left consumed. */
export async function notePaidUnfulfilledRecord(record: PaidUnfulfilledRecord): Promise<void> {
  const field = paymentKey(record.nonce)
  const stored: PaidUnfulfilledRecord = {
    payer: record.payer.toLowerCase(),
    nonce: field as `0x${string}`,
    proposalHash: record.proposalHash.toLowerCase(),
    settleTransaction: record.settleTransaction,
    state: 'open',
  }
  const payload = JSON.stringify(stored)
  const client = await redis()
  if (!client) {
    const current = memory.get(field)
    if (!current || current.state !== 'consumed') remember(stored)
    return
  }
  const result = await client.eval(NOTE_SCRIPT, 1, PAID_UNFULFILLED_KEY, field, payload)
  if (wroteOne(result)) {
    remember(stored)
    return
  }
  const loaded = parseRecord(await client.hget(PAID_UNFULFILLED_KEY, field))
  if (loaded) remember(loaded)
}

export interface PaidUnfulfilledClaim {
  paymentId: string
  payer: string
  nonce: string
  proposalHash: string
}

/**
 * Atomically mark one open record consumed when payer, nonce, and proposal hash all match.
 * A second claim, a forged id, or a mismatched proposal returns null and does not change the row.
 */
export async function claimPaidUnfulfilled(input: PaidUnfulfilledClaim): Promise<`0x${string}` | null> {
  if (!isTx(input.paymentId) || !isTx(input.nonce) || !isTx(input.proposalHash)) return null
  if (!isAddress(input.payer)) return null
  const field = paymentKey(input.paymentId)
  const client = await redis()
  if (!client) {
    const row = memory.get(field)
    if (!row || row.state !== 'open') return null
    if (!same(row.payer, input.payer) || !same(row.nonce, input.nonce) || !same(row.proposalHash, input.proposalHash)) return null
    row.state = 'consumed'
    return row.settleTransaction
  }
  const result = await client.eval(
    CLAIM_SCRIPT,
    1,
    PAID_UNFULFILLED_KEY,
    field,
    input.payer,
    input.nonce,
    input.proposalHash,
  )
  if (typeof result !== 'string' || !isTx(result)) return null
  const loaded = parseRecord(await client.hget(PAID_UNFULFILLED_KEY, field))
  if (loaded) remember(loaded)
  return result
}

/** Chain write failed after a claim. Return the single-use mark to open for this proposal only. */
export async function reopenPaidUnfulfilled(paymentId: string, proposalHash: string): Promise<void> {
  if (!isTx(paymentId) || !isTx(proposalHash)) return
  const field = paymentKey(paymentId)
  const client = await redis()
  if (client) {
    await client.eval(REOPEN_SCRIPT, 1, PAID_UNFULFILLED_KEY, field, proposalHash)
    const loaded = parseRecord(await client.hget(PAID_UNFULFILLED_KEY, field))
    if (loaded) remember(loaded)
    return
  }
  const row = memory.get(field)
  if (row && row.state === 'consumed' && same(row.proposalHash, proposalHash)) row.state = 'open'
}

function transferPaysPayer(
  log: { address?: string; topics?: string[]; data?: string },
  payer: string,
  asset: string,
  amount: bigint,
): boolean {
  if (typeof log.address !== 'string' || !same(log.address, asset)) return false
  const topics = log.topics ?? []
  if ((topics[0] ?? '').toLowerCase() !== USDC_TRANSFER_TOPIC) return false
  const fromTopic = topics[1] ?? ''
  const toTopic = topics[2] ?? ''
  if (!fromTopic.toLowerCase().endsWith(payer.slice(2).toLowerCase())) return false
  if (!toTopic.toLowerCase().endsWith(VORTEX_TREASURY.slice(2).toLowerCase())) return false
  if (typeof log.data !== 'string') return false
  try {
    return BigInt(log.data) === amount
  } catch {
    return false
  }
}

async function readChainReceipt(txHash: string): Promise<SettleReceipt | null> {
  try {
    const { createPublicClient } = await import('viem')
    const { baseMainnet, buildReadTransport } = await import('./contractClient.js')
    const client = createPublicClient({ chain: baseMainnet, transport: buildReadTransport() })
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` })
    const logs = receipt.logs.map((log) => {
      const row = log as { address?: string; topics?: readonly string[]; data?: string }
      return { address: row.address, topics: row.topics ? [...row.topics] : [], data: row.data }
    })
    return { status: receipt.status, logs }
  } catch {
    return null
  }
}

async function proveSettledUsdc(txHash: string, payer: string): Promise<boolean> {
  const { BASE_USDC, PERSIST_USDC_ATOMIC } = await import('./x402Exact.js')
  const receipt = settleReceiptReader ? await settleReceiptReader(txHash) : await readChainReceipt(txHash)
  if (!receipt || receipt.status !== 'success') return false
  return (receipt.logs ?? []).some((log) => transferPaysPayer(log, payer, BASE_USDC, PERSIST_USDC_ATOMIC))
}

export type SeedResult =
  | { ok: true; paymentId: string; proposalHash: string }
  | { ok: false; status: 400 | 409; error: string }

/**
 * Operator recovery for one settled payment whose record was lost.
 * The settle tx must show from=payer, to=vortex treasury, value=10000 USDC.
 * The seed flag is single-use and is set only after that proof succeeds.
 */
export async function seedPaidUnfulfilled(input: {
  settleTransaction: string
  payer: string
  paymentId: string
  proposalHash: string
}): Promise<SeedResult> {
  if (!isTx(input.settleTransaction) || !isAddress(input.payer) || !isTx(input.paymentId) || !isTx(input.proposalHash)) {
    return { ok: false, status: 400, error: 'Invalid paid-unfulfilled seed' }
  }
  const proved = await proveSettledUsdc(input.settleTransaction, input.payer)
  if (!proved) {
    return { ok: false, status: 400, error: 'Settle transaction did not pay 0.01 USDC to the vortex treasury' }
  }
  const client = await redis()
  if (!client) return { ok: false, status: 400, error: 'Paid-unfulfilled store is unavailable' }
  const record: PaidUnfulfilledRecord = {
    payer: input.payer.toLowerCase(),
    nonce: paymentKey(input.paymentId) as `0x${string}`,
    proposalHash: input.proposalHash.toLowerCase(),
    settleTransaction: input.settleTransaction,
    state: 'open',
  }
  const result = await client.eval(
    SEED_SCRIPT,
    2,
    PAID_UNFULFILLED_KEY,
    PAID_UNFULFILLED_SEED_KEY,
    record.nonce,
    JSON.stringify(record),
  )
  if (!wroteOne(result)) return { ok: false, status: 409, error: 'Paid-unfulfilled seed already used' }
  remember(record)
  return { ok: true, paymentId: record.nonce, proposalHash: record.proposalHash }
}
