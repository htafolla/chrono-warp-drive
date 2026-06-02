# 0xRay Agents

Quick reference for 0xRay AI orchestration framework.

## What is 0xRay?

0xRay provides intelligent multi-agent orchestration with automatic delegation and Codex compliance validation. Agents operate via OpenCode plugin injection - no manual setup needed.

## How 0xRay Works

0xRay provides intelligent multi-agent orchestration with automatic delegation and Codex compliance validation. Agents operate via OpenCode plugin injection - no manual setup needed.

### Basic Operation

1. **Install**: Run `npx strray-ai install` to configure agents in your project
2. **Invoke**: Use `@agent-name` syntax in prompts or code comments (e.g., `@architect design this API`)
3. **Automatic Routing**: 0xRay automatically routes tasks to the appropriate agent based on complexity
4. **Agent Modes**: Agents can be `primary` (main coordinator) or `subagent` (specialized helper)

### Where to Find Reflections

Deep reflection documents capture development journeys and lessons learned:
- **Location**: `docs/reflections/` (main) and `docs/reflections/deep/` (detailed)
- **Examples**: `kernel-v2.0-skill-system-fix-journey.md`, `typescript-build-fix-journey-2026-03-09.md`, `stringray-framework-deep-reflection-v1.4.21.md`

These documents capture:
- Technical challenges encountered and solved
- Architectural decisions made
- Lessons learned for future development
- Best practices established

### File Organization Guidelines

**IMPORTANT**: Save all generated files to their proper directories. Do NOT save to root.

| File Type | Save To | Example |
|-----------|---------|---------|
| **Reflections** | `docs/reflections/` or `docs/reflections/deep/` | `docs/reflections/my-fix-reflection.md` |
| **Logs** | `logs/` | `logs/framework/activity.log` |
| **Scripts** | `scripts/` or `scripts/bash/` | `scripts/bash/my-script.sh` |
| **Test Files** | `src/__tests__/` | `src/__tests__/unit/my-test.test.ts` |
| **Source Code** | `src/` | `src/my-module.ts` |
| **Config** | `config/` or `.opencode/strray/` | `.opencode/strray/config.json` |

**Never save to root** - Root directory is for essential files only:
- `README.md`, `CHANGELOG.md`, `package.json`, `tsconfig.json`

### Logging Guidelines

**IMPORTANT**: Never use `console.log`, `console.warn`, or `console.error`. Use the framework logger instead.

| Use This | Not This |
|----------|-----------|
| `frameworkLogger.log(module, event, 'info', { data })` | `console.log()` |
| `frameworkLogger.log(module, event, 'error', { error })` | `console.error()` |
| `frameworkLogger.log(module, event, 'warning', { warning })` | `console.warn()` |

**Why**: Console statements bleed through to OpenCode console and create noise. Framework logger is structured and filtered.

**Example**:
```typescript
// WRONG ❌
console.log("Starting process");

// CORRECT ✅
import { frameworkLogger } from "../core/framework-logger.js";
frameworkLogger.log("my-module", "process-start", "info", { message: "Starting process" });
```

Reflection Template Paths

0xRay uses **two reflection folders** for different purposes:

#### Option 1: Standard Reflections (`docs/reflections/`)
**When to use:** Single-session work, specific bug fixes, targeted implementations
- **Template:** `docs/reflections/TEMPLATE.md` (442 lines)
- **Naming:** `{topic}-reflection.md` or `{topic}-YYYY-MM-DD.md`
- **Length:** 1,000-5,000 lines
- **Format:** 11 structured sections (Executive Summary, Dichotomy, Counterfactual, etc.)

**Examples:**
- `docs/reflections/deployment-crisis-v12x-reflection.md`
- `docs/reflections/kernel-confidence-fix.md`

#### Option 2: Deep Reflections (`docs/reflections/deep/`)
**When to use:** Multi-session journeys, complex investigations, architectural transformations
- **Template:** `docs/reflections/deep/TEMPLATE.md` (NEW - 300 lines)
- **Naming:** `{topic}-journey-YYYY-MM-DD.md` or `DEEP_REFLECTION_{topic}.md`
- **Length:** 10,000+ lines
- **Format:** Narrative journey with session chronology, investigation narrative, technical deep dives

