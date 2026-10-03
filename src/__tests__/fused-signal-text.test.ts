import { describe, expect, it } from 'vitest'
import { FusedSignal as McpFused } from '../../mcp/lib/isotopicSignal'
import { FusedSignal as SrcFused } from '../lib/isotopicSignal'

describe('FusedSignal reads the embedding', () => {
  it('derives both mirrors from the compressed vector', () => {
    const makers = [(data: number[]) => new McpFused(data), (data: number[]) => new SrcFused(data)]
    for (const make of makers) {
      const left = make([1_500_000, 3, 0.2])
      const right = make([4_200_000, 9, 0.4])
      expect(left.getIsotopeId()).toBe('blurrn-core-1')
      expect(right.getIsotopeId()).toBe('blurrn-core-4')
      expect(left.getIsotopeId()).not.toBe('fused-core')
      const cross = left.crossCorrelate(right)
      expect(cross.strength).not.toBe(0.95)
      expect(cross.strength).toBeGreaterThan(0)
      expect(cross.strength).toBeLessThan(1)
      expect(left.triangulate([]).confidence).toBe(0)
      const tri = left.triangulate([right])
      expect(tri.confidence).toBe(cross.strength)
      expect(tri.anchors).toEqual([right.embed()])
    }
  })
})
