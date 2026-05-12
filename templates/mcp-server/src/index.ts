// src/index.ts
// Production MCP Server Template
// Based on Dynamo/Stellar deployment learnings

import { Hono, Context } from 'hono'
import { cors } from 'hono/cors'
import { streamSSE } from 'hono/streaming'
import { z } from 'zod'
import { publish, subscribe } from './pubsub'

const app = new Hono()
app.use('/*', cors())

// ===== Tool Definitions =====

const TOOL_DEFINITIONS = [
  {
    name: 'hello',
    description: 'Say hello with optional name. Returns greeting.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, default: 'World', description: 'Name to greet' }
      }
    }
  },
  {
    name: 'echo',
    description: 'Echo back any message with timestamp.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        message: { type: 'string' as const, description: 'Message to echo' }
      },
      required: ['message']
    }
  },
  {
    name: 'compute',
    description: 'Simple arithmetic: add two numbers.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        a: { type: 'number' as const, description: 'First number' },
        b: { type: 'number' as const, description: 'Second number' }
      },
      required: ['a', 'b']
    }
  }
]

// ===== Tool Handlers =====

const TOOL_HANDLERS: Record<string, (args: any) => any> = {
  hello: (args: any) => ({
    greeting: `Hello, ${args.name ?? 'World'}!`,
    timestamp: new Date().toISOString()
  }),

  echo: (args: any) => ({
    original: args.message,
    echoed: args.message,
    timestamp: new Date().toISOString(),
    length: args.message.length
  }),

  compute: (args: any) => ({
    a: args.a,
    b: args.b,
    result: args.a + args.b,
    operation: 'addition'
  })
}

// ===== Auto-generated GET docs for all tools =====

function buildToolDocs(tool: any) {
  const params: Record<string, any> = {}
  const schema = tool.inputSchema?.properties || {}
  const required = tool.inputSchema?.required || []

  for (const [key, val] of Object.entries(schema as Record<string, any>)) {
    params[key] = {
      type: val.type,
      required: required.includes(key),
      default: val.default,
      description: val.description,
      ...(val.enum ? { enum: val.enum } : {})
    }
  }

  return {
    name: tool.name,
    description: tool.description,
    method: 'POST',
    url: `/${tool.name}`,
    parameters: params,
    note: 'Send parameters as JSON body with Content-Type: application/json'
  }
}

for (const tool of TOOL_DEFINITIONS) {
  app.get(`/${tool.name}`, (c: Context) => c.json(buildToolDocs(tool)))
}

// ===== POST handlers =====

const HelloSchema = z.object({ name: z.string().optional() })
app.post('/hello', async (c: Context) => {
  const body = await c.req.json()
  const parsed = HelloSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Invalid input' }, 400)
  return c.json(TOOL_HANDLERS.hello(parsed.data))
})

const EchoSchema = z.object({ message: z.string().min(1) })
app.post('/echo', async (c: Context) => {
  const body = await c.req.json()
  const parsed = EchoSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Invalid input' }, 400)
  return c.json(TOOL_HANDLERS.echo(parsed.data))
})

const ComputeSchema = z.object({ a: z.number(), b: z.number() })
app.post('/compute', async (c: Context) => {
  const body = await c.req.json()
  const parsed = ComputeSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Invalid input' }, 400)
  return c.json(TOOL_HANDLERS.compute(parsed.data))
})

// ===== MCP Standard Protocol (SSE + JSON-RPC) =====

function mcpResult(id: any, result: any) {
  return { jsonrpc: '2.0', id, result }
}

function mcpError(id: any, code: number, message: string, data?: any) {
  return { jsonrpc: '2.0', id, error: { code, message, data } }
}

async function handleMCPMessage(sessionId: string, msg: any): Promise<any> {
  const { jsonrpc, id, method, params } = msg || {}
  if (jsonrpc !== '2.0' || id === undefined) return null

  try {
    switch (method) {
      case 'initialize':
        return mcpResult(id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'mcp-server-template', version: '1.0.0' }
        })

      case 'ping':
        return mcpResult(id, {})

      case 'tools/list':
        return mcpResult(id, { tools: TOOL_DEFINITIONS })

      case 'tools/call': {
        const { name, arguments: args } = params || {}
        if (!name) return mcpError(id, -32602, 'Missing tool name')

        const handler = TOOL_HANDLERS[name]
        if (!handler) return mcpError(id, -32601, `Unknown tool: ${name}`)

        const result = await handler(args ?? {})
        return mcpResult(id, {
          content: [{ type: 'text', text: JSON.stringify(result) }]
        })
      }

      default:
        return mcpError(id, -32601, `Method not found: ${method}`)
    }
  } catch (err: any) {
    return mcpError(id, -32603, 'Internal error', err.message)
  }
}

// SSE endpoint
app.get('/sse', (c: Context) => {
  const sessionId = crypto.randomUUID()
  const channel = `session:${sessionId}`

  const cleanup = () => { unsub().catch(() => {}) }
  c.req.raw.signal.addEventListener('abort', cleanup)

  let unsub: () => Promise<void> = () => Promise.resolve()

  return streamSSE(c, async (stream) => {
    // Subscribe before writing endpoint to avoid race
    unsub = await subscribe(channel, async (raw: string) => {
      try { await stream.writeSSE({ data: raw }) } catch { cleanup() }
    })

    await stream.writeSSE({
      event: 'endpoint',
      data: `/messages?sessionId=${sessionId}`
    })

    await new Promise<void>((resolve) => {
      c.req.raw.signal.addEventListener('abort', () => resolve())
    })
  })
})

// Messages endpoint
app.post('/messages', async (c: Context) => {
  const sessionId = c.req.query('sessionId')
  if (!sessionId) {
    return c.json({ error: 'Invalid or expired session' }, 400)
  }

  const body = await c.req.json()
  const result = await handleMCPMessage(sessionId, body)

  if (result) {
    const delivered = await publish(`session:${sessionId}`, JSON.stringify(result))
    if (!delivered) {
      return c.json({ error: 'Invalid or expired session' }, 400)
    }
  }

  return c.json({ ok: true })
})

// ===== Root + Health =====

app.get('/', (c: Context) => {
  const toolNames = TOOL_DEFINITIONS.map(t => t.name)
  return c.json({
    name: 'mcp-server-template',
    version: '1.0.0',
    tools: TOOL_DEFINITIONS.length,
    endpoints: {
      GET: ['/', '/health', ...toolNames.map(t => `/${t}`)],
      POST: ['/', '/health', ...toolNames.map(t => `/${t}`), '/messages']
    },
    protocol: 'MCP 2024-11-05'
  })
})

app.get('/health', (c: Context) => {
  return c.json({
    status: 'ok',
    name: 'mcp-server-template',
    version: '1.0.0',
    tools: TOOL_DEFINITIONS.length,
    uptime: process.uptime()
  })
})

// ===== Start Server =====

const PORT = process.env.PORT || 3000

if (process.env.NODE_ENV !== 'test') {
  const { serve } = await import('@hono/node-server')
  serve({ fetch: app.fetch, port: Number(PORT) }, () => {
    console.log(`MCP Server running on port ${PORT}`)
  })
}

export default app
export { app, TOOL_DEFINITIONS, TOOL_HANDLERS }