**Examples:**
- `docs/reflections/deep/kernel-journey-2026-03-09.md`
- `docs/reflections/deep/AGENTS-consumer-documentation-strategy-journey-2026-03-09.md`

#### Quick Decision Guide

| Scenario | Use |
|----------|------|
| Fixed a bug in one session | `docs/reflections/` |
| Investigated something complex over multiple days | `docs/reflections/deep/` |
| Single architectural change | `docs/reflections/` |
| System-wide transformation | `docs/reflections/deep/` |
| Quick learning/insight | `docs/reflections/` |
| Deep investigation with many discoveries | `docs/reflections/deep/` |

### Storyteller Skill (formerly @storyteller agent)

The storyteller is now a **skill** (not an agent) so it runs with full session context. Invoke it by asking for a reflection/narrative in your current session:

| Type | Description | Template Path | How to Invoke |
|------|-------------|---------------|---------------|
| `reflection` | Technical deep reflections on development process | `docs/reflections/TEMPLATE.md` | "write a reflection about X" |
| `saga` | Long-form technical saga spanning multiple sessions | `docs/reflections/deep/SAGA_TEMPLATE.md` | "write a saga about X" |
| `journey` | Investigation/learning journey | `docs/reflections/JOURNEY_TEMPLATE.md` | "write a journey about X" |
| `narrative` | Technical narrative - telling the story of code | `docs/reflections/NARRATIVE_TEMPLATE.md` | "write a narrative about X" |
| `deep reflection` | Extended narrative with emotional journey | `docs/reflections/deep/TEMPLATE.md` | "write a deep reflection about X" |

**Why a skill?** As an agent, @storyteller spawned fresh with zero context and wasted tokens reconstructing what just happened. As a skill, it uses the conversation you are already in -- the LLM knows exactly what occurred.

## Available Agents

| Agent | Purpose | Invoke |
|-------|---------|--------|
| `@enforcer` | Codex compliance & error prevention | `@enforcer analyze this code` |
| `@orchestrator` | Complex multi-step task coordination | `@orchestrator implement feature` |
| `@architect` | System design & technical decisions | `@architect design API` |
| `@security-auditor` | Vulnerability detection | `@security-auditor scan` |
| `@code-reviewer` | Quality assessment | `@code-reviewer review PR` |
| `@refactorer` | Technical debt elimination | `@refactorer optimize code` |
| `@testing-lead` | Testing strategy | `@testing-lead plan tests` |
| `@bug-triage-specialist` | Error investigation | `@bug-triage-specialist debug error` |
| `@researcher` | Codebase exploration | `@researcher find implementation` |


## Available Skills

0xRay ships with 30 framework skills and provides a registry of 10 curated community sources.

**Manage skills:**
```bash
npx strray-ai skill:install              # Show starter packs + available sources
npx strray-ai skill:install <name>       # Install from registry
npx strray-ai skill:registry list        # Show all registry sources
npx strray-ai antigravity status         # Show installed skills
```

**License files:** `licenses/skills/LICENSE.<source-name>`

## Complexity Routing

0xRay automatically routes tasks based on complexity:

- **Simple (≤15)**: Single agent
- **Moderate (≤25)**: Single agent with tools
- **Complex (≤50)**: Multi-agent coordination  
- **Enterprise (>50)**: Orchestrator-led team

## CLI Commands

```bash
npx strray-ai install       # Install and configure
npx strray-ai status       # Check configuration
npx strray-ai health        # Health check
npx strray-ai validate      # Validate installation
npx strray-ai capabilities # Show all features
npx strray-ai report        # Generate reports
npx strray-ai analytics    # Pattern analytics
npx strray-ai calibrate    # Calibrate complexity
npm run test:pipelines     # Pipeline integration tests
```

## Features.json Configuration

0xRay uses `.opencode/strray/features.json` for feature flags and settings:

### Location
- **Path**: `.opencode/strray/features.json`
- **Consumer Path**: When installed as npm package, loaded from `node_modules/strray-ai/.opencode/strray/features.json`

