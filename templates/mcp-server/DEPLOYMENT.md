# Deployment Guide

## Railway (Recommended)

### Prerequisites
- Railway CLI: `npm install -g @railway/cli`
- Railway account

### Steps

```bash
# Login
railway login

# Create project
railway init

# Add Redis (optional, for scaling)
railway add --plugin redis

# Deploy
railway up

# Get domain
railway domain
```

### Environment Variables

Set via Railway dashboard or CLI:

```bash
railway variables set NODE_ENV=production
# Optional: railway variables set REDIS_URL=${{Redis.REDIS_URL}}
```

### Railway.toml

Already configured in `railway.toml`:
- Builder: nixpacks
- Start command: `npm start`
- Health check: `/health`

## Other Platforms

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Fly.io

```bash
fly launch
fly deploy
```

### Render

1. Connect GitHub repo
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add environment variables

## Verification

After deployment, verify:

```bash
curl https://your-app.up.railway.app/health
# → {"status":"ok","tools":3,...}

curl https://your-app.up.railway.app/
# → {"name":"mcp-server-template","tools":3,...}

# Test MCP connection
curl -N https://your-app.up.railway.app/sse
# → event: endpoint
# → data: /messages?sessionId=...
```

## Troubleshooting

### Client shows wrong tool count
- Disconnect and reconnect MCP client
- Client caches tools from old sessions

### "Invalid or expired session"
- Session timeout: reconnect SSE
- Redis not connected: check REDIS_URL

### 404 on POST endpoint
- Must use POST, not GET
- GET returns documentation

### Tests fail
- Check `REDIS_URL` not set (uses in-memory)
- Run `npm test` not `npm run test:watch`
