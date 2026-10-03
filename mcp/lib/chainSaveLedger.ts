import { getRedisClient } from '../pubsub.js'
import { hashProposalText } from './temporalContainer.js'

/** Same Redis the container list uses. Field is the proposal hash, not process memory. */
export const CHAIN_SAVE_LEDGER_PREFIX = 'vortex:chain-save:'
/** A crashed runner must not block the proposal forever. A finished row has no TTL. */
const CHAIN_SAVE_RUNNING_TTL_MS = 10 * 60 * 1000
const CHAIN_SAVE_POLL_MS = 200
const CHAIN_SAVE_WAIT_MS = 130_000

interface LedgerRedis {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ...rest: Array<string | number>): Promise<'OK' | null>
  del(key: string): Promise<number>
}

export interface ChainSaveLedgerRow {
  state: 'running' | 'done'
  txHash: string | null
}

export function chainSaveLedgerKey(proposalText: string): string {
  return CHAIN_SAVE_LEDGER_PREFIX + hashProposalText(proposalText)
}

export function chainSaveReplay(txHash: string): Record<string, unknown> {
  return {
    success: true,
    status: 'saved',
    temporalContainer: {
      onChainTx: txHash,
      explorerUrl: `https://basescan.org/tx/${txHash}`,
    },
  }
}

function parseRow(raw: string | null): ChainSaveLedgerRow | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ChainSaveLedgerRow>
    if (parsed.state !== 'running' && parsed.state !== 'done') return null
    const txHash = typeof parsed.txHash === 'string' ? parsed.txHash : null
    return { state: parsed.state, txHash }
  } catch {
    return null
  }
}

async function redis(): Promise<LedgerRedis | null> {
  const client = await getRedisClient()
  if (!client) return null
  return client as LedgerRedis
}

export async function readChainSave(proposalText: string): Promise<ChainSaveLedgerRow | null> {
  const client = await redis()
  if (!client) return null
  return parseRow(await client.get(chainSaveLedgerKey(proposalText)))
}

/** NX so two instances cannot both become the runner. */
export async function claimChainSave(proposalText: string): Promise<'claimed' | 'busy' | 'unavailable'> {
  const client = await redis()
  if (!client) return 'unavailable'
  const won = await client.set(
    chainSaveLedgerKey(proposalText),
    JSON.stringify({ state: 'running', txHash: null }),
    'NX',
    'PX',
    CHAIN_SAVE_RUNNING_TTL_MS,
  )
  return won === 'OK' ? 'claimed' : 'busy'
}

export async function finishChainSave(proposalText: string, txHash: string): Promise<void> {
  const client = await redis()
  if (!client) return
  await client.set(chainSaveLedgerKey(proposalText), JSON.stringify({ state: 'done', txHash }))
}

export async function releaseChainSave(proposalText: string): Promise<void> {
  const client = await redis()
  if (!client) return
  await client.del(chainSaveLedgerKey(proposalText))
}

/** Poll the ledger until the runner stores the hash. No in-process promise is shared. */
export async function waitForChainSave(proposalText: string): Promise<ChainSaveLedgerRow | null> {
  const started = Date.now()
  while (Date.now() - started <= CHAIN_SAVE_WAIT_MS) {
    const row = await readChainSave(proposalText)
    if (row?.state === 'done' && row.txHash) return row
    if (!row) return null
    await new Promise<void>((resolve) => { setTimeout(resolve, CHAIN_SAVE_POLL_MS) })
  }
  return readChainSave(proposalText)
}

export async function replayChainSave(proposalText: string): Promise<Record<string, unknown> | null> {
  const row = await readChainSave(proposalText)
  if (!row) return null
  if (row.state === 'done' && row.txHash) return chainSaveReplay(row.txHash)
  if (row.state !== 'running') return null
  const finished = await waitForChainSave(proposalText)
  if (finished?.state === 'done' && finished.txHash) return chainSaveReplay(finished.txHash)
  return null
}
