/**
 * P0.4 platform env mesh — Dynamo URL SSOT for chrono UI + MCP harness.
 * Contract: ~/dev/0x0/docs/0x0-platform-contract.md
 */

const DEFAULT_DYNAMO_BASE = 'https://mcp-production-80e2.up.railway.app';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

/** Dynamo MCP base (Railway). Set VITE_DYNAMO_MCP_URL or DYNAMO_MCP_URL at build/runtime. */
export const DYNAMO_MCP_URL = stripTrailingSlash(
  import.meta.env.VITE_DYNAMO_MCP_URL ??
    (typeof process !== 'undefined' ? process.env?.DYNAMO_MCP_URL : undefined) ??
    DEFAULT_DYNAMO_BASE,
);

export const GOVERNANCE_ENDPOINT = `${DYNAMO_MCP_URL}/governance`;
export const DYNAMO_CALL_CONNECTED_TOOL = `${DYNAMO_MCP_URL}/call_connected_tool`;

export const NEURAL_FUSION_URL =
  import.meta.env.VITE_NEURAL_FUSION_URL ??
  'https://neural-fusion-backend-production.up.railway.app';

export const STELLAR_MCP_URL =
  import.meta.env.VITE_STELLAR_MCP_URL ??
  'https://stellar-mcp-production.up.railway.app';

/** @deprecated Use DYNAMO_MCP_URL — kept for incremental migration */
export const MCP_URL = DYNAMO_MCP_URL;