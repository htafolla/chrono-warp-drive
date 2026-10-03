import { describe, expect, it } from 'vitest'
import {
  asAddress,
  asBigint,
  asContainerPage,
  asOnChainContainer,
  containerIdOf,
  readContractView,
  writeContractTx,
} from '../../mcp/lib/looseContract'

const ADDRESS = '0x7E410f102Cc7320fd8B9601637f5A67AfDF40cF9' as const

describe('loose contract boundary', () => {
  it('keeps a bigint and rejects anything else', () => {
    expect(asBigint(4n)).toBe(4n)
    expect(() => asBigint('4')).toThrow(/bigint/)
  })

  it('keeps an address and rejects a bare string', () => {
    expect(asAddress(ADDRESS)).toBe(ADDRESS)
    expect(() => asAddress('treasury')).toThrow(/address/)
  })

  it('reads a container id from an object or a tuple', () => {
    expect(containerIdOf({ containerId: '0xabc' })).toBe('0xabc')
    expect(containerIdOf(['0xdef', 1n])).toBe('0xdef')
    expect(() => containerIdOf({})).toThrow(/container id/)
  })

  it('requires ids and a total from listContainers', () => {
    expect(asContainerPage([['0xabc'], 1n])).toEqual([['0xabc'], 1n])
    expect(() => asContainerPage([['0xabc'], 1])).toThrow(/listContainers/)
  })

  it('requires the container fields the registry route reads', () => {
    const row = asOnChainContainer({
      timestamp: 1n,
      source: 'seed',
      resonanceProfile: { verdict: 'PASS', fullBox7DComposite: 2n },
      moralOverlay: { trinitariumMoralScore: 3n, moralNumerologicalTension: 'low' },
    })
    expect(row.resonanceProfile.verdict).toBe('PASS')
    expect(() => asOnChainContainer({ timestamp: 1n, source: 'seed' })).toThrow(/resonance or moral/)
  })

  it('calls the client method and returns its value', async () => {
    const client = {
      readContract: async () => 9n,
      writeContract: async () => '0xhash' as `0x${string}`,
    }
    await expect(readContractView(client, {
      address: ADDRESS,
      abi: [],
      functionName: 'totalSupply',
    })).resolves.toBe(9n)
    await expect(writeContractTx(client, {
      address: ADDRESS,
      abi: [],
      functionName: 'storeContainer',
      nonce: 1n,
    })).resolves.toBe('0xhash')
  })
})