### Key Features
- `token_optimization` - Context token management
- `model_routing` - AI model routing
- `batch_operations` - File batch processing
- `multi_agent_orchestration` - Agent coordination
- `autonomous_reporting` - Automatic reporting
- `activity_logging` - Activity logging configuration
- `security` - Security settings
- `performance_monitoring` - Performance tracking

### Modifying Features
To modify features in consumer installations:
```bash
# View current features
cat .opencode/strray/features.json

# Set feature via CLI
npx strray-ai config set --feature token_optimization.enabled --value false
```

### .opencode/strray Directory

The `.opencode/strray/` directory contains core framework configuration:

| File | Purpose |
|------|---------|
| `codex.json` | Universal Development Codex (60 error prevention terms) |
| `features.json` | Feature flags and settings |
| `config.json` | Framework configuration |
| `agents_template.md` | Agent architecture templates |
| `routing-mappings.json` | Agent routing configurations |
| `workflow_state.json` | Runtime workflow state |

## Agent Discovery & Capabilities

### First-Time Agent Context

When agents are first spawned:
- **Zero Context**: Agents start with minimal initial context
- **Discovery Happens**: Agents discover available tools through MCP servers
- **State Builds**: Over time, agents build comprehensive knowledge graph

### Static vs Dynamic Discovery

**Static Discovery** (Immediate):
- Source: `.opencode/agents/` directory
- Speed: Fast - scans local directory
- Scope: Only locally configured agents

**Dynamic Discovery** (After Startup):
- Source: MCP Protocol via `mcp-client.ts`
- Process: Loads config → Connects to servers → Lists tools → Makes available
- Scope: Full agent capabilities with MCP server tools

### Access & Permissions Pipeline

**Load Priority**:
1. Development: `node_modules/strray-ai/dist/` (most current)
2. Consumer: Falls back to `dist/` directory
3. Configuration: `.opencode/strray/features.json`

**Spawn Authorization**:
- Only main orchestrator can spawn agents
- Subagents cannot spawn other agents
- Workers cannot spawn agents directly

## Activity Log & Reporting

### Activity Logging

**Location**: `.opencode/logs/` directory
- **File Format**: `strray-plugin-YYYY-MM-DD.log`
- **Enabled by**: `activity_logging` feature in features.json

### Report Generation

**CLI Command**:
```bash
# Generate daily report
npx strray-ai report --daily

# Generate performance report
npx strray-ai report --performance

# Generate compliance report
npx strray-ai report --compliance
```

**Report Types**:
- Daily reports: Agent invocations, task completions
- Performance reports: Response times, resource usage
- Compliance reports: Codex violations, agent performance

## Skill Scripts & Agent Registry

### Agent Registry

**Location**: `scripts/node/agent-registry.js`
- **Purpose**: Register new custom agents
- **Usage**: Add to `.opencode/agents/` and auto-discovered

### Custom Skills

**Adding Custom Agents**:
1. Create skill file in `.opencode/agents/`
2. Export handler function
3. Auto-available to agents

**Example**:
```javascript
// .opencode/agents/my-custom-skill.js
module.exports = async (context, tool) => {
  return { result: "Skill executed", data: {} };
};
```

## Codex

0xRay enforces Universal Development Codex (60 terms) for systematic error prevention. See [.opencode/strray/codex.json](.opencode/strray/codex.json) for full reference.

## Configuration Files Reference

0xRay uses multiple configuration files to control behavior:

### Main Configuration Files

| File | Purpose | Key Settings |
|------|---------|--------------|
| `.opencode/opencode.json` | Main framework config | mode, plugins, paths |
| `.opencode/strray/features.json` | Feature flags | enabled/disabled features |
| `.opencode/agents/` | Custom agent configs | agent-specific settings |
| `.opencode/strray/codex.json` | Codex terms | 60 error prevention rules |

### Configuration Hierarchy

```
1. .opencode/opencode.json           # Highest priority - project overrides
2. .opencode/strray/features.json    # Feature flags
3. node_modules/strray-ai/.opencode/ # Package defaults (lowest)
```

### Environment Variables

