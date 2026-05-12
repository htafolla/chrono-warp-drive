# MCP Server Template

Production-ready MCP (Model Context Protocol) server template based on lessons from Dynamo/Stellar deployments.

## Features

- **Hono** HTTP framework — lightweight, fast, TypeScript-native
- **SSE Transport** — persistent Server-Sent Events for MCP JSON-RPC
- **Redis Pub/Sub** — horizontal scaling with in-memory fallback for tests
- **Auto-generated GET docs** — every POST endpoint returns schema on GET
- **Health checks** — Railway-compatible /health endpoint
- **Governance-ready** — extensible tool system with real-time context
- **Tested** — Vitest with session injection for MCP protocol testing

## Quick Start

```bash
# Copy template
cp -r templates/mcp-server my-mcp-server
cd my-mcp-server

# Install dependencies
npm install

# Run locally
npm run dev

# Test
npm test

# Deploy to Railway
npm run deploy
```

## Architecture

```
my-mcp-server/
├── src/
│   ├── index.ts           # Main server: tools, SSE, JSON-RPC
│   ├── pubsub.ts          # Redis/in-memory dual-mode PubSub
│   ├── types.ts           # Shared types
│   └── __tests__/
│       └── index.test.ts  # MCP protocol tests
├── railway.toml           # Railway deployment config
├── package.json
├── tsconfig.json
└── .env.example
```

## Adding Tools

1. Define tool in `src/index.ts`:

```typescript
const TOOL_DEFINITIONS = [
  {
    name: 'my_tool',
    description: 'What it does',
    inputSchema: {
      type: 'object',
      properties: {
        param: { type: 'string', description: 'Parameter' }
      },
      required: ['param']
    }
  }
]
```

2. Add handler in `TOOL_HANDLERS`:

```typescript
const TOOL_HANDLERS: Record<string, (args: any) => any> = {
  my_tool: (args: any) => {
    return { result: `You sent: ${args.param}` }
  }
}
```

3. Auto-generated GET docs appear at `GET /my_tool`.

## Deployment

### Railway

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Create project: `railway init`
4. Add Redis: `railway add --plugin redis`
5. Deploy: `railway up`
6. Get domain: `railway domain`

### Environment Variables

```env
PORT=3000                    # Server port
REDIS_URL=redis://...        # Optional: Redis for scaling
NODE_ENV=production          # Environment mode
```

## MCP Connection

Connect any MCP client (Grok, Claude, etc.) to:

```
https://your-app.up.railway.app/sse
```

The server supports MCP Standard Protocol:
1. Client opens `GET /sse` → receives `event: endpoint` with sessionId
2. Client sends JSON-RPC via `POST /messages?sessionId=xxx`
3. Server publishes response to SSE stream

## Testing

```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch
```

## License

MIT
