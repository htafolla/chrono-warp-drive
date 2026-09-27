import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PHI as seededPhi } from '../../mcp/lib/deterministicUtils.ts'
import { L, PHI } from '../../mcp/lib/tlmConstants.ts'
import { blackHoleSequence, tPTT } from '../../mcp/lib/vortexMath.ts'

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'package-lock.json') continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path))
    else if (/\.(ts|tsx|js|mjs|cjs|md|json)$/.test(name)) out.push(path)
  }
  return out
}

describe('mcp PHI source', () => {
  it('PHI is exactly 5/3 from the single module', () => {
    expect(PHI).toBe(5 / 3)
    expect(L).toBe(3)
    expect(seededPhi).toBe(PHI)
  })

  it('default tPTT and BlackHole_Seq use that PHI', () => {
    const bhs = ((L * 7) * Math.pow(PHI, 3)) % Math.PI
    expect(blackHoleSequence(7, 3)).toBe(bhs)
    expect(bhs).toBe((2625 / 27) % Math.PI)
    expect(tPTT(137, 1, 0.5, 1e-6)).toBe(137 * (1 / 0.5) * PHI * (3e8 / 1e-6))
  })

  it('no literal 1.666 remains under mcp/', () => {
    const hits = sourceFiles(join(process.cwd(), 'mcp')).filter((file) =>
      readFileSync(file, 'utf8').includes('1.666'),
    )
    expect(hits).toEqual([])
  })
})
