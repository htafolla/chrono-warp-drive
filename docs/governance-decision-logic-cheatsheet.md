# Dynamo Governance — Decision Logic Cheat Sheet

**Version:** May 2026 (v4.8 Hybrid Model)

## Core Principle

Dynamo uses a **Dual-Oscillator system**:

- **Solar Oscillator** → Real-world environmental conditions
- **Alignment Oscillator** → Proposal-specific resonance & quality

Final verdict requires **both oscillators to be favorable**.

## The Two Oscillators

| Oscillator | Endpoint | What It Evaluates | Key Outputs |
|---|---|---|---|
| **Solar** | `/govern_with_solar` | Real-time solar activity (NOAA) | `adjustedVoteWeight`, `solarModulation`, `solarContext` |
| **Alignment** | `/governance` | How well the proposal fits known patterns | `resonanceScore`, `isotopicRatio`, `recommendation` |

## Verdict Matrix

| Solar Condition | Alignment | Final Verdict | Meaning |
|---|---|---|---|
| Storm | Any | ❌ No | Solar storm — wait for calmer conditions |
| Caution | REJECT | ❌ No | Conditions shifting + proposal misaligned |
| Clear | REJECT | ❌ No | Proposal misaligned — refine and resubmit |
| Caution | NEEDS_REVISION | 🔄 Maybe | Conditions shifting + proposal needs work |
| Clear | NEEDS_REVISION | 🔄 Maybe | Proposal needs refinement before proceeding |
| Clear | PASS | ✅ Yes | Skies are clear and proposal aligned — go for it |

## What Each Source Provides

| Source | Provides | Used For |
|---|---|---|
| `/govern_with_solar` | Verdict, solar level, coupling strength | Primary decision + environmental context |
| `/governance` | Resonance score, isotopic ratio, alignment | Proposal-specific quality check |
| `/process-current-sun` | Metamorphosis Index, Confidence, solar modulation | Deep neural metrics |

## Key Rules

- Both oscillators must agree for a clear **Yes**.
- A **Storm** or **REJECT** from either oscillator usually results in **No**.
- **Maybe** is used when there is conflict or moderate concern.
- Solar context is always visible for transparency, even when it does not drive the final verdict.

## Quick Reference

| Scenario | Verdict |
|---|---|
| Clear skies + High resonance + High confidence | ✅ Strong Yes |
| Storm or REJECT from either oscillator | ❌ Clear No |
| Caution + Needs Revision, or conflicting signals | 🔄 Maybe |

---

> *"The sun sets the weather. Alignment sets the path. Both must be favorable."*
