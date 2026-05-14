# Dynamo Governance — Best Practices

> **Note (May 2026):** Dynamo uses a dual-oscillator model (Solar + Alignment). The final verdict requires both environmental conditions and proposal alignment to be favorable. A single strong signal is not enough.

## Dual-Oscillator Governance (Current Model)

Dynamo now uses a **dual-oscillator system** for decision making:

### The Two Oscillators

1. **Solar Oscillator** (`/govern_with_solar`)
   - Provides real-time environmental context from NOAA GOES.
   - Applies activity-level-aware modulation.
   - Strongest influence during solar storms.

2. **Alignment Oscillator** (`/governance`)
   - Evaluates proposal-specific resonance and alignment.
   - Returns `resonanceScore`, `isotopicRatio`, and `recommendation`.
   - Varies meaningfully based on the actual proposal text.

### How Verdicts Are Determined

The final answer is produced by merging both oscillators:

| Solar Condition | Alignment Verdict     | Final Result     | Example |
|-----------------|-----------------------|------------------|---------|
| Storm           | Any                   | ❌ No            | Solar storm — wait |
| Caution         | REJECT                | ❌ No            | Conditions shifting + misaligned |
| Clear           | REJECT                | ❌ No            | Proposal misaligned — refine |
| Caution         | NEEDS_REVISION        | 🔄 Maybe         | Conditions shifting + needs work |
| Clear           | NEEDS_REVISION        | 🔄 Maybe         | Proposal needs refinement |
| Clear           | PASS                  | ✅ Yes           | Skies clear and aligned — go for it |

### Key Principles

- **Both oscillators matter**: A strong solar signal cannot override a clear REJECT from alignment (and vice versa in most cases).
- **Solar is an envelope**: It sets the broader context but does not replace proposal quality evaluation.
- **Transparency**: The UI shows solar conditions, alignment metrics, and neural scores side-by-side so users understand the full picture.

### Recommendation

For consumer applications (like the Dynamo Governance UI), use the **hybrid three-call approach**:
- `/govern_with_solar` → Primary verdict + solar context
- `/governance` → Proposal-specific alignment
- `/process-current-sun` → Neural metrics (`metamorphosisIndex`, `confidenceScore`)

This gives users the richest and most honest decision support possible.
