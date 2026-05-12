// src/types.ts
// Shared types for MCP server

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

export interface MCPMessage {
  jsonrpc: '2.0'
  id: number | string
  method: string
  params?: Record<string, any>
}

export interface MCPResult {
  jsonrpc: '2.0'
  id: number | string
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

export interface ToolHandler {
  (args: Record<string, any>): any | Promise<any>
}
