import { describe, it, expect } from 'vitest'
import { app } from '../index'

async function post(path: string, body: any) {
  const res = await app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()
}

describe('MCP Server Template', () => {
  describe('REST Endpoints', () => {
    it('GET / returns server info', async () => {
      const res = await app.request('/', { method: 'GET' })
      const json: any = await res.json()
      expect(json.name).toBe('mcp-server-template')
      expect(json.tools).toBe(3)
    })

    it('GET /health returns status', async () => {
      const res = await app.request('/health', { method: 'GET' })
      const json: any = await res.json()
      expect(json.status).toBe('ok')
    })

    it('GET /hello returns tool docs', async () => {
      const res = await app.request('/hello', { method: 'GET' })
      const json: any = await res.json()
      expect(json.name).toBe('hello')
      expect(json.method).toBe('POST')
      expect(json.parameters.name).toBeDefined()
    })

    it('POST /hello with name', async () => {
      const json: any = await post('/hello', { name: 'Dynamo' })
      expect(json.greeting).toBe('Hello, Dynamo!')
      expect(json.timestamp).toBeDefined()
    })

    it('POST /echo returns message', async () => {
      const json: any = await post('/echo', { message: 'Test message' })
      expect(json.original).toBe('Test message')
      expect(json.length).toBe(12)
    })

    it('POST /compute adds numbers', async () => {
      const json: any = await post('/compute', { a: 5, b: 3 })
      expect(json.result).toBe(8)
      expect(json.operation).toBe('addition')
    })

    it('POST /compute rejects invalid input', async () => {
      const res = await app.request('/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a: 'not-a-number', b: 3 })
      })
      expect(res.status).toBe(400)
    })
  })

  describe('MCP Protocol', () => {
    it('returns 400 without sessionId', async () => {
      const res = await app.request('/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' })
      })
      expect(res.status).toBe(400)
    })

    it('handles initialize via injected session', async () => {
      const { subscribe } = await import('../pubsub')
      const messages: string[] = []
      const unsub = await subscribe('session:test-init', (msg) => messages.push(msg))

      const res = await app.request('/messages?sessionId=test-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0' }
          }
        })
      })
      expect(res.status).toBe(200)

      expect(messages.length).toBe(1)
      const data = JSON.parse(messages[0])
      expect(data.jsonrpc).toBe('2.0')
      expect(data.result.protocolVersion).toBe('2024-11-05')
      expect(data.result.serverInfo.name).toBe('mcp-server-template')

      await unsub()
    })

    it('handles tools/list via injected session', async () => {
      const { subscribe } = await import('../pubsub')
      const messages: string[] = []
      const unsub = await subscribe('session:test-list', (msg) => messages.push(msg))

      const res = await app.request('/messages?sessionId=test-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
      })
      expect(res.status).toBe(200)

      expect(messages.length).toBe(1)
      const data = JSON.parse(messages[0])
      expect(data.result.tools).toHaveLength(3)
      const names = data.result.tools.map((t: any) => t.name)
      expect(names).toContain('hello')
      expect(names).toContain('echo')
      expect(names).toContain('compute')

      await unsub()
    })

    it('handles tools/call via injected session', async () => {
      const { subscribe } = await import('../pubsub')
      const messages: string[] = []
      const unsub = await subscribe('session:test-call', (msg) => messages.push(msg))

      const res = await app.request('/messages?sessionId=test-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'compute', arguments: { a: 10, b: 20 } }
        })
      })
      expect(res.status).toBe(200)

      expect(messages.length).toBe(1)
      const data = JSON.parse(messages[0])
      const text = JSON.parse(data.result.content[0].text)
      expect(text.result).toBe(30)
      expect(text.operation).toBe('addition')

      await unsub()
    })

    it('returns error for unknown tool', async () => {
      const { subscribe } = await import('../pubsub')
      const messages: string[] = []
      const unsub = await subscribe('session:test-unknown', (msg) => messages.push(msg))

      const res = await app.request('/messages?sessionId=test-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'nonexistent', arguments: {} }
        })
      })
      expect(res.status).toBe(200)

      expect(messages.length).toBe(1)
      const data = JSON.parse(messages[0])
      expect(data.error.message).toContain('Unknown tool')

      await unsub()
    })
  })
})
