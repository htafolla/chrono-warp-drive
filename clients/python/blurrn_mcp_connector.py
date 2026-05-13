#!/usr/bin/env python3
"""
Blurrn MCP Connector / General Purpose MCP Client (Custom REST-style)

This connector allows Grok (or any Python app) to call the Blurrn Temporal Phase Transport
MCP server endpoints (the 14 tools from v4.8 Isotopic Temporal Vortex).

Usage:
  - Deploy the mcp/ folder from https://github.com/htafolla/chrono-warp-drive/tree/feat/v4.8-mcp-vercel
    to Vercel (it uses Hono + serverless).
  - Get your Vercel URL, e.g. https://blurrn-mcp-abc123.vercel.app
  - Then:

    from blurrn_mcp_connector import BlurrnMCPConnector
    conn = BlurrnMCPConnector("https://YOUR-VERCEL-URL.vercel.app")
    result = conn.call_tool("compute_tdf", {"T_c": 137, "P_s": 1.0, "E_t": 1.0, "delta_t": 1e-6, "voids": 3, "bhs_n": 3})
    print(result)

It also supports discovery and can be extended to full MCP protocol (JSON-RPC over HTTP/SSE).

For general-purpose MCP:
- This serves as the first use-case (Blurrn physics tools).
- For broader use, evolve to a full MCPClient that auto-discovers via initialize/listTools
  and supports stdio, SSE, or stateless HTTP transports (as per Vercel mcp-handler and Anthropic MCP spec).
- Recommend updating the server to use official @vercel/mcp-adapter for native MCP compatibility
  so any MCP client (Claude, Cursor, Warp, future Grok) can connect without custom code.
"""

import json
import urllib.request
import urllib.error
from typing import Any, Dict, Optional, List
from urllib.parse import urljoin


class MCPConnector:
    """General-purpose connector for custom REST-style MCP servers (like Blurrn).

    Assumes tools are exposed as POST /tool_name with JSON body,
    and root (/) or /health returns discovery info like {"name": "...", "tools": N, "endpoints": {...}}.
    """

    def __init__(self, base_url: str, timeout: int = 30):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.discovered_tools: Dict[str, Dict] = {}
        self._session_headers = {"Content-Type": "application/json", "User-Agent": "Grok-MCP-Connector/1.0"}

    def discover(self) -> Dict[str, Any]:
        """Fetch tool list and metadata from server root or /health."""
        try:
            url = f"{self.base_url}/"
            req = urllib.request.Request(url, headers=self._session_headers)
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode())
                if "endpoints" in data or "tools" in data:
                    self.discovered_tools = data
                return data
        except Exception as e:
            return {"error": str(e), "suggestion": "Try /health or check if server is deployed correctly."}

    def call_tool(self, tool_name: str, params: Dict[str, Any] = None, use_form: bool = False) -> Dict[str, Any]:
        """Call a specific tool endpoint.

        - tool_name: e.g. "compute_tdf", "emit_isotopic_signal", "black_hole_sequence"
        - params: dict matching the Zod schema in the server
        - use_form: if True, sends as application/x-www-form-urlencoded instead of JSON (for form-like POSTs)
        """
        if params is None:
            params = {}

        endpoint = f"/{tool_name.lstrip('/')}"
        url = urljoin(self.base_url + "/", endpoint.lstrip("/"))

        try:
            if use_form:
                import urllib.parse
                data = urllib.parse.urlencode(params).encode()
                req = urllib.request.Request(url, data=data, headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    **self._session_headers
                })
            else:
                data = json.dumps(params).encode()
                req = urllib.request.Request(url, data=data, headers=self._session_headers)

            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                result = json.loads(resp.read().decode())
                return result
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else str(e)
            return {"success": False, "error": f"HTTP {e.code}", "details": error_body}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def list_tools(self) -> List[str]:
        """Return list of available tool names from discovery."""
        if not self.discovered_tools:
            self.discover()
        endpoints = self.discovered_tools.get("endpoints", {})
        post_tools = endpoints.get("POST", [])
        return [t.lstrip("/") for t in post_tools if t]

    def call_and_summarize(self, tool_name: str, params: Dict[str, Any] = None) -> str:
        """Call tool and provide a human-readable summary of results."""
        result = self.call_tool(tool_name, params)
        if not result.get("success", True):
            return f"Error calling {tool_name}: {result.get('error')}"

        if tool_name == "compute_tdf":
            tdf = result.get("tdfValue", result.get("tdf", "N/A"))
            return f"TDF = {tdf:.4e} (tPTT={result.get('tPTT')}, BHS={result.get('BlackHole_Seq')})"
        elif tool_name == "emit_isotopic_signal":
            return f"Emitted signal {result.get('signalId')} with isotopicRatio={result.get('isotopicRatio', 0):.4f}, phaseCoherence={result.get('phaseCoherence', 0):.4f}"
        elif tool_name == "black_hole_sequence":
            val = result.get("BlackHole_Seq", result.get("value", "N/A"))
            return f"Black hole sequence value: {val}"
        else:
            body = json.dumps(result, indent=2)
            return body[:500] + "..." if len(body) > 500 else body


