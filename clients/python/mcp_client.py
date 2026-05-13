#!/usr/bin/env python3
"""
General-purpose MCP Client — supports standard MCP JSON-RPC + custom REST fallback.

Designed for sandboxed AI environments (grok.com, etc.) that need to call MCP
servers but can't make outbound POSTs directly. The connector handles transport.

Supports:
  - Standard MCP JSON-RPC over HTTP (tools/list, tools/call, initialize, etc.)
  - Custom REST-style MCP servers (POST /tool_name, discovery via / or /health)
  - GET query-param fallback for sandbox-friendly read-only tools
  - SSE streaming (basic)
  - Auto-detection of server protocol

Usage:
    from mcp_client import MCPClient

    # Auto-detect protocol
    client = MCPClient("https://my-mcp-server.vercel.app")
    tools = client.list_tools()
    result = client.call_tool("my_tool", {"param": "value"})

    # Or specify protocol
    client = MCPClient("...", protocol="standard")  # JSON-RPC
    client = MCPClient("...", protocol="rest")      # custom REST-style

    # Read-only tools via GET (no POST needed)
    result = client.call_tool("compute_tdf", {"T_c": 137}, force_get=True)

Blurrn specialization:

    from mcp_client import BlurrnMCP
    b = BlurrnMCP()
    b.compute_tdf(T_c=200, voids=5)
    b.emit_isotopic_signal("test signal")
"""

import json
import urllib.request
import urllib.error
from typing import Any, Dict, Optional, List, Union
from urllib.parse import urljoin, urlencode


# =============================================================================
# General-purpose MCP Client
# =============================================================================

