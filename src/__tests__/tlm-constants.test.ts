import { describe, expect, it } from 'vitest'
import { C_TLM, F_h } from '../lib/tlmConstants'
import { C_TLM as mcpContext, F_h as mcpFrequency } from '../../mcp/lib/tlmConstants'

describe('tlm symbols', () => {
  it('exports the codexData pair and an infinite context', () => {
    expect(F_h).toEqual([5, 3])
    expect(mcpFrequency).toEqual([5, 3])
    expect(C_TLM).toBe(Number.POSITIVE_INFINITY)
    expect(mcpContext).toBe(Number.POSITIVE_INFINITY)
  })
})
