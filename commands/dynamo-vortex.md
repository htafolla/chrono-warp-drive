---
name: dynamo-vortex
description: Query the Vortex token system — total supply, container statuses, or individual token/container data.
---

# /dynamo:vortex

Query the Vortex on-chain token and container system.

**Usage:** `/dynamo:vortex <info|statuses|container <id>|mint <id>>`

**Subcommands:**
- `info` — total supply, total donations, treasury balance
- `statuses` — batch claimed/unclaimed state for all on-chain containers
- `container <id>` — single container's 7D profile + verdict + token data
- `mint <id>` — mint a VortexToken for an unclaimed container

**Tools invoked:** `vortex.info`, `vortex.statuses`, `vortex.container`, `vortex.mint`
