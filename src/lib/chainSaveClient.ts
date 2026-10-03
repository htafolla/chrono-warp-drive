/** Shown when the proxy times out. The chain save may still be landing. */
export const CHAIN_SAVE_STILL_SAVING = 'may still be saving, check back'

const lockedProposals = new Set<string>()

/** Off unless Blaze sets VITE_CHAIN_SAVE_ENABLED=true. The route stays the real guard. */
export function chainSaveButtonEnabled(flag: string | undefined | boolean): boolean {
  return flag === 'true' || flag === true
}

export function lockChainSaveProposal(proposal: string): void {
  const text = proposal.trim()
  if (text.length > 0) lockedProposals.add(text)
}

export function chainSaveRetryAllowed(proposal: string): boolean {
  return !lockedProposals.has(proposal.trim())
}

export function chainSaveTimedOut(body: { pending?: unknown } | null, aborted: boolean): boolean {
  return aborted || body?.pending === true
}