class MCPClient:
    """Universal MCP client supporting standard JSON-RPC and custom REST transports.

    Protocol auto-detection:
      1. Try standard MCP initialize (JSON-RPC POST)
      2. If that fails, try REST-style discovery (GET / or /health)
      3. Fall back to explicit protocol setting
    """

    PROTOCOL_STANDARD = "standard"   # JSON-RPC 2.0 over HTTP
    PROTOCOL_REST    = "rest"        # Custom REST-style (POST /tool_name)
    PROTOCOL_AUTO    = "auto"        # Try standard first, fall back to rest

    def __init__(self, base_url: str, protocol: str = PROTOCOL_AUTO, timeout: int = 30):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.protocol = protocol
        self._detected_protocol: Optional[str] = None
        self._tool_cache: List[Dict[str, Any]] = []
        self._server_info: Dict[str, Any] = {}
        self._rpc_id = 0
        self._headers = {"Content-Type": "application/json", "User-Agent": "MCPClient/1.0"}

    # ---- JSON-RPC helpers ----

    def _next_id(self) -> int:
        self._rpc_id += 1
        return self._rpc_id

    def _rpc_request(self, method: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Send a JSON-RPC 2.0 request."""
        if params is None:
            params = {}
        body = json.dumps({
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": method,
            "params": params,
        }).encode()
        req = urllib.request.Request(self.base_url, data=body, headers=self._headers)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else str(e)
            return {"jsonrpc": "2.0", "id": None, "error": {"code": e.code, "message": str(e), "data": error_body}}
        except Exception as e:
            return {"jsonrpc": "2.0", "id": None, "error": {"code": -1, "message": str(e)}}

    # ---- REST-style helpers ----

    def _rest_get(self, path: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """GET request with query params — works in sandboxes without POST."""
        url = urljoin(self.base_url + "/", path.lstrip("/"))
        if params:
            # Convert lists/objects to JSON strings for URL params
            flat = {}
            for k, v in params.items():
                if isinstance(v, (list, dict)):
                    flat[k] = json.dumps(v)
                else:
                    flat[k] = v
            url += "?" + urlencode(flat)
        req = urllib.request.Request(url, headers=self._headers)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _rest_post(self, path: str, params: Dict[str, Any] = None, use_form: bool = False) -> Dict[str, Any]:
        """POST request to a custom REST endpoint."""
        if params is None:
            params = {}
        url = urljoin(self.base_url + "/", path.lstrip("/"))
        try:
            if use_form:
                data = urlencode(params).encode()
                headers = {"Content-Type": "application/x-www-form-urlencoded", **self._headers}
            else:
                data = json.dumps(params).encode()
                headers = self._headers
            req = urllib.request.Request(url, data=data, headers=headers)
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else str(e)
            return {"success": False, "error": f"HTTP {e.code}", "details": error_body}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ---- Protocol detection ----

    def _detect(self) -> str:
        """Auto-detect whether the server speaks standard MCP JSON-RPC or custom REST."""
        # Try standard MCP initialize
        init = self._rpc_request("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "MCPClient", "version": "1.0"},
        })
        if "result" in init and init.get("result", {}).get("protocolVersion"):
            self._detected_protocol = self.PROTOCOL_STANDARD
            self._server_info = init["result"]
            return self._detected_protocol

        # Fall back to REST-style discovery
        try:
            disc = self._rest_get("/")
            if disc.get("endpoints") or disc.get("tools") or disc.get("name"):
                self._detected_protocol = self.PROTOCOL_REST
                self._server_info = disc
                return self._detected_protocol
        except Exception:
            pass

        try:
            health = self._rest_get("/health")
            if health.get("status") == "ok" or health.get("tools"):
                self._detected_protocol = self.PROTOCOL_REST
                self._server_info = health
                return self._detected_protocol
        except Exception:
            pass

        # Give up — use explicit setting or default to rest
        self._detected_protocol = self.PROTOCOL_REST
        return self._detected_protocol

    def _ensure_detected(self):
        if self._detected_protocol is None:
            if self.protocol == self.PROTOCOL_AUTO:
                self._detect()
            else:
                self._detected_protocol = self.protocol

    # ---- Public API ----

    def discover(self) -> Dict[str, Any]:
        """Fetch server metadata and available tools. Returns server info dict."""
        self._ensure_detected()
        if self._detected_protocol == self.PROTOCOL_STANDARD:
            resp = self._rpc_request("tools/list")
            if "result" in resp:
                self._tool_cache = resp["result"].get("tools", [])
            return self._server_info
        else:
            # REST — already fetched discovery in _detect(), but re-fetch for freshness
            disc = self._rest_get("/")
            if disc.get("endpoints") or disc.get("tools"):
                self._server_info = disc
            return self._server_info

    def list_tools(self) -> List[Dict[str, Any]]:
        """Return list of available tools with their schemas."""
        self._ensure_detected()
        if self._detected_protocol == self.PROTOCOL_STANDARD:
            resp = self._rpc_request("tools/list")
            if "result" in resp:
                self._tool_cache = resp["result"].get("tools", [])
            return self._tool_cache
        else:
            # REST — discover and parse endpoint list
            disc = self.discover()
            endpoints = disc.get("endpoints", {})
            post_tools = endpoints.get("POST", [])
            tools_info = []
            for t in post_tools:
                name = t.lstrip("/")
                tools_info.append(self._describe_tool_rest(name))
            return tools_info

    @staticmethod
    def _describe_tool_rest(name: str) -> Dict[str, Any]:
        """Build a tool descriptor for a REST endpoint (static, no probing)."""
        return {"name": name, "description": f"Tool: {name}", "inputSchema": {"type": "object", "properties": {}}}

    def call_tool(self, tool_name: str, params: Dict[str, Any] = None,
                  use_form: bool = False, force_get: bool = False) -> Dict[str, Any]:
        """Call a tool. Auto-selects transport based on detected protocol.

        Args:
            tool_name: Tool name (e.g. "compute_tdf")
            params: Tool arguments
            use_form: Send as form-urlencoded instead of JSON (REST only)
            force_get: Use GET with query params (bypasses POST, sandbox-friendly)
        """
        if params is None:
            params = {}
        self._ensure_detected()

        if force_get:
            return self._rest_get(f"/{tool_name.lstrip('/')}", params)

        if self._detected_protocol == self.PROTOCOL_STANDARD:
            resp = self._rpc_request("tools/call", {"name": tool_name, "arguments": params})
            if "result" in resp:
                content = resp["result"].get("content", [])
                is_error = resp["result"].get("isError", False)
                # Extract text from MCP content blocks
                if isinstance(content, list):
                    texts = [c["text"] for c in content if c.get("type") == "text"]
                    parsed = [json.loads(t) for t in texts if self._is_json(t)]
                    return {"success": not is_error, "content": texts, "parsed": parsed} if parsed else {"success": not is_error, "content": texts}
                return {"success": not is_error, "raw": resp["result"]}
            error = resp.get("error", {})
            return {"success": False, "error": error.get("message", str(error))}
        else:
            return self._rest_post(f"/{tool_name.lstrip('/')}", params, use_form)

    @staticmethod
    def _is_json(s: str) -> bool:
        try:
            json.loads(s)
            return True
        except (json.JSONDecodeError, TypeError):
            return False

    def ping(self) -> bool:
        """Check if the server is reachable."""
        self._ensure_detected()
        if self._detected_protocol == self.PROTOCOL_STANDARD:
            resp = self._rpc_request("ping")
            return "result" in resp
        else:
            try:
                health = self._rest_get("/health")
                return health.get("status") == "ok"
            except Exception:
                return False

    def call_and_summarize(self, tool_name: str, params: Dict[str, Any] = None) -> str:
        """Call a tool and return a human-readable summary string."""
        result = self.call_tool(tool_name, params)
        if isinstance(result, dict):
            if not result.get("success", True if "result" not in str(result.get("error", "")) else False):
                return f"Error calling {tool_name}: {result.get('error')}"
            body = json.dumps(result, indent=2)
            return body[:500] + "..." if len(body) > 500 else body
        return str(result)


# =============================================================================
# Blurrn (chrono-warp-drive) v4.8 Specialization
# =============================================================================

class BlurrnMCP(MCPClient):
    """Specialized client for the Blurrn Temporal Phase Transport MCP server.

    Pre-wired with Blurrn's v4.8 defaults and domain-specific helpers.
    Server defaults: T_c=137, P_s=1.0, E_t=0.5, delta_t=1e-6, voids=7, bhs_n=3
    """

    def __init__(self, base_url: str = "https://mcp-cyan-six.vercel.app", **kwargs):
        super().__init__(base_url, protocol=kwargs.pop("protocol", MCPClient.PROTOCOL_REST), **kwargs)
        self.default_tdf_params = {
            "T_c": 137, "P_s": 1.0, "E_t": 0.5, "delta_t": 1e-6, "voids": 7, "bhs_n": 3,
        }

    # ---- Convenience methods ----

    def compute_tdf(self, **kwargs) -> Dict[str, Any]:
        """Compute TDF = tPTT * TAU * (1 / BlackHole_Seq)."""
        return self.call_tool("compute_tdf", {**self.default_tdf_params, **kwargs})

    def emit_isotopic_signal(self, content: str, tdf: Optional[float] = None, **kwargs) -> Dict[str, Any]:
        """Emit and store an isotopic signal."""
        params = {"content": content}
        if tdf is not None: params["tdf"] = tdf
        params.update(kwargs)
        return self.call_tool("emit_isotopic_signal", params)

    def cross_correlate(self, contentA: str, contentB: Optional[str] = None) -> Dict[str, Any]:
        """Cross-correlate two signals."""
        params = {"contentA": contentA}
        if contentB: params["contentB"] = contentB
        return self.call_tool("cross_correlate", params)

    def black_hole_sequence(self, voids: int = 7, n: int = 3, force_get: bool = True) -> Dict[str, Any]:
        """Compute BlackHole_Seq = (L * voids * PHI^n) % PI."""
        return self.call_tool("black_hole_sequence", {"voids": voids, "n": n}, force_get=force_get)

    def kuramoto_sync(self, phases: List[float], frequencies: List[float], **kwargs) -> Dict[str, Any]:
        """Kuramoto phase synchronization."""
        params = {"phases": phases, "frequencies": frequencies, **kwargs}
        return self.call_tool("kuramoto_sync", params)

    def harmonic_oscillator(self, t: float = 0.0, force_get: bool = True) -> Dict[str, Any]:
        """P_o = sin(2pi * 528 * t + pi / PHI)."""
        return self.call_tool("harmonic_oscillator", {"t": t}, force_get=force_get)

    def get_phase_coherence(self, signalId: str) -> Dict[str, Any]:
        """Get phase coherence of a stored signal."""
        return self.call_tool("get_phase_coherence", {"signalId": signalId})

    def compute_tptt(self, T_c: float = 137, P_s: float = 1.0, E_t: float = 0.5,
                     delta_t: float = 1e-6, force_get: bool = True) -> Dict[str, Any]:
        """Standalone tPTT = T_c * (P_s / E_t) * PHI * (C / delta_t)."""
        return self.call_tool("compute_tptt", {"T_c": T_c, "P_s": P_s, "E_t": E_t, "delta_t": delta_t}, force_get=force_get)

    def wave_function(self, x: float = 1.0, t: float = 0.0, n: int = 1,
                      isotope: str = "C-12", lambda_: float = 0.530, phase_type: str = "push") -> Dict[str, Any]:
        """Compute wave amplitude with isotope modulation."""
        return self.call_tool("wave_function", {"x": x, "t": t, "n": n, "isotope": isotope, "lambda": lambda_, "phaseType": phase_type})

    def list_isotopes(self, force_get: bool = True) -> Dict[str, Any]:
        """List all available isotopes (standard + Blurrn)."""
        return self.call_tool("list_isotopes", {}, force_get=force_get)

    def validate_tlm(self, phi: float = 1.666, force_get: bool = True) -> Dict[str, Any]:
        """Validate Trinitarium ratio is in [1.566, 1.766]."""
        return self.call_tool("validate_tlm", {"phi": phi}, force_get=force_get)

    def triangulate_signals(self, signals: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Triangulate multiple signals."""
        return self.call_tool("triangulate_signals", {"signals": signals})

    def fuse_symbiotic(self, partners: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Fuse signals symbiotically (not aggregation)."""
        return self.call_tool("fuse_symbiotic", {"partners": partners})

    def optimize_cascade(self, n: int = 100, delta_phase: float = 0.1) -> Dict[str, Any]:
        """Optimize cascade iteration."""
        return self.call_tool("optimize_cascade", {"n": n, "deltaPhase": delta_phase})


# =============================================================================
# Demo / Quick Test
# =============================================================================
if __name__ == "__main__":
    import sys

    BASE = sys.argv[1] if len(sys.argv) > 1 else "https://mcp-cyan-six.vercel.app"
    print(f"=== MCP Client Demo: {BASE} ===\n")

    # General-purpose usage
    print(">>> General MCPClient (auto-detect)")
    client = MCPClient(BASE)
    print("  Protocol detected:", client._detected_protocol or "pending")
    print(f"  Server info: {json.dumps(client.discover(), indent=2)[:300]}")
    print(f"  Ping: {client.ping()}")
    tools = client.list_tools()
    print(f"  Tools ({len(tools)}): {[t['name'] for t in tools[:5]]}...\n")

    # Blurrn-specific usage
    print(">>> BlurrnMCP (with helpers)")
    b = BlurrnMCP(BASE)
    print(f"  compute_tdf: {json.dumps(b.compute_tdf(), indent=2)[:200]}")
    print(f"  black_hole_sequence: {b.black_hole_sequence()}")
    print(f"  harmonic_oscillator: {b.harmonic_oscillator(0.001)}")
    print(f"  validate_tlm: {b.validate_tlm()}")
    print(f"  list_isotopes: {len(b.list_isotopes().get('isotopes', []))} isotopes\n")

    print("Connector ready for grok.com and general MCP use.")
