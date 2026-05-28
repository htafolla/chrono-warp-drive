---
sidebar_position: 9
---

# Deployment

## Service Map

| Service | Platform | Directory | Entry Point |
|---------|----------|-----------|-------------|
| MCP server (backend) | Railway | `mcp/` | `server.ts` (port 3000) |
| Frontend (UI) | Vercel | root | `vite build` → `dist/` |

## Railway (Backend)

```bash
cd mcp
railway up
```

**Important**: Always deploy from the `mcp/` directory. Deploying from the root builds the Vite frontend instead of the backend.

The `mcp/railway.toml` and `mcp/package.json` configure the build automatically. The `ENTRY_POINT` environment variable determines which server file starts.

## Vercel (Frontend)

```bash
vercel --prod
```

Deploys from the repo root. The `.vercelignore` excludes `mcp/`, `.strray/`, `.opencode/`, `docs/reflections/`, and test files.

## Redis

Add Redis from the Railway dashboard:

1. Open the project dashboard
2. Click **+ New → Database → Redis** (Upstash)
3. The `REDIS_URL` variable is auto-injected into all services

Without Redis, the system runs entirely in-memory. Data persists for the lifetime of the server process but resets on restart.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | No | Redis connection string for persistent storage |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Health returns HTML/Vite app | Deployed from root instead of `mcp/` | `cd mcp && railway up` |
| History returns empty | Redis not configured | Add Redis via Railway dashboard |
| Public feed resets | No Redis, server restarted | Normal — feed is ephemeral without Redis |
