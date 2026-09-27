import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PHI as srcPhi } from '../../src/lib/tlmConstants.ts'
import { PHI as seededPhi } from '../../mcp/lib/deterministicUtils.ts'
import { L, PHI } from '../../mcp/lib/tlmConstants.ts'
import { blackHoleSequence, tPTT } from '../../mcp/lib/vortexMath.ts'

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next'])
const TEXT = /\.(ts|tsx|js|jsx|mjs|cjs|md|py|json|yml|yaml|txt)$/
// Built from pieces so this file does not contain the spellings it forbids.
// A trailing digit blocks a prefix of a longer float, such as a backup dump.
const FORBIDDEN = new RegExp(
  '(?<![0-9.])(?:' +
    '1\\.' + '666' + '+7?' +
    '|' + '1\\.' + '667' +
    '|' + '1666' + '/' + '1000' +
    '|' + '0\\.' + '8333' +
    '|' + '2\\.' + '7778' +
  ')(?![0-9])',
)
// Only the versioned Codex files that still quote the old decimal as historical text.
const HISTORICAL_CODEX = new Set([
  'docs/blurrn-codex/Blurrn-Quantum-Codex-v4.5-Full-Spectrum.md',
  'docs/blurrn-codex/Blurrn-Quantum-Codex-v4.5-to-v4.8-Complete-Research-Spec.md',
  'docs/blurrn-codex/Blurrn-Quantum-Codex-v4.6-Full-Spec.md',
  'docs/blurrn-codex/Blurrn-Quantum-Codex-v4.6-Overview.md',
  'docs/blurrn-codex/Blurrn-Quantum-Codex-v4.7-Chrono-Transport-Cascade.md',
  'docs/blurrn-codex/Blurrn-Quantum-Codex-v4.9-6D-Temporal-Box.md',
  'docs/blurrn-codex/Blurrn-Quantum-Codex-v5.0-Temporal-Displacement-Field.md',
  'docs/blurrn-codex/V4.8-Isotopic-Temporal-Vortex-Spec.md',
])

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

  it('flags the other decimal spellings of five thirds', () => {
    const spell = (...parts: string[]) => parts.join('')
    const hits = [
      spell('1.', '666'),
      spell('1.', '6667'),
      spell('1.', '667'),
      spell('1666', '/', '1000'),
      spell('0.', '8333'),
      spell('2.', '7778'),
    ]
    for (const sample of hits) expect(FORBIDDEN.test(sample)).toBe(true)
    expect(FORBIDDEN.test(spell('0.', '8333', '204450439127'))).toBe(false)
    expect(FORBIDDEN.test(spell('2.', '7778', '1'))).toBe(false)
    expect(FORBIDDEN.test('5/3')).toBe(false)
  })

  it('no decimal spelling of PHI remains outside the eight historical Codex files', () => {
    const root = process.cwd()
    const codexDir = join(root, 'docs/blurrn-codex')
    const codexFiles = readdirSync(codexDir).map((name) => `docs/blurrn-codex/${name}`)
    const allowed = codexFiles.filter((file) => HISTORICAL_CODEX.has(file))
    const scannedCodex = codexFiles.filter((file) => !HISTORICAL_CODEX.has(file))
    expect(HISTORICAL_CODEX.size).toBe(8)
    expect(allowed).toHaveLength(8)
    expect(scannedCodex).toHaveLength(3)
    const hits = sourceFiles(root)
      .map((file) => relative(root, file))
      .filter((file) => !HISTORICAL_CODEX.has(file))
      .filter((file) => FORBIDDEN.test(readFileSync(join(root, file), 'utf8')))
    expect(hits).toEqual([])
  })
})
