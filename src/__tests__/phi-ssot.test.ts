import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PHI as srcPhi } from '../../src/lib/tlmConstants.ts'
import { PHI as seededPhi } from '../../mcp/lib/deterministicUtils.ts'
import { L, PHI } from '../../mcp/lib/tlmConstants.ts'
import { blackHoleSequence, tPTT } from '../../mcp/lib/vortexMath.ts'

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next'])
const TEXT = /\.(ts|tsx|js|jsx|mjs|cjs|md|py|json|yml|yaml|txt)$/
// Built from pieces so this file does not contain the decimal spellings it forbids.
const DECIMAL = new RegExp('1\\.' + '666' + '+7?|' + '1\\.' + '667')
// Versioned Codex documents quote the old decimal as historical text.
const HISTORICAL_CODEX = 'docs/blurrn-codex/'

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path))
    else if (TEXT.test(name)) out.push(path)
  }
  return out
}

describe('PHI source', () => {
  it('PHI is exactly 5/3 from the constants module', () => {
    expect(PHI).toBe(5 / 3)
    expect(srcPhi).toBe(PHI)
    expect(L).toBe(3)
    expect(seededPhi).toBe(PHI)
  })

  it('default tPTT and BlackHole_Seq use that PHI', () => {
    const bhs = ((L * 7) * Math.pow(PHI, 3)) % Math.PI
    expect(blackHoleSequence(7, 3)).toBe(bhs)
    expect(bhs).toBe((2625 / 27) % Math.PI)
    expect(tPTT(137, 1, 0.5, 1e-6)).toBe(137 * (1 / 0.5) * PHI * (3e8 / 1e-6))
  })

  it('no decimal spelling of PHI remains outside the historical Codex', () => {
    const root = process.cwd()
    const hits = sourceFiles(root)
      .map((file) => relative(root, file))
      .filter((file) => !file.startsWith(HISTORICAL_CODEX))
      .filter((file) => DECIMAL.test(readFileSync(join(root, file), 'utf8')))
    expect(hits).toEqual([])
  })
})
