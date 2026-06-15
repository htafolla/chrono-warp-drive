#!/usr/bin/env node
/**
 * backup-history.mjs — Backup Redis history archive to a local JSON file.
 *
 * Usage:
 *   node bin/backup-history.mjs
 *   MCP_URL=https://mcp-production-80e2.up.railway.app node bin/backup-history.mjs
 *
 * Environment:
 *   MCP_URL — MCP endpoint (default: https://mcp-production-80e2.up.railway.app)
 *   OUT_DIR — output directory (default: docs/backups)
 */

const MCP_URL = process.env.MCP_URL || 'https://mcp-production-80e2.up.railway.app'
const OUT_DIR = process.env.OUT_DIR || 'docs/backups'

async function main() {
  const url = `${MCP_URL}/history/backup`
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
  if (!res.ok) {
    console.error(`Backup endpoint returned ${res.status}`)
    process.exit(1)
  }
  const data = await res.json()
  if (!data.success) {
    console.error('Backup failed:', data.error)
    process.exit(1)
  }

  const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const path = `${OUT_DIR}/history-${date}.json`
  const fs = await import('fs')
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(path, JSON.stringify(data, null, 2))

  console.log(`Backup saved: ${path}`)
  console.log(`  total: ${data.total}, passing: ${data.passing}, rejected: ${data.rejected}`)
  console.log(`  entries in archive: ${data.entries?.length ?? 0}`)
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