```bash
# Optional overrides
STRRAY_MODE=development              # or 'consumer'
STRRAY_LOG_LEVEL=info              # debug, info, warn, error
STRRAY_CONFIG_PATH=.opencode/      # Custom config directory
STRRAY_NO_TELEMETRY=1              # Disable analytics
```

## Integration Points

### Git Hooks Integration

0xRay integrates with Git hooks for automated validation:

```bash
# Install Git hooks
npx strray-ai install --hooks

# Hooks available:
# - pre-commit: TypeScript check, linting, Codex validation
# - post-commit: Activity logging, analytics
# - pre-push: Full validation suite
```

**Manual Hook Setup** (if not using --hooks):
```bash
# .git/hooks/pre-commit
#!/bin/bash
npx strray-ai validate --pre-commit

# .git/hooks/post-commit  
#!/bin/bash
npx strray-ai report --auto
```

### CI/CD Pipeline Integration

**GitHub Actions Example**:
```yaml
- name: 0xRay Validation
  run: |
    npx strray-ai validate
    npx strray-ai report --ci
```

**GitLab CI Example**:
```yaml
strray-validate:
  script:
    - npx strray-ai validate
    - npx strray-ai report --ci
```

### MCP Server Configuration

MCP (Model Context Protocol) servers extend agent capabilities:

```bash
# List available MCP servers
npx strray-ai capabilities --mcp

# MCP server types:
# - knowledge-skills/     # Domain-specific skills
# - framework-help.server.ts # Framework utilities
# - orchestrator.server.ts  # Task orchestration
```

### Marketplace Plugin Installation

```bash
# Search for plugins
npx strray-ai marketplace search <keyword>

# Install plugin
npx strray-ai marketplace install <plugin-name>

# List installed plugins
npx strray-ai marketplace list
```

## Tuning & Optimization

### Complexity Calibration

0xRay uses complexity scoring to route tasks to appropriate agents:

```bash
# Calibrate complexity scoring
npx strray-ai calibrate

# View current complexity settings
cat .opencode/strray/features.json | jq '.complexity'
```

**Complexity Factors**:
- File count and size
- Import dependencies
- Test coverage percentage
- Code duplication
- Architectural patterns

### Performance Tuning

**Memory Management**:
```bash
# View memory settings
cat .opencode/strray/features.json | jq '.memory'

# Key settings:
# - memory_threshold_mb: Emergency cleanup trigger (default: 80MB)
# - gc_interval_ms: Garbage collection frequency
# - cache_size: Agent state cache limit
```

**Token Optimization**:
```bash
# Configure token limits
npx strray-ai config set --feature token_optimization.max_context_tokens --value 8000
npx strray-ai config set --feature token_optimization.compression_enabled --value true
```

### Agent Spawn Limits

Control how agents are spawned and coordinated:

```json
// In features.json
{
  "agent_spawn": {
    "max_concurrent": 8,
    "max_per_type": 3,
    "spawn_cooldown_ms": 500,
    "rate_limit_per_minute": 20
  }
}
```

## CLI Command Details

### Core Commands

| Command | Description | Common Use |
|---------|-------------|------------|
| `npx strray-ai install` | Install and configure framework | Initial setup |
| `npx strray-ai status` | Show current configuration status | Debug setup issues |
| `npx strray-ai health` | Run health check | Verify installation |
| `npx strray-ai validate` | Run full validation suite | Pre-commit validation |
| `npx strray-ai capabilities` | List all available features | Discover capabilities |
| `npx strray-ai calibrate` | Recalibrate complexity scoring | After major refactors |
| `npx strray-ai report` | Generate analytics reports | Review performance |
| `npx strray-ai analytics` | View pattern analytics | Understand agent behavior |
| `npx strray-ai config` | Manage configuration | Tune settings |

### Configuration Commands

```bash
# Get a specific config value
npx strray-ai config get --feature activity_logging.enabled

# Set a config value
npx strray-ai config set --feature token_optimization.enabled --value false

# Reset to defaults
npx strray-ai config reset

# Export current config
npx strray-ai config export > strray-config.json
```

### Report Commands

```bash
# Daily summary report
npx strray-ai report --daily

# Performance analysis
npx strray-ai report --performance

# Compliance report (Codex violations)
npx strray-ai report --compliance

# Session report
npx strray-ai report --session

# Generate CI-friendly report
npx strray-ai report --ci --output json
```

