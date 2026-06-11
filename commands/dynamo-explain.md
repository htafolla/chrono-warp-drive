---
name: dynamo-explain
description: Explain a governance output, resonance score, or temporal field term.
---

# /dynamo:explain

Get a plain-english explanation of governance outputs, resonance scores, TMO dimensions, or temporal field terms.

**Usage:** `/dynamo:explain <term or output hash>`

**Examples:**
- `/dynamo:explain TDF` — explains Temporal Displacement Factor
- `/dynamo:explain TMO-virtue` — explains the virtue dimension of the Trinitarium Moral Overlay
- `/dynamo:explain <output-hash>` — explains a specific governance verdict

**Tool invoked:** `explain_governance_output`, `explain_term`
