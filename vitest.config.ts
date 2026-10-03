import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // ioredis is an optional MCP runtime dependency. Vite still resolves the
      // dynamic import in mcp/pubsub.ts, and it is not installed at the repo root.
      ioredis: path.resolve(__dirname, './src/test-stubs/ioredis.ts'),
    },
  },
})