## Common Agent Workflows

### Invoking Agents

**Basic Invocation**:
```bash
# In code comment or prompt
@architect design a REST API for user management

@enforcer analyze this code for security issues

@testing-lead create tests for authentication module
```

**Chaining Agents**:
```
@orchestrator implement feature:user-authentication
  → Spawns @architect → @testing-lead → @code-reviewer
```

### Agent Selection Guide

| Task Type | Primary Agent | Supporting Agents |
|-----------|---------------|-------------------|
| New feature | @orchestrator | @architect, @testing-lead |
| Bug fix | @bug-triage-specialist | @enforcer, @code-reviewer |
| Refactor | @refactorer | @architect, @testing-lead |
| Security audit | @security-auditor | @enforcer |
| Code review | @code-reviewer | @enforcer |
| Research | @researcher | @architect |

### Session Management

**Start a Session**:
```bash
# Sessions are automatic - invoke agent to start
@orchestrator implement login feature
```

**View Active Sessions**:
```bash
# Active sessions shown in status
npx strray-ai status
```

**End a Session**:
```bash
# Sessions auto-end after inactivity timeout
# Or manually via:
npx strray-ai session end <session-id>
```

### Error Recovery

**Common Error Patterns**:

1. **Agent Spawn Failure**
   ```bash
   # Check spawn limits
   npx strray-ai status | grep -A5 "spawn"
   
   # Solution: Wait for cooldown or increase limit
   npx strray-ai config set --feature agent_spawn.max_concurrent --value 10
   ```

2. **Memory Exhaustion**
   ```bash
   # Check memory settings
   npx strray-ai health
   
   # Solution: Clear cache
   npx strray-ai session clear-cache
   ```

3. **Validation Failures**
   ```bash
   # Run detailed validation
   npx strray-ai validate --detailed
   
   # View specific failures
   npx strray-ai report --compliance --detailed
   ```

## Troubleshooting Guide

### Quick Diagnostics

```bash
# Full health check
npx strray-ai health

# Validate installation
npx strray-ai validate

# View recent activity
ls -la .opencode/logs/
cat .opencode/logs/strray-plugin-$(date +%Y-%m-%d).log | tail -50

# Check configuration
npx strray-ai status
```

### Common Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| Agents not spawning | Timeout on @invoke | Run `npx strray-ai health` |
| Validation failures | Pre-commit blocks | Run `npx strray-ai validate --fix` |
| Memory issues | Slow performance | `npx strray-ai session clear-cache` |
| Config not loading | Settings ignored | Check `.opencode/opencode.json` syntax |
| MCP servers unavailable | Tools missing | `npx strray-ai capabilities --mcp` |

### Getting Help

```bash
# Framework help
npx strray-ai help

# View capabilities
npx strray-ai capabilities

# Check version
npx strray-ai --version
```

## Framework Configuration Limits

### Consumer Environment Limitations

- **Features.json**: Automatically loaded from package, not project root
- **Codex Version**: Frozen at v1.7.5 in consumer mode (stable)
- **Plugin Behavior**: Reduced functionality in consumer mode:
  - No dynamic codex term enrichment
  - Fixed codex version
  - No MCP server discovery
  - No real-time tool discovery

### Development vs Consumer

| Aspect | Development | Consumer |
|--------|-----------|----------|
| Features | Full (latest) | Optimized (stable) |
| Codex | Latest terms | v1.7.5 fallback |
| Discovery | Dynamic (MCP) | Static only |
| Hot Reload | Yes | No |

## Documentation

