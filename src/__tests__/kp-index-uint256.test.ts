import { describe, expect, it } from 'vitest'
import type { EnhancedGovernanceDecision } from '../../mcp/lib/dynamoSolarGovernance'
import { containerToContractParams, governanceToContainer } from '../../mcp/lib/temporalContainer'

function encodedKp(level: 'active' | 'storm', modifier: number, kp: number | undefined) {
  const decision = {
    solarContext: {
      solarActivityLevel: level,
      solarActivityModifier: modifier,
      recommendation: 'vote weight only',
      kpIndex: kp,
    },
  } as EnhancedGovernanceDecision
  const container = governanceToContainer(decision, `${level} solar window`, 'human')
  return containerToContractParams(container).solarSnapshot.kpIndex
}

describe('planetary Kp uint256', () => {
  it('encodes active and storm Kp as Kp*100, never the signed modifier', () => {
    const activeKp = 4
    const stormKp = 7
    const active = encodedKp('active', -0.08, activeKp)
    const storm = encodedKp('storm', -0.15, stormKp)

    expect(active >= 0n).toBe(true)
    expect(storm >= 0n).toBe(true)
    expect(active).toBe(BigInt(activeKp * 100))
    expect(storm).toBe(BigInt(stormKp * 100))
    expect(active).not.toBe(-8n)
    expect(storm).not.toBe(-15n)
    expect(encodedKp('storm', -0.15, undefined)).toBe(0n)
  })
})
