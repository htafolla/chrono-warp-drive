# Vortex UI Polish: Specification for Implementation

> **Audience**: Frontend-implementing AI or developer  
> **Source**: `src/pages/VortexClaim.tsx`, `src/components/DynamoDeploy.tsx`, `src/components/vortex/`  
> **Dependencies**: React, Tailwind, Three.js/@react-three/fiber (existing), Sonner toasts (existing in `src/components/ui/sonner.tsx`)  
> **Priority**: P0=must-ship, P1=should-ship, P2=nice-to-have

---

## Table of Contents

1. [Enhanced Pipeline Animation](#1-enhanced-pipeline-animation)
2. [Vortex Card Grid](#2-vortex-card-grid)
3. [Claim Flow Magic](#3-claim-flow-magic)
4. [Detailed Vortex Modal](#4-detailed-vortex-modal)
5. [My Vortices Section](#5-my-vortices-section)
6. [Rarity Legend Card](#6-rarity-legend-card)
7. [Integration Points](#7-integration-points)
8. [Implementation Order](#8-implementation-order)

---

## 1. Enhanced Pipeline Animation

**P0 — Most impactful change.** Transform the current timed-progress-bar into a live, cosmic transport sequence.

### Current State (`DynamoDeploy.tsx:491-512`)

```tsx
const PIPELINE_STAGES = [
  { id: 'ingestion', label: 'Solar Ingestion', icon: <Radio/> },
  { id: 'tdf', label: 'TDF Computation', icon: <Hash/> },
  { id: 'kuramoto', label: 'Kuramoto Coupling', icon: <Waves/> },
  { id: 'wave', label: 'Wave Propagation', icon: <Orbit/> },
  { id: 'verdict', label: 'Governance Verdict', icon: <Shield/> },
];
// Timed progress: [600, 500, 600, 500]ms — fake animation, no backend binding
```

### Requirements

**1.1 Stage definitions** — 5 stages (keep these exact):

| # | ID | Label | Icon Concept | Details |
|---|----|-------|-------------|---------|
| 1 | `solar-ingestion` | Solar Ingestion | Pulsing star/sun | "Listening to the Sun..." |
| 2 | `tdf-computation` | TDF Computation | Building numbers/nonce | "Calculating Temporal Displacement..." |
| 3 | `kuramoto-coupling` | Kuramoto Coupling | Wave interference | "Synchronizing Oscillators..." |
| 4 | `wave-propagation` | Wave Propagation | Floating symbols/text | "Decomposing Symbolic Fingerprint..." |
| 5 | `verdict` | Verdict & Anchoring | Shield / checkmark flash | "Resonance Measured" → final verdict pulse |

**1.2 New `TransportPipeline.tsx` component**

```
src/components/TransportPipeline.tsx
```

Props:
```tsx
interface TransportPipelineProps {
  isActive: boolean;          // true when pipeline is running
  currentStage: number;       // 0-4 index of active stage, -1 = idle
  onComplete?: () => void;    // callback when all stages finish
  finalVerdict?: string;      // PASS / NEEDS_REVISION / FAIL — shown after completion
  minimal?: boolean;          // compact variant for inline use
}
```

**1.3 Layout**

- Horizontal 5-stage flow (on desktop) with connecting animated lines
- Vertical stacked layout (on mobile) with glowing line connecting stages
- Each stage is a circle containing the icon, connected by a horizontal/vertical path line
- Below each circle: stage label text
- Below the pipeline: current stage description (from the Details column above)
- Container: dark cosmic background (`bg-black/90`) with subtle animated particle layer

**1.4 Animation behaviors**

| State | Behavior |
|-------|----------|
| Idle (`isActive=false`) | All circles dimmed (opacity-20), connecting lines dim |
| Active stage current | Circle glows with color + subtle pulse, icon lights up, connecting line before it is solid, after it is dim |
| Active stage completed | Circle goes to a "completed" state (checkmark or filled color), connecting line fully lit |
| All complete | Brief pause (500ms), then verdict flash — green (PASS) / yellow (NEEDS_REVISION) / red (FAIL) with scale + fade animation |
| `minimal=true` | Smaller circles, no labels, just icons + connecting line — used inline in Vortex cards |

**1.5 Timing**

Default timing (when no real backend feedback is available):
```tsx
const STAGE_DURATIONS = [800, 700, 900, 700, 600]; // ms per stage
```

**1.6 Backend binding (P1 — future enhancement)**

The pipeline should optionally accept `backendProgress` via WebSocket or polling:

```tsx
interface BackendProgress {
  stage: number;
  detail?: string;
  partialData?: any;
}
```

For now, use the timer-based advance. The component should be designed so swapping timer→WebSocket requires no structural changes.

**1.7 Particle overlay**

```tsx
// src/components/TransportParticles.tsx
// Canvas-based particle system (or CSS if Three.js is too heavy)
// 50-100 small dots moving slowly upward/outward
// Color varies by current stage:
//   stage 0: orange (solar)
//   stage 1: cyan (data)
//   stage 2: violet (coupling)
//   stage 3: blue-green (wave)
//   stage 4: gold (verdict)
// Opacity fades toward edges, randomize start positions
```

**1.8 Minimal toggle**

A small toggle button (eye icon) at top-right of the pipeline area:
```tsx
const [minimal, setMinimal] = useState(false);
```
When toggled, the pipeline switches to compact layout. Persist preference in `localStorage('transport-minimal')`.

### File Changes

| File | Action |
|------|--------|
| `src/components/TransportPipeline.tsx` | CREATE — main pipeline component |
| `src/components/TransportParticles.tsx` | CREATE — particle overlay |
| `src/components/DynamoDeploy.tsx` | MODIFY — replace current pipeline with TransportPipeline |
| `src/pages/VortexClaim.tsx` | MODIFY — use TransportPipeline during claim flow |

---

## 2. Vortex Card Grid

**P1 — Replace the current table/list with a visually rich card grid.**

### Current State (`VortexClaim.tsx`)

Currently renders a single-column list of expandable rows with inline stats. Functional but not magical.

### Requirements

**2.1 New `VortexCardGrid.tsx` component**

```
src/components/vortex/VortexCardGrid.tsx
```

```tsx
interface VortexCardGridProps {
  containers: ContainerItem[];
  tokenStatus: Record<string, { hasToken: boolean; tokenId: string | null }>;
  onClaim: (containerId: string) => void;
  onViewDetails: (container: ContainerItem) => void;
  minting: string | null;
  mintErrors: Record<string, string>;
  address?: string;
  filterMode: 'all' | 'claimed' | 'unclaimed';
  sortAsc: boolean;
  setFilterMode: (m: 'all' | 'claimed' | 'unclaimed') => void;
  setSortAsc: (s: boolean) => void;
}
```

**2.2 Card layout**

- Responsive grid: 1 col (mobile) / 2 col (tablet) / 3 col (desktop) / 4 col (wide)
- Uses existing `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`

**2.3 Card appearance per rarity tier**

| Tier | Threshold | Header gradient | Glow | Border |
|------|-----------|----------------|------|--------|
| Celestial | ≥0.95 | `from-fuchsia-900/40 to-purple-900/20` | `shadow-fuchsia-500/10` | `border-fuchsia-500/30` |
| Resonant | ≥0.78 | `from-emerald-900/40 to-teal-900/20` | `shadow-emerald-500/10` | `border-emerald-500/30` |
| Unstable | ≥0.50 | `from-amber-900/40 to-yellow-900/20` | none | `border-amber-500/30` |
| Dissonant | <0.50 | `from-red-900/40 to-rose-900/20` | none | `border-red-500/30` |

Existing `rarityTier()` function at `VortexClaim.tsx:162-164` provides these.

**2.4 Card content (top to bottom)**

```
┌──────────────────────────────────────┐
│ [Source Chip] [Verdict Badge]        │  ← row 1: metadata
│                                      │
│ "Vortex Message text..."             │  ← row 2: message (1-2 lines, truncate)
│                                      │
│ ┌──────────┐  Celestial             │  ← row 3: 7D ring preview + tier label
│ │ 7D Ring  │  0.96                   │
│ └──────────┘                         │
│                                      │
│ [━━━━━━━━━━━━━━━━━━━━] 96%          │  ← row 4: small composite bar
│                                      │
│ TMO: Aligned · 0.87                  │  ← row 5: moral tension + score
│                                      │
│ [Claim] or [Minted ✓ #49]          │  ← row 6: action button
│                                      │
│ "Anchored on Base" if on-chain       │  ← row 7: chain status
└──────────────────────────────────────┘
```

- Each card: `bg-zinc-900/80 border rounded-xl p-4 backdrop-blur-sm`
- Source chip: existing `sourceChip()` at line 166-175
- Verdict badge: small pill with `verdictColor()` at line 149-153
- 7D Ring preview: a mini (60×60px) version of the visualizer — just concentric color-coded arcs, no Three.js needed for the grid. Use CSS conic gradients or SVG.
- Composite bar: thin horizontal bar, color from `scaleColor()`
- Action button: "Claim" (primary gradient button) or "Minted ✓ #49" (disabled badge)

**2.5 Filter and sort bar**

Above the grid, a horizontal bar:
```tsx
interface FilterBarProps {
  filterMode: 'all' | 'claimed' | 'unclaimed';
  setFilterMode: (m: 'all' | 'claimed' | 'unclaimed') => void;
  sortAsc: boolean;
  setSortAsc: (s: boolean) => void;
  totalCount: number;
  visibleCount: number;
}
```

- Three toggle pills: "All (956)" / "Unclaimed (931)" / "Claimed (25)"
- Sort toggle: "Newest first" / "Oldest first" with arrow icon
- Count badges update reactively
- Use existing `filterMode`/`sortAsc` state from `VortexClaim.tsx:204-205`

**2.6 Empty state**

When no containers match the current filter:
- Cosmic empty illustration (a faint ring silhouette)
- "No vortices found in this category"
- Subtle suggestion: "Try changing your filter"

**2.7 Loading state**

- 6 skeleton cards matching the card layout
- Each skeleton has pulsing gray blocks for each content row
- Use existing `src/components/ui/skeleton.tsx`

### File Changes

| File | Action |
|------|--------|
| `src/components/vortex/VortexCardGrid.tsx` | CREATE |
| `src/components/vortex/VortexCard.tsx` | CREATE — single card component |
| `src/components/vortex/FilterBar.tsx` | CREATE — filter/sort controls |
| `src/components/vortex/MiniRing.tsx` | CREATE — 60×60 CSS ring preview |
| `src/pages/VortexClaim.tsx` | MODIFY — replace current list rendering with VortexCardGrid, wire up callbacks, prune old render blocks (lines ~580-830) |

---

## 3. Claim Flow Magic

**P1 — Turn the mint flow into a magical ceremony.**

### Current State (`VortexClaim.tsx:307-342`)

Click "Claim" → fetch POST `/vortex/mint` → wait for JSON response → update state. No visual feedback during the wait.

### Requirements

**3.1 Claim modal**

New component: `src/components/vortex/ClaimModal.tsx`

```tsx
interface ClaimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: ContainerItem | null;
  onConfirm: (containerId: string) => void;
  isMinting: boolean;
  mintResult: { txHash: string; tokenId: string } | null;
  mintError: string | null;
  ethPrice: number | null;
  address?: string;
}
```

**3.2 Modal layout**

```
┌─────────────────────────────────────────┐
│  ✕                                    │  ← close button (top-right)
│                                         │
│  ┌─────────────────────────────────┐    │
│  │    Large preview of the NFT     │    │  ← 300×300 container with:
│  │    (full vortex message,        │    │     - 7D ring display (color-coded)
│  │    7D rings, score bars,        │    │     - score bars for each dimension
│  │    rarity tier glow)            │    │     - tier label in center
│  └─────────────────────────────────┘    │
│                                         │
│  "Vortex Message" (full text)           │
│                                         │
│  Tier: Celestial · Source: ambient      │
│  Composite: 0.96 · TMO: 0.87           │
│  Verdict: PASS · Tension: Aligned       │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  [ ✦ Claim this Vortex ]        │   │  ← gradient button, pulsing
│  └──────────────────────────────────┘   │
│                                         │
│  Connected as: 0xabcd...4321            │
└─────────────────────────────────────────┘
```

**3.3 Claim animation sequence**

When user clicks "Claim this Vortex":

```
Step 1: Button changes to "Awakening Vortex..." (disabled, loading spinner)
Step 2: After 300ms — modal content fades, replaced by TransportPipeline (inline, minimal=false)
Step 3: Pipeline animates through 5 stages (timed ~3.5s total)
Step 4: Stage 5 completes with the actual verdict from the container
Step 5: Brief pause (500ms) — anticipation
Step 6: SUCCESS → 
         - Full-screen particle burst (gold/orange particles)
         - Confetti-like animation (use existing library or CSS)
         - Modal header updates: "✦ Vortex #49 Claimed & Anchored"
         - Show transaction hash with Basescan link
         - Show token ID prominently
         - "View My Vortices" button (closes modal, scrolls to My Vortices section)
Step 7: FAILURE →
         - Modal shows error message (from `friendlyMintError` translation on MCP)
         - "Try Again" button
         - "Contact Support" link (mailto: or Discord)
```

**3.4 Success particle burst**

Component: `src/components/vortex/ClaimSuccessParticles.tsx`

- Uses Canvas (or a lightweight particle library like tsParticles)
- 100-200 small gold/amber/white particles
- Burst from center, spread outward, fade over 2 seconds
- Optional: `particleCount` and `colors` props for customization

**3.5 Integration with existing mint flow**

The modal wraps the existing `handleMint` function:

```tsx
// In VortexClaim.tsx
const [claimModalContainer, setClaimModalContainer] = useState<ContainerItem | null>(null)
const [claimResult, setClaimResult] = useState<{ txHash: string; tokenId: string } | null>(null)
const [claimError, setClaimError] = useState<string | null>(null)

async function handleClaimWithAnimation(container: ContainerItem) {
  setClaimResult(null)
  setClaimError(null)
  // Show modal with pipeline animation
  // After pipeline completes visually, call handleMint(container.containerId)
  const result = await handleMint(container.containerId) // returns {txHash, tokenId}
  if (result.success) {
    setClaimResult(result)
    // Trigger success animation
  } else {
    setClaimError(result.error)
  }
}
```

### File Changes

| File | Action |
|------|--------|
| `src/components/vortex/ClaimModal.tsx` | CREATE |
| `src/components/vortex/ClaimSuccessParticles.tsx` | CREATE |
| `src/components/vortex/ClaimPipeline.tsx` | CREATE — wraps TransportPipeline for the claim flow specifically, auto-advances |
| `src/pages/VortexClaim.tsx` | MODIFY — integrate modal, refactor handleMint to optionally work with modal flow |

---

## 4. Detailed Vortex Modal

**P1 — Full-screen or large modal showing every detail of a vortex.**

### Current State

Expanded row in the list shows some details but is limited by row width.

### Requirements

**4.1 New `VortexDetailModal.tsx`**

```
src/components/vortex/VortexDetailModal.tsx
```

```tsx
interface VortexDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: ContainerItem;
  onChainMetadata?: any; // from loadOnChainMetadata
  tokenId?: string | null;
  onClaim?: () => void;
  isMinting?: boolean;
  isClaimed?: boolean;
}
```

**4.2 Modal layout (large, 90vw × 90vh max)**

```
┌─────────────────────────────────────────────────────────────┐
│  Top panel: Hero image (full width, 300px height)           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Large NFT-style image:                                │  │
│  │  - Color-coded concentric rings (7D composite colors) │  │
│  │  - "VORTEX #49" centered, large, with tier glow        │  │
│  │  - Rarity gradient background matching tier            │  │
│  │  - Source icon in corner                               │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ├─ Metadata bar ─────────────────────────────────────────┤ │
│  │  Celestial  │  Source: ambient  │  Verdict: PASS       │ │
│  │  TMO: 0.87  │  Tension: Aligned │ #49 of 50 minted    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ├─ Main content (2-column) ──────────────────────────────┤ │
│  │  LEFT (60%)               │  RIGHT (40%)               │ │
│  │  Vortex Message (full)    │  7D Breakdown:             │ │
│  │  (larger text, italic)    │  Wave Prox:  ████████░░ 82%│ │
│  │                            │  Phase Algn: ██████░░░░ 65%│ │
│  │  Hammer Reason (if any)   │  Cal Vortex: ███████░░░ 71%│ │
│  │  (smaller, muted)         │  Cal Sync:   ████████░░ 84%│ │
│  │                            │  Neural Prox:███████░░░ 73%│ │
│  │  Proposal Text (if any)   │  Neural Vort:████████░░ 80%│ │
│  │                            │  Gematria:   ██████░░░░ 63%│ │
│  │                            │                             │ │
│  │                            │  TMO Overlay:              │ │
│  │                            │  Virtue:    ████████░░ 82% │ │
│  │                            │  Safety:    ██████░░░░ 61% │ │
│  │                            │  Intent:    ████████░░ 79% │ │
│  │                            │  Fusion:    ███████░░░ 72% │ │
│  │                            │                             │ │
│  │                            │  ┌─────────────────────┐   │ │
│  │                            │  │ Container ID:       │   │ │
│  │                            │  │ 0x7E41...cF9        │   │ │
│  │                            │  │ [Copy]              │   │ │
│  │                            │  │                     │   │ │
│  │                            │  │ [View on Basescan]  │   │ │
│  │                            │  │ [Share on Twitter]  │   │ │
│  │                            │  └─────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Bottom bar: [Claim if unclaimed] [Download Image] [Close]  │
└─────────────────────────────────────────────────────────────┘
```

**4.3 Share on Twitter**

Generate a tweet with:
```
I just claimed Vortex #49!
Tier: Celestial (0.96) · Verdict: PASS
🌊⚡🌀
Claim yours: https://dynamo.rippel.ai/vortex
```

Use `window.open()` with Twitter intent URL:
```
https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}
```

**4.4 Download Image**

Generate a downloadable PNG of the hero image area. Approach:
- Use `html-to-image` library (or simple canvas rendering)
- Add `ref` to the hero image container
- `toPng(element).then(url => { const a = document.createElement('a'); a.href = url; a.download = `vortex-${tokenId}.png`; a.click() })`

**4.5 Gematria decomposition section (P2)**

If gematria data is available:
```
Gematria Resonance: 63%
├─ EO Sum: 847
├─ Frequency Rank: 0.71
├─ Reduced Ordinal: 0.58
└─ Archetype Match: 0.64 (θ)
```

Use `div` with monospace font, tree structure with Unicode box-drawing characters.

### File Changes

| File | Action |
|------|--------|
| `src/components/vortex/VortexDetailModal.tsx` | CREATE |
| `src/components/vortex/HeroImage.tsx` | CREATE — the large NFT-style display, standalone component |
| `src/components/vortex/SevenDBreakdown.tsx` | CREATE — 7D bar chart display |
| `src/components/vortex/TMOBreakdown.tsx` | CREATE — TMO moral overlay display |
| `src/pages/VortexClaim.tsx` | MODIFY — wire "View Details" click to open modal |

---

## 5. My Vortices Section

**P1 — Show the connected wallet's owned tokens with their full container data.**

### Current State (`VortexClaim.tsx:254-286`)

`loadMyTokens()` fetches tokens by `balanceOf` + `tokenOfOwnerByIndex` + `getContainerData`. Data is stored in `myTokens` state but not displayed prominently — only used for the "Minted" badge on the main list.

### Requirements

**5.1 Section layout**

A dedicated section above the main grid (or as a tab):
```
┌──────────────────────────────────────────┐
│  ✦ My Vortices  (3)                     │  ← section header with count
│                                          │
│  ┌──────┐  ┌──────┐  ┌──────┐          │
│  │ #49  │  │ #48  │  │ #47  │          │  ← horizontal scrollable row
│  │0.96  │  │0.82  │  │0.75  │          │     of mini cards
│  │PASS  │  │PASS  │  │FAIL  │          │
│  │[View]│  │[View]│  │[View]│          │
│  └──────┘  └──────┘  └──────┘          │
│                                          │
│  "Connected wallet: 0xabcd...4321"      │
└──────────────────────────────────────────┘
```

**5.2 Mini card layout**

- 180×220px card (matching grid card style but smaller)
- Shows: token ID (large), composite score (medium), verdict badge, rarity glow border
- "View" button opens `VortexDetailModal`
- Empty state if `myTokens.length === 0`: "No vortices claimed yet. Connect your wallet and claim one above!"

**5.3 Wallet connection state**

- If not connected: show "Connect your wallet to see your vortices" with the existing `WalletConnectButton`
- If connecting: skeleton placeholders
- If connected but 0 tokens: empty state

**5.4 Auto-refresh**

- Refresh `myTokens` after every successful mint (`mintResults` changes)
- Poll every 30s while wallet is connected (optional, P2)

### File Changes

| File | Action |
|------|--------|
| `src/components/vortex/MyVortices.tsx` | CREATE |
| `src/components/vortex/MyVortexMiniCard.tsx` | CREATE |
| `src/pages/VortexClaim.tsx` | MODIFY — integrate MyVortices section above grid |

---

## 6. Rarity Legend Card

**P0 — Already partially designed, needs a permanent home.**

### Current State (`VortexClaim.tsx:155-164`)

The `TIERS` array exists. Rarity tiers are applied to the summary row and expanded panel via CSS classes. There is no visible "legend" that explains the tier system to the user.

### Requirements

**6.1 Legend card placement**

At the top of the Vortex page, between the page title and the filter bar. A compact inline card:

```
┌─────────────────────────────────────────────────────────────────┐
│  Rarity Tiers                                                    │
│                                                                  │
│  ● Celestial  ≥0.95  │  ● Resonant  ≥0.78  │  ● Unstable  ≥0.50 │ ● Dissonant  <0.50
│  (fuchsia glow)      │  (emerald)           │  (amber)           │  (red)
└─────────────────────────────────────────────────────────────────┘
```

**6.2 Design**

- Horizontal row of 4 tier indicators
- Each: colored circle + tier name + min threshold
- Colors match the existing TIERS definitions (fuchsia/emerald/amber/red)
- Background: transparent or very subtle (`bg-zinc-900/30 border border-zinc-800 rounded-lg px-4 py-3`)
- Responsive: wrap to 2×2 on mobile

**6.3 Tooltip on hover**

Each tier name is a `HoverCard` (from `src/components/ui/hover-card.tsx`):

| Tier | Tooltip text |
|------|-------------|
| Celestial | "Rarest tier. Proposals that resonate at near-perfect coherence with the temporal field." |
| Resonant | "Strong harmonic alignment. These proposals show meaningful resonance across all 7 dimensions." |
| Unstable | "Moderate coherence. These proposals have partial alignment but significant deviation in key dimensions." |
| Dissonant | "Low resonance. These proposals show minimal temporal alignment across most dimensions." |

### File Changes

| File | Action |
|------|--------|
| `src/components/vortex/RarityLegend.tsx` | CREATE |
| `src/pages/VortexClaim.tsx` | MODIFY — add `<RarityLegend/>` above the filter bar |

---

## 7. Integration Points

### 7.1 VortexClaim.tsx restructuring

The current `VortexClaim.tsx` is 841 lines of monolithic logic. Implement the spec by refactoring into a **container/presentational split**:

```
src/pages/VortexClaim.tsx
  ↓ (refactored to)
src/pages/VortexClaim.tsx        # Container: state management, API calls, wallet logic
src/components/vortex/VortexPage.tsx    # Layout: assembles all sub-components
```

The container (`VortexClaim.tsx`) should:
- Manage all state (containers, tokenStatus, minting, etc.)
- Provide all callbacks (handleMint, loadMyTokens, etc.)
- Pass data down to `VortexPage.tsx`

The page (`VortexPage.tsx`) should:
- Import and arrange: RarityLegend, FilterBar, MyVortices, VortexCardGrid
- Handle the modal state (claim modal + detail modal)
- Be a thin layout component

### 7.2 State additions to VortexClaim.tsx

```tsx
// New state needed:
const [claimModalOpen, setClaimModalOpen] = useState(false)
const [detailModalOpen, setDetailModalOpen] = useState(false)
const [claimModalContainer, setClaimModalContainer] = useState<ContainerItem | null>(null)
const [detailModalContainer, setDetailModalContainer] = useState<ContainerItem | null>(null)
const [pipelineActive, setPipelineActive] = useState(false)
const [pipelineStage, setPipelineStage] = useState(-1)
```

### 7.3 API considerations

All existing MCP endpoints are stable. No new backend work is required for the spec:

| Endpoint | Usage |
|----------|-------|
| `GET /containers?limit=50` | Load container list |
| `GET /vortex/statuses` | Bulk claim status (now Redis-only, ~190ms) |
| `GET /vortex/container/:id` | Single container status + data |
| `GET /vortex/info` | Total supply, donations, treasury |
| `POST /vortex/mint` | Mint a token (with `to:` address) |

### 7.4 CSS / Tailwind conventions

- All new components: `src/components/vortex/`
- Use existing Tailwind color tokens (`zinc-900`, `fuchsia-500`, etc.)
- Dark theme by default (`bg-zinc-950` body, `bg-zinc-900/80` cards)
- Animation durations: 200-300ms for micro-interactions, 500-800ms for stage transitions
- Responsive breakpoints: `sm: 640px, md: 768px, lg: 1024px, xl: 1280px`

---

## 8. Implementation Order

| Order | Component | Priority | Est. Time | Depends On |
|-------|-----------|----------|-----------|------------|
| 1 | `RarityLegend.tsx` | P0 | 0.5 hr | Nothing |
| 2 | `TransportPipeline.tsx` + `TransportParticles.tsx` | P0 | 3 hr | Nothing |
| 3 | `MiniRing.tsx` | P1 | 1 hr | Nothing |
| 4 | `VortexCard.tsx` + `VortexCardGrid.tsx` + `FilterBar.tsx` | P1 | 4 hr | MiniRing |
| 5 | `ClaimModal.tsx` + `ClaimSuccessParticles.tsx` | P1 | 3 hr | TransportPipeline |
| 6 | `VortexDetailModal.tsx` + sub-components | P1 | 4 hr | MiniRing |
| 7 | `MyVortices.tsx` + `MyVortexMiniCard.tsx` | P1 | 2 hr | Nothing |
| 8 | `VortexPage.tsx` + refactor `VortexClaim.tsx` | P1 | 2 hr | All of the above |
| 9 | Gematria decomposition section | P2 | 1 hr | VortexDetailModal |
| 10 | Download image functionality | P2 | 0.5 hr | VortexDetailModal |
| 11 | WebSocket real-time pipeline binding | P2 | 2 hr | TransportPipeline |
| 12 | 30s auto-refresh for My Vortices | P2 | 0.5 hr | MyVortices |

### Quick-start (1-session MVP if time is tight)

If you have only one session, build in this order:
1. `RarityLegend.tsx` (30 min)
2. `VortexCardGrid.tsx` with `FilterBar.tsx` (2 hr) — replaces current list, biggest visual impact
3. `TransportPipeline.tsx` (2 hr) — replace the existing pipeline

This delivers 80% of the visual improvement in 4.5 hours.
