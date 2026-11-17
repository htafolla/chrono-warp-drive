import { describe, expect, it } from 'vitest'
import { persistGasWei } from '../../mcp/lib/contractClient'

describe('persist gas quote', () => {
  it('prices estimated gasLimit times maxFeePerGas plus L1 data-fee headroom', () => {
    const gasLimit = 823_375n
    const maxFeePerGas = 6_012_865n
    const l1DataFee = 50_000n
    expect(persistGasWei(gasLimit, maxFeePerGas, l1DataFee)).toBe(gasLimit * maxFeePerGas + l1DataFee * 2n)
  })
})