- [Full Documentation](https://github.com/htafolla/stringray)
- [Guides](https://github.com/htafolla/stringray/tree/master/docs/guides)

---
**Version**: 1.22.60 | [GitHub](https://github.com/htafolla/stringray)

---

## Deployment Guide

### Service Map

| Service | Platform | Deploy From | Entry Point | URL |
|---------|----------|------------|-------------|-----|
| **dynamo-ui** (frontend) | Vercel | Repo root (`/`) | `vite build` → `dist/` | `dynamo-ui.vercel.app` |
| **neural-fusion-backend** | Railway | `mcp/` directory | `backend-server.ts` | `neural-fusion-backend-*.up.railway.app` |
| **mcp** (main MCP server) | Railway | `mcp/` directory | `server.ts` | `mcp-*.up.railway.app` |
| **stellar-mcp** | Railway | `mcp/` directory | `stellar-server.ts` | `stellar-mcp-*.up.railway.app` |

### Railway Deploy Procedure

All three Railway services share the same `mcp/` directory. To deploy:

```bash
# 1. Link to the desired service first
railway service link neural-fusion-backend   # Port 3001, entry: backend-server.ts
railway service link mcp                      # Port 3000, entry: server.ts
railway service link stellar-mcp              # Port 3001, entry: stellar-server.ts

# 2. Deploy from mcp/ directory (CRITICAL - must be mcp/, not root)
cd mcp && railway up
```

**Key rules:**
- **Always `cd mcp` before `railway up`** — deploying from the root builds the Vite frontend instead of the backend
- The `mcp/railway.toml` and `mcp/package.json` configure the build automatically
- `ENTRY_POINT` env var per service determines which server file to start
- `mcp/` is pre-linked in Railway config at `~/.railway/config.json`

### Vercel Deploy Procedure

```bash
# Frontend (dynamo-ui) — deploys from repo root
vercel --prod
```

**Key rules:**
- `.vercelignore` excludes `mcp/`, `.strray`, `.opencode`, `docs/reflections`, test files
- Only the Vite React app at root is deployed
- The `mcp/vercel.json` config is for Vercel-based MCP deployments (not currently used)

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Railway health returns HTML/Vite app | Deployed from root instead of `mcp/` | `cd mcp && railway up` |
| Build fails: `npm: command not found` | Deployed from root without Node.js runtime | Deploy from `mcp/` where `package.json` is detected |
| Railway health returns 404/error | Wrong `ENTRY_POINT` for the service | Check `railway variables` for the service |
| Vercel shows wrong app | Wrong branch/project linked | `vercel link` then `vercel --prod` |

---

## Dynamo Project State

Live services:
- **MCP backend**: `https://mcp-production-80e2.up.railway.app` (Railway, deploys from `mcp/`)
- **Frontend (dynamo-ui)**: `https://dynamo.rippel.ai` (Vercel, deploys from repo root)
- **Docusaurus docs**: `https://dynamo-docs.vercel.app` (Vercel, deploys from `documentation/`)

### Core Architecture

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Solar governance | `mcp/lib/solarGovernanceIntegration.ts`, `src/lib/` | 4D/5D resonance scoring, deltaDiff sync, Kuramoto phase coupling, adaptive thresholds |
| Codex TDF formula | `mcp/lib/vortexMath.ts`, `src/lib/` | `tPTT × TAU × 1/BHS` with mapping layer (T_c, P_s, E_t, delta_t, voids, bhs_n) |
| Kuramoto oscillators | `mcp/lib/kuramotoOscillators.ts`, `src/lib/` | N=3 model (K=0.5, φ_dark=π/6) replacing phaseAlignment, signalTiming, phaseCoherence |
| Solar data fetcher | `mcp/lib/solarDataFetcher.ts` | NOAA GOES ingestion (xray, kp, particles, magnetometer, solarWind) |
| Governance decisions | `mcp/lib/dynamoSolarGovernance.ts`, `src/lib/` | EnhancedGovernanceDecision, momentum/peak forecast, ring buffers, Redis-backed history |
| MCP entry | `mcp/index.ts` | 20 tools, POST /govern_with_solar, GET /public_feed, GET /history |
| NeuralFusion | (mcp TF.js) | `spectralQuality` feeds into governance as 5th dimension (10% weight) |

### Key Design Decisions

- **Formula**: 4D = proximity×0.20 + phase×0.20 + volume×0.30 + sync×0.30. 5D adds spectralQuality×0.10 with rebalance to 0.18/0.18/0.27/0.27.
- **Sync**: deltaDiff linear decay (not cascade-index lag). Verified 43-91% range.
- **Phase Alignment**: Kuramoto order parameter R from N=3 oscillator evolution. Verified 70-99% (was 13-24% noise floor).
- **Signal Timing**: Kuramoto phase ordering (not content-hash cascade comparison).
- **TDF normalization**: Fractional part of `rawTdf/1e9` (not integer `round()`). Reason: terrestrial inputs ~4e7-6e7 → integer round gives 0.
- **Mapping layer**: Character-level entropy, 100k FNV granularity for P_s, content-dependent bhs_n.
- **Vortex alignment**: Log-space ratio (protects small TDF proposals from 0.002 scores).
- **Spectral Lift (S_L)**: Skipped — all TDFs > 1e6, threshold crossing always true.
- **E_t_growth**: Skipped — introduces order-dependent bias.
- **Cascade indices**: Replaced with `tdfCascade()` derived from TDF fine structure (cross-correlation lag only).
- **Thresholds**: Adaptive by solar activity (quiet/moderate/active/storm). Storms require higher scores to PASS.
- **Momentum/peak forecast**: Display-only.
- **Redis**: Backed history (10,000 cap), graceful fallback to in-memory.
- **0xRay (was StringRay)**: User-facing name changed; CLI, npm, dir paths preserved.

### Relevant Files

- `mcp/lib/solarGovernanceIntegration.ts` — Solar hammer, 4D/5D formulas, Kuramoto wiring
- `src/lib/solarGovernanceIntegration.ts` — Frontend mirror
- `mcp/lib/kuramotoOscillators.ts` — Kuramoto N=3 coupling model (canonical)
- `src/lib/kuramotoOscillators.ts` — Frontend mirror
- `mcp/lib/vortexMath.ts` — Codex TDF formula, fractional-part normalization
- `src/lib/vortexMath.ts` — Frontend mirror
- `mcp/lib/dynamoSolarGovernance.ts` — EnhancedGovernanceDecision, adaptive thresholds, Redis
- `src/lib/dynamoSolarGovernance.ts` — Frontend mirror (no Redis)
- `mcp/lib/temporalBlurrnSignal.ts` — TDF cross-correlation
- `mcp/lib/wavePropagation.ts` — Phase 2 wave propagation layer (A/B alongside TDF formulas)
- `src/lib/wavePropagation.ts` — Frontend mirror
- `mcp/scripts/test-wave-propagation.ts` — Phase 2 A/B test harness
- `mcp/lib/solarDataFetcher.ts` — NOAA GOES ingestion
- `mcp/index.ts` — Tool definitions, HTTP routes
- `mcp/backend-server.ts` — Express entry point
- `src/components/DynamoDeploy.tsx` — UI, sequential neural→governance, wave score display
- `src/__tests__/mcp.test.ts` — 97 tests, all pass
- `docs/DYNAMO-CURRENT-STATE.md` — Authoritative current-state document
- `docs/governance/0xray-integration-guide.md` — 0xRay integration
- `documentation/docs/for-physicists.md` — Deep-dive docs (mapping tables, Kuramoto section, Phase 2 wave propagation)

### Known Gaps / Next Possible Work

- **Threshold recalibration**: Sync now correctly scores 62-95% (was ~9% noise), current quiet thresholds (0.82/0.72/0.58) may be too permissive.
- **Wave propagation calibration**: waveSynchronization drops to ~0.01 for non-identical proposals. The cos(θ₁−θ₀) metric and proximity scaling need tuning before wave scores can replace current formulas.
- **Hybrid model live**: vortexAlignment replaced with calibrated waveVortexAlignment (71% win rate on 35 real proposals). Monitored in production.
- **Dead vortexAlignment removed**: The old log-ratio magnitude formula (always 1.0 for terrestrial TDFs) was removed from both codebase mirrors. `vortexAlignment` field preserved in returns, now aliased to live `calibratedVortex`.
- **Phase 2 decision**: Evaluate A/B data from live endpoint. If wave consistently beats current formulas across real proposals, plan the migration.
- **Codex v4.9/v5.0**: Write Codex update capturing deltaDiff sync, adaptive thresholds, 5D formula, Redis, Railway deploy, Kuramoto coupling, wave propagation.
- **0xRay domain transition**: Update references when GitHub org moves to 0xRay.