class BlurrnMCPConnector(MCPConnector):
    """Specialized connector for the Blurrn (chrono-warp-drive) v4.8 MCP server.

    Pre-configured with common tool examples and Blurrn-specific helpers.
    Note: server defaults are T_c=137, P_s=1.0, E_t=0.5, delta_t=1e-6, voids=7, bhs_n=3.
    """

    def __init__(self, base_url: str = "https://mcp-cyan-six.vercel.app"):
        super().__init__(base_url)
        self.default_tdf_params = {
            "T_c": 137, "P_s": 1.0, "E_t": 0.5, "delta_t": 1e-6, "voids": 7, "bhs_n": 3
        }

    def compute_tdf(self, **kwargs) -> Dict:
        params = {**self.default_tdf_params, **kwargs}
        return self.call_tool("compute_tdf", params)

    def emit_isotopic_signal(self, content: str, tdf: Optional[float] = None, **kwargs) -> Dict:
        params = {"content": content}
        if tdf:
            params["tdf"] = tdf
        params.update(kwargs)
        return self.call_tool("emit_isotopic_signal", params)

    def black_hole_sequence(self, voids: int = 7, n: int = 3) -> Dict:
        return self.call_tool("black_hole_sequence", {"voids": voids, "n": n})

    def harmonic_oscillator(self, t: float = 0.0) -> Dict:
        return self.call_tool("harmonic_oscillator", {"t": t})

    def kuramoto_sync(self, **params) -> Dict:
        return self.call_tool("kuramoto_sync", params)

    def get_phase_coherence(self, signalId: str) -> Dict:
        return self.call_tool("get_phase_coherence", {"signalId": signalId})


# Example usage / quick test (run locally)
if __name__ == "__main__":
    BASE = "https://mcp-cyan-six.vercel.app"

    print("=== Blurrn MCP Connector Demo ===")
    conn = BlurrnMCPConnector(BASE)

    print("\n1. Discovery:")
    disc = conn.discover()
    print(json.dumps(disc, indent=2)[:800])

    print("\n2. List tools:")
    tools = conn.list_tools()
    print(tools)

    print("\n3. Example: compute_tdf")
    tdf_result = conn.compute_tdf()
    print(tdf_result)

    print("\n4. Example: emit_isotopic_signal + summarize")
    emit = conn.emit_isotopic_signal("test temporal vortex signal")
    print(emit)
    summary = conn.call_and_summarize("emit_isotopic_signal", {"content": "test temporal vortex signal"})
    print("Summary:", summary)

    print("\n5. Example: black_hole_sequence via GET")
    import urllib.request as ureq
    bhs_url = f"{BASE}/black_hole_sequence?voids=5&n=4"
    with ureq.urlopen(bhs_url) as resp:
        print(json.loads(resp.read().decode()))

    print("\nConnector ready. Use in your Grok workflows or scripts!")
