import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SAMPLE_KEY = 'sample-write-key-9f3c2a'
const root = join(import.meta.dirname, '..')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else out.push(path)
  }
  return out
}

execFileSync('npx', ['vite', 'build'], {
  cwd: root,
  env: { ...process.env, MCP_WRITE_API_KEY: SAMPLE_KEY },
  stdio: 'inherit',
})

const files = walk(join(root, 'dist')).filter((path) => /\.(js|css|html|map)$/.test(path))
if (files.length === 0) {
  process.stderr.write('bundle check: dist has no js, css, html, or map files\n')
  process.exit(1)
}
const blob = files.map((path) => readFileSync(path, 'utf8')).join('\n')
const needles = ['MCP_WRITE_API_KEY', SAMPLE_KEY, 'VITE_MCP_WRITE_API_KEY', 'NEXT_PUBLIC_MCP_WRITE_API_KEY']
const found = needles.filter((needle) => blob.includes(needle))
if (found.length > 0) {
  process.stderr.write(`bundle check: client dist contains ${found.join(', ')}\n`)
  process.exit(1)
}
process.stdout.write(`bundle check: ${files.length} files, write key name and sample value absent\n`)
