export interface StateDelta {
  added?: string[]
  modified?: string[]
  removed?: string[]
  memoryKeys?: string[]
}

export interface StructuredDerivativeProposal {
  id?: string
  timestamp?: string
  summary: string
  intent?: string
  previousVortexId?: string
  stateDelta?: StateDelta
  tags?: string[]
  riskLevel?: 'low' | 'medium' | 'high'
  scope?: 'ui' | 'infra' | 'protocol' | 'agent' | 'memory' | 'other'
  source?: 'human' | 'agent' | 'ambient' | 'system'
  confidence?: number
}

export type ProposalInput = string | StructuredDerivativeProposal

export function isStructuredProposal(input: unknown): input is StructuredDerivativeProposal {
  if (!input || typeof input !== 'object') return false
  const o = input as Record<string, unknown>
  return typeof o.summary === 'string' && o.summary.length > 0
}

export function extractProposalText(input: ProposalInput): string {
  if (typeof input === 'string') return input
  return input.summary
}

export function normalizeProposalForStorage(input: ProposalInput): {
  proposalText: string
  structuredProposal?: StructuredDerivativeProposal
} {
  if (typeof input === 'string') {
    return { proposalText: input }
  }
  return {
    proposalText: input.summary,
    structuredProposal: {
      ...input,
      id: input.id || `sdp-${Date.now()}`,
      timestamp: input.timestamp || new Date().toISOString(),
      source: input.source || 'human',
    },
  }
}
