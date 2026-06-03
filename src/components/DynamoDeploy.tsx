import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Sun, Zap, Shield, Radio, Activity, Brain, RotateCcw, Share2, BarChart3 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { APP_TAG } from '@/lib/version';

const MCP_URL = 'https://mcp-production-80e2.up.railway.app';
const STELLAR_URL = 'https://stellar-mcp-production.up.railway.app';
const NEURAL_URL = 'https://neural-fusion-backend-production.up.railway.app';

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatFullTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function scoreColor(v: number | null | undefined, hi = 0.78, lo = 0.50): string {
  if (v == null) return 'text-white/30'
  if (v >= hi) return 'text-emerald-400'
  if (v >= lo) return 'text-amber-400'
  return 'text-red-400'
}

function verdictColor(v: string | null | undefined): string {
  if (v === 'PASS') return 'text-emerald-400'
  if (v === 'REJECT') return 'text-red-400'
  return 'text-amber-400'
}

function Row({ label, v, color, plain, bold }: { label: string; v: any; color?: string; plain?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[10px] text-white/50">{label}</p>
      <p className={`text-xs ${bold ? 'font-bold' : 'font-mono'} ${color ?? 'text-white/80'}`}>
        {plain ? String(v ?? '—') : v != null ? `${(v * 100).toFixed(1)}%` : '—'}
      </p>
    </div>
  )
}

const EXAMPLE_PROPOSALS = [
  'Deploy the new agent to production',
  'Approve multi-agent coordination protocol',
  'Execute autonomous trading strategy',
];

const GO_PHRASES = [
  'The cosmos says yes. Pack your bags.',
  'Clear solar skies. Full send.',
  'The sun is smiling on this one.',
  'Go for it — the stars are aligned.',
];

const MAYBE_PHRASES = [
  'The sun is restless. Tread carefully.',
  'Conditions shifting — stay alert.',
  'Not a clear call. Have a backup plan.',
];

const NO_PHRASES = [
  'Solar storm in progress. Shelter and wait.',
  'The sun says not today. Try again soon.',
  'Bad cosmic timing. Hold off.',
];

const REJECT_PHRASES = [
  'The proposal does not resonate. Refine and try again.',
  'Not aligned with current conditions. Revise your approach.',
  'The signal is clear: this needs more work.',
];

const GAIN_BY_LEVEL: Record<string, number> = {
  quiet: 0.5,
  moderate: 0.75,
  active: 1,
  storm: 1.3,
};

function hashProposal(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0).toString(36).padStart(8, '0').slice(-8);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface BeaconStatus {
  online: boolean;
  sun: string;
  services: boolean[];
  neuralVersion: string;
}

async function checkBeacons(): Promise<BeaconStatus> {
  let online = false;
  let sun = '';
  let neuralVersion = 'v4.7';
  const services = [false, false, false];

  try {
    const mcp = await fetch(`${MCP_URL}/health`, { signal: AbortSignal.timeout(6000) });
    services[0] = mcp.ok;
    if (mcp.ok) {
      online = true;
      try {
        const gov = await fetch(`${MCP_URL}/govern_with_solar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposal: 'connectivity check for dynamo governance ui', baseVoteWeight: 1 }),
          signal: AbortSignal.timeout(8000),
        });
        if (gov.ok) {
          const data = await gov.json();
          const level = data.solarContext?.solarActivityLevel;
          sun = level === 'storm' ? 'storm' : level === 'active' ? 'active' : level === 'moderate' ? 'moderate' : '';
        }
      } catch { /* optional */ }
    }
  } catch { /* offline */ }

  try {
    const stellar = await fetch(`${STELLAR_URL}/health`, { signal: AbortSignal.timeout(4000) });
    services[1] = stellar.ok;
  } catch { /* offline */ }

  try {
    const neural = await fetch(`${NEURAL_URL}/health`, { signal: AbortSignal.timeout(4000) });
    if (neural.ok) {
      services[2] = true;
      const body = await neural.json();
      if (body?.version) neuralVersion = body.version;
    }
  } catch { /* offline */ }

  return { online, sun, services, neuralVersion };
}

interface Diagnostics {
  isotopicRatio: number | null;
  vortexVolume: number | null;
  historicalCoherence: number | null;
}

interface GovernanceResult {
  answer: string;
  detail: string;
  phrase: string;
  level: string;
  signal: string;
  weight: number;
  gain: number;
  metamorphosisIndex: number | null;
  confidenceScore: number | null;
  spectralQuality?: number | null;
  reconstructionError?: number | null;
  governanceConfidence: number | null;
  solarApplied: boolean;
  resonanceScore: number | null;
  structuralResonance: number | null;
  proximity: number | null;
  phaseAlignment: number | null;
  vortexAlignment: number | null;
  crossCorrelationLag: number | null;
  signalTiming: string | null;
  synchronization: number | null;
  waveProximity: number | null;
  waveVortexAlignment: number | null;
  waveSynchronization: number | null;
  hybrid4DComposite: number | null;
  hybridVerdict: string | null;
  hybridVortexAlignment: number | null;
  fullWave4DComposite: number | null;
  calibratedWave4DComposite: number | null;
  fullBoxProximity: number | null;
  fullBoxVortexAlignment: number | null;
  fullBoxSynchronization: number | null;
  fullBoxNeuralProximity: number | null;
  fullBoxNeuralVortex: number | null;
  fullBox4DComposite: number | null;
  fullBoxVerdict: string | null;
  fullBoxThresholds: { strong: number; good: number; weak: number } | null;
  fullBoxGematriaResonance: number | null;
  fullBox7DComposite: number | null;
  fullBox7DVerdict: string | null;
  neuralWaveProximity: number | null;
  neuralWaveVortexAlignment: number | null;
  smoothedResonance: number | null;
  trend: string | null;
  momentum: number | null;
  peakForecast: { estimatedPeakResonance: number; minutesToPeak: number; windowQuality: string } | null;
  adaptiveThresholds: { strong: number; good: number; weak: number } | null;
  resonanceHistory?: Array<{ score: number; timestamp: string }> | null;
  diagnostics: Diagnostics;
  signature: string;
  alignmentRec: string | null;
  alignmentReason: string | null;
  source: string;
  neuralContextUsed: boolean;
}

async function checkGovernance(proposal: string, sharePublicly: boolean): Promise<GovernanceResult | null> {
  try {
    const proposalLabel = proposal.length < 30 ? proposal + ' — via Dynamo governance' : proposal;

    // Call neural for spectralQuality (sunNeuralEmbedding is auto-fetched by the
    // backend when not provided, but sending it avoids a redundant internal fetch)
    const neuralRes = await fetch(`${NEURAL_URL}/process-current-sun`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
    }).then(async r => r.ok ? r.json() : null).catch(() => null);

    const spectralQuality = neuralRes?.neuralOutput?.spectralQuality ?? neuralRes?.spectralQuality ?? null;
    const neuralEmbedding16 = neuralRes?.neuralOutput?.neuralEmbedding16 ?? neuralRes?.neuralEmbedding16 ?? null;

    // Then call governance with spectralQuality, plus alignment in parallel
    const [solarRes, alignRes] = await Promise.allSettled([
      fetch(`${MCP_URL}/govern_with_solar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal, baseVoteWeight: 1, sharePublicly, spectralQuality, sunNeuralEmbedding: neuralEmbedding16 }),
        signal: AbortSignal.timeout(15000),
      }).then(async r => r.ok ? r.json() : null),
      fetch(`${MCP_URL}/governance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: `ui-${Date.now()}`, proposalText: proposalLabel, agentReviews: ['UI submission'] }),
        signal: AbortSignal.timeout(15000),
      }).then(async r => r.ok ? r.json() : null),
    ]);

    const solar = solarRes.status === 'fulfilled' ? solarRes.value : null;
    const alignment = alignRes.status === 'fulfilled' ? alignRes.value : null;
    const neural = neuralRes;

    if (!solar && !alignment && !neural) return null;

    const confidenceAdjustment = solar?.confidenceAdjustment ?? 0;
    const solarLevel = solar?.solarContext?.solarActivityLevel ?? neural?.solarFeatures?.activityLevel ?? '';
    const adjustedWeight = solar?.adjustedVoteWeight ?? 1;
    const isStormWarning = solar?.finalRecommendation?.includes('STORM_WARNING') ?? false;
    const levelLabel = solarLevel === 'storm' ? 'Storm' : solarLevel === 'active' ? 'Active' : solarLevel === 'moderate' ? 'Fair' : 'Quiet';
    const signalLabel = confidenceAdjustment >= 0 ? `+${(confidenceAdjustment * 100).toFixed(0)}%` : `${(confidenceAdjustment * 100).toFixed(0)}%`;
    const gain = GAIN_BY_LEVEL[solarLevel] ?? 0.75;

    const metamorphosisIndex = neural?.neuralOutput?.metamorphosisIndex ?? neural?.metamorphosisIndex ?? null;
    const confidenceScore = neural?.neuralOutput?.confidenceScore ?? neural?.confidenceScore ?? null;
    const reconstructionError = neural?.neuralOutput?.reconstructionError ?? neural?.reconstructionError ?? null;
    const governanceConfidence = alignment?.confidence ?? null;
    const solarApplied = neural?.neuralOutput?.solarApplied ?? neural?.solarModulation?.solar_applied ?? (solar?.solarContext != null) ?? false;

    // Prefer the SOLAR ISOTOPIC HAMMER resonance/recommendation (direct sun-grounded override)
    // Fall back to alignment (review cross) only if solar hammer unavailable
    const resonanceScore = solar?.resonanceScore != null ? Number(solar.resonanceScore) : (alignment?.resonanceScore != null ? Number(alignment.resonanceScore) : null);
  const structuralResonance = solar?.structuralResonance != null ? Number(solar.structuralResonance) : null;
  const proximity = solar?.proximity != null ? Number(solar.proximity) : null;
  const phaseAlignment = solar?.phaseAlignment != null ? Number(solar.phaseAlignment) : null;
  const vortexAlignment = solar?.vortexAlignment != null ? Number(solar.vortexAlignment) : null;
  const crossCorrelationLag = solar?.crossCorrelationLag != null ? Number(solar.crossCorrelationLag) : null;
  const signalTiming = solar?.signalTiming || null;
  const phaseType = solar?.phaseType || null;
  const isotope = solar?.isotope || null;
  const synchronization = solar?.synchronization != null ? Number(solar.synchronization) : null;
  const waveProximity = solar?.waveProximity != null ? Number(solar.waveProximity) : null;
  const waveVortexAlignment = solar?.waveVortexAlignment != null ? Number(solar.waveVortexAlignment) : null;
  const waveSynchronization = solar?.waveSynchronization != null ? Number(solar.waveSynchronization) : null;
  const hybrid4DComposite = solar?.hybrid4DComposite != null ? Number(solar.hybrid4DComposite) : null;
  const hybridVerdict = solar?.hybridVerdict || null;
  const hybridVortexAlignment = solar?.hybridVortexAlignment != null ? Number(solar.hybridVortexAlignment) : null;
  const fullWave4DComposite = solar?.fullWave4DComposite != null ? Number(solar.fullWave4DComposite) : null;
  const calibratedWave4DComposite = solar?.calibratedWave4DComposite != null ? Number(solar.calibratedWave4DComposite) : null;
  const fullBoxProximity = solar?.fullBoxProximity != null ? Number(solar.fullBoxProximity) : null;
  const fullBoxVortexAlignment = solar?.fullBoxVortexAlignment != null ? Number(solar.fullBoxVortexAlignment) : null;
  const fullBoxSynchronization = solar?.fullBoxSynchronization != null ? Number(solar.fullBoxSynchronization) : null;
  const fullBoxNeuralProximity = solar?.fullBoxNeuralProximity != null ? Number(solar.fullBoxNeuralProximity) : null;
  const fullBoxNeuralVortex = solar?.fullBoxNeuralVortex != null ? Number(solar.fullBoxNeuralVortex) : null;
  const fullBox4DComposite = solar?.fullBox4DComposite != null ? Number(solar.fullBox4DComposite) : null;
  const fullBoxVerdict = solar?.fullBoxVerdict || null;
  const fullBoxThresholds = solar?.fullBoxThresholds ?? null;
  const fullBoxGematriaResonance = solar?.fullBoxGematriaResonance != null ? Number(solar.fullBoxGematriaResonance) : null;
  const fullBox7DComposite = solar?.fullBox7DComposite != null ? Number(solar.fullBox7DComposite) : null;
  const fullBox7DVerdict = solar?.fullBox7DVerdict || null;
  const neuralWaveProximity = solar?.neuralWaveProximity != null ? Number(solar.neuralWaveProximity) : null;
  const neuralWaveVortexAlignment = solar?.neuralWaveVortexAlignment != null ? Number(solar.neuralWaveVortexAlignment) : null;
  const momentum = solar?.momentum != null ? Number(solar.momentum) : null;
  const peakForecast = solar?.peakForecast ?? null;
  const adaptiveThresholds = solar?.adaptiveThresholds ?? null;
  const smoothedResonance = solar?.smoothedResonance != null ? Number(solar.smoothedResonance) : null;
  const trend = solar?.trend || null;
    const resonanceHistory = solar?.resonanceHistory || null;
    const neuralContextUsed = solar?.neuralContextUsed === true;
    const diag = alignment?.diagnostics;
    const isotopicRatio = diag?.isotopicRatio != null ? Number(diag.isotopicRatio) : null;
    const historicalCoherence = diag?.historicalCoherence != null ? Number(diag.historicalCoherence) : null;
    const alignmentRec = solar?.recommendation ?? alignment?.recommendation ?? null;
    const alignmentReason = solar?.hammerReason ?? alignment?.reasons?.[0] ?? null;

    const isStorm = isStormWarning || solarLevel === 'storm';
    const isBadSignal = confidenceAdjustment <= -0.08;
    const isRejected = alignmentRec === 'REJECT';
    const isNeedsRevision = alignmentRec === 'NEEDS_REVISION';

    let answer: string, detail: string, phrase: string;
    if (isStorm) {
      answer = 'no';
      detail = 'Solar storm — wait for calmer skies';
      phrase = pick(NO_PHRASES);
    } else if (isRejected && isBadSignal) {
      answer = 'no';
      detail = 'Solar conditions shifting and proposal misaligned';
      phrase = pick(NO_PHRASES);
    } else if (isRejected) {
      answer = 'no';
      detail = 'Proposal misaligned — refine and resubmit';
      phrase = pick(REJECT_PHRASES);
    } else if (isBadSignal && isNeedsRevision) {
      answer = 'maybe';
      detail = 'Conditions shifting and proposal needs work';
      phrase = pick(MAYBE_PHRASES);
    } else if (isBadSignal) {
      answer = 'maybe';
      detail = 'Solar conditions shifting — proceed with caution';
      phrase = pick(MAYBE_PHRASES);
    } else if (isNeedsRevision) {
      answer = 'maybe';
      detail = 'Proposal needs refinement before proceeding';
      phrase = pick(MAYBE_PHRASES);
    } else {
      answer = 'yes';
      detail = 'Skies are clear and proposal aligned — go for it';
      phrase = pick(GO_PHRASES);
    }

    const sources = [solar ? 'Solar' : '', alignment ? 'Resonance' : '', neural ? 'Neural' : ''].filter(Boolean);
    const source = sources.length >= 2 ? sources.join(' + ') : sources[0] || 'unknown';

    const sigInput = [proposal, alignment?.resonanceScore ?? '', alignment?.recommendation ?? ''].join('|');
    const signature = `dynamo-${hashProposal(sigInput)}`;

    return {
      answer, detail, phrase, level: levelLabel, signal: signalLabel,
      weight: adjustedWeight, gain, metamorphosisIndex, confidenceScore, spectralQuality, reconstructionError, governanceConfidence,
      solarApplied, resonanceScore,
      diagnostics: { isotopicRatio, vortexVolume: null, historicalCoherence },
      signature, alignmentRec, alignmentReason, source, neuralContextUsed,
      resonanceHistory, smoothedResonance, trend, structuralResonance, proximity, phaseAlignment, vortexAlignment, crossCorrelationLag, signalTiming, phaseType, isotope, synchronization, waveProximity, waveVortexAlignment, waveSynchronization, hybrid4DComposite, hybridVerdict, hybridVortexAlignment, fullWave4DComposite, calibratedWave4DComposite, momentum, peakForecast, adaptiveThresholds,
      fullBoxProximity, fullBoxVortexAlignment, fullBoxSynchronization, fullBoxNeuralProximity, fullBoxNeuralVortex, fullBox4DComposite, fullBoxVerdict, fullBoxThresholds,
      fullBoxGematriaResonance, fullBox7DComposite, fullBox7DVerdict,
      neuralWaveProximity, neuralWaveVortexAlignment,
    };
  } catch {
    return null;
  }
}

function gainWidth(gain: number): string {
  const widths: Record<number, string> = { 0.5: 'w-1/4', 0.75: 'w-1/2', 1: 'w-3/4', 1.3: 'w-full' };
  return widths[gain] ?? 'w-1/2';
}

function gainLabel(gain: number): string {
  if (gain <= 0.5) return 'Light';
  if (gain <= 0.75) return 'Moderate';
  if (gain <= 1) return 'Strong';
  return 'Maximum';
}

function alignIcon(rec: string | null): string {
  if (rec === 'PASS') return '✓';
  if (rec === 'REJECT') return '✗';
  if (rec === 'NEEDS_REVISION') return '~';
  return '?';
}

function alignColor(rec: string | null): string {
  if (rec === 'PASS') return 'text-emerald-400';
  if (rec === 'NEEDS_REVISION') return 'text-amber-400';
  if (rec === 'REJECT') return 'text-red-400';
  return 'text-white/40';
}

function alignLabel(rec: string | null): string {
  if (rec === 'PASS') return 'Aligned';
  if (rec === 'NEEDS_REVISION') return 'Needs work';
  if (rec === 'REJECT') return 'Misaligned';
  return '—';
}

export default function DynamoDeploy() {
  const [beaconOnline, setBeaconOnline] = useState<boolean | null>(null);
  const [sunStatus, setSunStatus] = useState('');
  const [services, setServices] = useState([false, false, false]);
  const [neuralVersion, setNeuralVersion] = useState('v4.7');
  const [proposal, setProposal] = useState('');
  const [result, setResult] = useState<GovernanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastProposal, setLastProposal] = useState('');
  const [sharePublicly, setSharePublicly] = useState(true);
  const [feed, setFeed] = useState<Array<{
    proposal: string; resonanceScore: number; recommendation: string;
    activityLevel: string; timestamp: string; response?: any;
  }>>([]);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch(`${MCP_URL}/history?n=50`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data.entries) {
          setFeed(data.entries.map((e: any) => ({
            proposal: e.proposal,
            resonanceScore: e.response.resonanceScore ?? e.response.structuralResonance ?? 0,
            recommendation: e.response.recommendation ?? 'NEEDS_REVISION',
            activityLevel: e.response.solarContext?.solarActivityLevel ?? 'moderate',
            timestamp: e.timestamp,
            response: e.response,
          })));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    checkBeacons().then(s => {
      if (s) {
        setBeaconOnline(s.online);
        setSunStatus(s.sun);
        setServices(s.services);
        setNeuralVersion(s.neuralVersion);
      }
    });
  }, []);

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 15000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedEntry(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const run = useCallback(async (text?: string) => {
    const input = (text || proposal).trim();
    if (!input) return;
    setLoading(true);
    setResult(null);
    setLastProposal(input);
    if (text) setProposal(text);
    const r = await checkGovernance(input, sharePublicly);
    setResult(r);
    setLoading(false);
    fetchFeed();
  }, [proposal, sharePublicly, fetchFeed]);

  const shareVerdict = useCallback(() => {
    if (!result) return;
    const icon = result.answer === 'yes' ? '✅' : result.answer === 'no' ? '❌' : '🔄';
    const label = result.answer === 'yes' ? 'Go for it' : result.answer === 'no' ? 'Not now' : 'Be careful';
    const lines = [
      `${icon} Dynamo says: ${label}`,
      `"${lastProposal}"`,
      `Solar ${result.level} · Signal ${result.signal} · ${result.gain}x`,
    ];
    if (result.resonanceScore != null) lines.push(`Resonance ${(result.resonanceScore * 100).toFixed(0)}%`);
    if (result.signature) lines.push(`ID: ${result.signature}`);
    if (result.metamorphosisIndex != null) lines.push(`MI ${(result.metamorphosisIndex * 100).toFixed(1)}%`);
    if (result.governanceConfidence != null) lines.push(`Gov ${(result.governanceConfidence * 100).toFixed(1)}%`);
    if (result.spectralQuality != null) lines.push(`Spectral Quality ${(result.spectralQuality * 100).toFixed(1)}%${result.neuralContextUsed ? ' (5D)' : ' (4D)'}`);
    if (result.confidenceScore != null) lines.push(`Neural ${(result.confidenceScore * 100).toFixed(1)}%`);
    if (result.reconstructionError != null) lines.push(`Recon Err ${result.reconstructionError.toFixed(3)}`);
    lines.push('dynamo-ui-psi.vercel.app');
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
  }, [result, lastProposal]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight"><span className="text-2xl">⚡</span> Dynamo</h1>
          <p className="text-xs text-white/60 mt-1">Resonance-Driven · Solar Context · Neural Metrics</p>
          <div className="flex items-center justify-center gap-3 mt-2">
            <a href="https://dynamo-docs.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/40 hover:text-white/70 transition-colors">Docs</a>
            <a href="https://dynamo-docs.vercel.app/about" target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/40 hover:text-white/70 transition-colors">About</a>
            <a href="https://github.com/htafolla/chrono-warp-drive" target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/40 hover:text-white/70 transition-colors">GitHub</a>
            <a href="https://x.com/blaze0x1" target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/40 hover:text-white/70 transition-colors">X / @blaze0x1</a>
          </div>
        </div>

        {/* Three service cards — grid row, icon left of text */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: '⚡', name: 'Dynamo MCP', ok: services[0] },
            { icon: '✦', name: 'Stellar MCP', ok: services[1] },
            { icon: '🧬', name: `Neural ${neuralVersion}`, ok: services[2] },
          ].map((s, i) => (
            <div key={i} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 ${s.ok ? 'bg-white/[0.03] border-white/10' : 'bg-white/[0.01] border-white/5'}`}>
              <span className="text-sm shrink-0">{s.icon}</span>
              <span className="text-[11px] font-semibold text-white/80 truncate">{s.name}</span>
              <div className={`ml-auto h-1.5 w-1.5 rounded-full shrink-0 ${s.ok ? 'bg-emerald-500' : beaconOnline === null ? 'bg-white/20 animate-pulse' : 'bg-red-500'}`} />
            </div>
          ))}
        </div>

        {/* Solar status */}
        {sunStatus && (
          <div className={`rounded-xl p-3 text-center text-sm font-medium ${
            sunStatus === 'storm' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
            sunStatus === 'active' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
            'bg-violet-500/10 text-violet-400 border border-violet-500/30'
          }`}>
            {sunStatus === 'storm' ? '⛈️ Solar storm — stand by' :
             sunStatus === 'active' ? '🌤️ Sun is active — expect shifts' :
             '☀️ Fair conditions right now'}
          </div>
        )}



        {/* Input */}
        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={proposal}
              onChange={e => setProposal(e.target.value)}
              placeholder="Deploy the new agent to production"
              rows={3}
              className="w-full bg-white/[0.05] border border-white/20 rounded-xl px-4 pt-4 pb-8 text-white text-base placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none transition-all"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(); } }}
              disabled={loading}
            />
             <label className="absolute bottom-2 left-4 flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sharePublicly}
                onChange={e => setSharePublicly(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/[0.05] accent-violet-500 cursor-pointer"
              />
              <span className="text-xs text-white/50">Share publicly</span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROPOSALS.map(p => (
              <button
                key={p}
                onClick={() => run(p)}
                disabled={loading}
                className="text-xs bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white/90 border border-white/[0.10] rounded-full px-3 py-1.5 transition-all disabled:opacity-30"
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => run()}
            disabled={loading || !proposal.trim()}
            className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-lg shadow-violet-600/30"
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {loading ? 'Analyzing proposal...' : 'Ask Dynamo'}
          </button>
        </div>

        {/* Result — every governance result is a self-authenticating temporal document */}
        {result && (
          <div className={`rounded-2xl p-5 text-center space-y-3 border shadow-xl ${
            result.answer === 'yes' ? 'bg-emerald-500/[0.07] border-emerald-500/30 shadow-emerald-500/5' :
            result.answer === 'no' ? 'bg-red-500/[0.07] border-red-500/30 shadow-red-500/5' :
            'bg-amber-500/[0.07] border-amber-500/30 shadow-amber-500/5'
          }`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <p className="text-[9px] text-cyan-400/60 uppercase tracking-widest font-semibold">⚡ Temporal Document</p>
              <span className="text-[9px] text-emerald-400/60">✓ Grounded</span>
            </div>
            <div className="text-4xl">{result.answer === 'yes' ? '✅' : result.answer === 'no' ? '❌' : '🔄'}</div>
            <p className="text-xl font-bold text-white">
              {result.answer === 'yes' ? 'Go for it' : result.answer === 'no' ? 'Not now' : 'Be careful'}
            </p>
            <p className="text-sm text-white/70 italic">&ldquo;{result.alignmentReason || result.phrase}&rdquo;</p>

            {/* Primary Metrics */}
            {result.resonanceScore != null && (
              <div className="space-y-3 mt-4">
                <div>
                  <p className="text-xs text-white/50 uppercase">Resonance</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-white">{(result.resonanceScore * 100).toFixed(0)}%</p>
                    {result.trend && (
                      <span className={`text-sm font-semibold ${result.trend === 'rising' ? 'text-emerald-400' : result.trend === 'falling' ? 'text-red-400' : 'text-white/40'}`}>
                        {result.trend === 'rising' ? '↑' : result.trend === 'falling' ? '↓' : '→'}
                      </span>
                    )}
                    {result.smoothedResonance != null && (
                      <span className="text-sm text-white/40">3-min avg {(result.smoothedResonance * 100).toFixed(0)}%</span>
                    )}
                  </div>
                  {result.resonanceHistory && result.resonanceHistory.length > 1 && (
                    <div className="flex items-end gap-[3px] mt-2 h-8">
                      {[...result.resonanceHistory].reverse().map((h, i) => (
                        <div key={i} className="flex-1 min-w-[4px] rounded-sm transition-all" style={{
                          height: `${Math.max(8, h.score * 100)}%`,
                          backgroundColor: h.score >= 0.78 ? '#34d399' : h.score >= 0.62 ? '#fbbf24' : '#f87171',
                          opacity: 0.4 + (i / result.resonanceHistory!.length) * 0.6,
                        }} />
                      ))}
                    </div>
                  )}
                </div>
                {result.proximity != null && (
                  <>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div>
                      <p className="text-[10px] text-white/40 uppercase">Proximity</p>
                      <p className="text-sm font-semibold text-white">{(result.proximity * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase">Phase</p>
                      <p className="text-sm font-semibold text-white">{(result.phaseAlignment! * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase">Volume</p>
                      <p className="text-sm font-semibold text-white">{(result.vortexAlignment! * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                  {result.signalTiming && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-medium ${result.signalTiming === 'leading' ? 'text-emerald-400' : result.signalTiming === 'trailing' ? 'text-amber-400' : 'text-white/40'}`}>
                        {result.signalTiming === 'leading' ? '↑ Leading' : result.signalTiming === 'trailing' ? '↓ Trailing' : '→ Synced'}
                      </span>
                      {result.phaseType && (
                        <span className={`text-[10px] font-medium ${result.phaseType === 'push' ? 'text-rose-400' : 'text-cyan-400'}`}>
                          {result.phaseType === 'push' ? '⇈ Push' : '⇊ Pull'}
                        </span>
                      )}
                      {result.isotope && (
                        <span className="text-[10px] text-white/40">{result.isotope}</span>
                      )}
                    </div>
                  )}
                  {result.waveProximity != null && (
                    <details className="mt-2">
                      <summary className="text-[10px] text-white/30 cursor-pointer hover:text-white/50">Wave (Phase 2)</summary>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        <div>
                          <p className="text-[9px] text-cyan-500/60">W-Prox</p>
                          <p className="text-xs font-semibold text-cyan-300">{(result.waveProximity * 100).toFixed(0)}%</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-cyan-500/60">W-Vortex</p>
                          <p className="text-xs font-semibold text-cyan-300">{(result.waveVortexAlignment! * 100).toFixed(0)}%</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-cyan-500/60">W-Sync</p>
                          <p className="text-xs font-semibold text-cyan-300">{(result.waveSynchronization! * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                    </details>
                  )}
                  </>
                  )}
                  {result.hybrid4DComposite != null && (
                    <details className="mt-2">
                      <summary className="text-[10px] text-white/30 cursor-pointer hover:text-white/50">Hybrid (Phase 2)</summary>
                      <div className="space-y-2 mt-1">
                        <div className="flex items-center justify-between border-b border-white/[0.04] pb-1">
                          <p className="text-[10px] text-purple-500/60">Hybrid 4D</p>
                          <p className="text-sm font-semibold text-white">{(result.hybrid4DComposite * 100).toFixed(0)}%</p>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/[0.04] pb-1">
                          <p className="text-[10px] text-purple-500/60">Hybrid Verdict</p>
                          <p className={`text-sm font-semibold ${
                            result.hybridVerdict === 'PASS' ? 'text-emerald-400' :
                            result.hybridVerdict === 'REJECT' ? 'text-red-400' :
                            'text-amber-400'
                          }`}>{result.hybridVerdict}</p>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/[0.04] pb-1">
                          <p className="text-[10px] text-purple-500/60">Wave Vortex (replaces dead current)</p>
                          <p className="text-sm font-semibold text-purple-300">{(result.hybridVortexAlignment! * 100).toFixed(0)}%</p>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/[0.04] pb-1">
                          <p className="text-[10px] text-purple-500/60">Full Wave 4D</p>
                          <p className="text-sm font-semibold text-purple-300">{(result.fullWave4DComposite! * 100).toFixed(0)}%</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-purple-500/60">Calibrated Wave 4D</p>
                          <p className="text-sm font-semibold text-purple-300">{(result.calibratedWave4DComposite! * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                    </details>
                  )}
                  {result.fullBox4DComposite != null && (
                    <details className="mt-1">
<summary className="text-[10px] text-white/30 cursor-pointer hover:text-white/50">Full Box 6D (4 physical + 2 neural)</summary>
                       <div className="space-y-2 mt-1">
<div className="flex items-center justify-between border-b border-white/[0.04] pb-1">
                            <p className="text-[10px] text-cyan-500/60">Full Box 6D</p>
                            <p className="text-sm font-semibold text-white">{(result.fullBox4DComposite * 100).toFixed(0)}%</p>
                          </div>
                          <div className="flex items-center justify-between border-b border-white/[0.04] pb-1">
                            <p className="text-[10px] text-cyan-500/60">Full Box Verdict</p>
                            <p className={`text-sm font-semibold ${
                              result.fullBoxVerdict === 'PASS' ? 'text-emerald-400' :
                              result.fullBoxVerdict === 'REJECT' ? 'text-red-400' :
                              'text-amber-400'
                            }`}>{result.fullBoxVerdict}</p>
                          </div>
                          {result.fullBoxThresholds && (
                          <div className="flex items-center justify-between border-b border-white/[0.04] pb-1">
                            <p className="text-[10px] text-cyan-500/60">Thresholds</p>
                            <p className="text-[10px] text-white/40">
                              {(result.fullBoxThresholds.strong * 100).toFixed(0)}/{(result.fullBoxThresholds.good * 100).toFixed(0)}/{(result.fullBoxThresholds.weak * 100).toFixed(0)}
                            </p>
                          </div>
                          )}
                          {result.fullBox7DComposite != null && (
                          <div className="flex items-center justify-between border-b border-white/[0.04] pb-1">
                            <p className="text-[10px] text-amber-500/60">Full Box 7D (with gematria)</p>
                            <p className="text-sm font-semibold text-amber-300">{(result.fullBox7DComposite * 100).toFixed(0)}%</p>
                          </div>
                          )}
                          {result.fullBox7DVerdict != null && (
                          <div className="flex items-center justify-between border-b border-white/[0.04] pb-1">
                            <p className="text-[10px] text-amber-500/60">7D Verdict</p>
                            <p className={`text-sm font-semibold ${
                              result.fullBox7DVerdict === 'PASS' ? 'text-emerald-400' :
                              result.fullBox7DVerdict === 'REJECT' ? 'text-red-400' :
                              'text-amber-400'
                            }`}>{result.fullBox7DVerdict}</p>
                          </div>
                          )}
                         <div className="flex items-center justify-between border-b border-white/[0.04] pb-1">
                           <p className="text-[10px] text-cyan-500/60">Wave Proximity</p>
                           <p className="text-sm font-semibold text-cyan-300">{(result.fullBoxProximity! * 100).toFixed(0)}%</p>
                         </div>
                         <div className="flex items-center justify-between border-b border-white/[0.04] pb-1">
                           <p className="text-[10px] text-cyan-500/60">Wave Vortex (calibrated)</p>
                           <p className="text-sm font-semibold text-cyan-300">{(result.fullBoxVortexAlignment! * 100).toFixed(0)}%</p>
                         </div>
                         <div className="flex items-center justify-between border-b border-white/[0.04] pb-1">
                           <p className="text-[10px] text-cyan-500/60">Wave Sync (calibrated)</p>
                           <p className="text-sm font-semibold text-cyan-300">{(result.fullBoxSynchronization! * 100).toFixed(0)}%</p>
                         </div>
                         <div className="flex items-center justify-between border-b border-white/[0.04] pb-1">
                           <p className="text-[10px] text-amber-500/60">Neural Prox (6D)</p>
                           <p className="text-sm font-semibold text-amber-300">{result.fullBoxNeuralProximity != null ? `${(result.fullBoxNeuralProximity * 100).toFixed(0)}%` : '—'}</p>
                         </div>
                         <div className="flex items-center justify-between">
                           <p className="text-[10px] text-amber-500/60">Neural Vortex (6D)</p>
                           <p className="text-sm font-semibold text-amber-300">{result.fullBoxNeuralVortex != null ? `${(result.fullBoxNeuralVortex * 100).toFixed(0)}%` : '—'}</p>
                         </div>
                       </div>
                    </details>
                  )}
                  {result.neuralWaveProximity != null && (
                    <details className="mt-1">
                      <summary className="text-[10px] text-white/30 cursor-pointer hover:text-white/50">Neural Quantum Realms</summary>
<div className="space-y-2 mt-1">
                         <div className="flex items-center justify-between border-b border-white/[0.04] pb-1">
                           <p className="text-[10px] text-rose-500/60">Neural Proximity (per-dim)</p>
                           <p className="text-sm font-semibold text-rose-300">{(result.neuralWaveProximity * 100).toFixed(0)}%</p>
                         </div>
                         <div className="flex items-center justify-between">
                           <p className="text-[10px] text-rose-500/60">Neural Vortex (cosine)</p>
                           <p className="text-sm font-semibold text-rose-300">{(result.neuralWaveVortexAlignment! * 100).toFixed(0)}%</p>
                         </div>
                      </div>
                    </details>
                  )}
                  {result.governanceConfidence != null && (
                  <div>
                    <p className="text-xs text-white/50 uppercase">Governance Confidence</p>
                    <p className="text-2xl font-bold text-white">{(result.governanceConfidence * 100).toFixed(1)}%</p>
                  </div>
                )}
              </div>
            )}

            {/* Raw Neural Output — now reconstruction-driven */}
            {(result.confidenceScore != null || result.spectralQuality != null) && (
              <details className="group mt-4">
                <summary className="bg-white/[0.03] rounded-lg px-3 py-2 text-center cursor-pointer hover:bg-white/[0.06] transition-colors list-none flex items-center justify-center gap-1">
                  <Brain className="h-3 w-3 text-white/40" />
                  <span className="text-xs text-white/40">
                    Neural {result.spectralQuality != null ? 'Quality' : 'Output'} 
                    {result.confidenceScore != null && ` (${(result.confidenceScore * 100).toFixed(1)}%)`}
                  </span>
                  <span className="text-xs text-white/40 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="bg-white/[0.03] rounded-lg p-2 mt-1 space-y-1 text-center">
                  {result.spectralQuality != null && (
                    <div>
                      <p className="text-[10px] text-white/50 uppercase">Spectral Quality</p>
                      <p className="text-sm font-semibold text-white">{(result.spectralQuality * 100).toFixed(1)}%</p>
                    </div>
                  )}
                  {result.reconstructionError != null && result.reconstructionError > 0.05 && (
                    <p className="text-[10px] text-white/50">Recon Error: {result.reconstructionError.toFixed(3)}</p>
                  )}
                  {result.confidenceScore != null && (
                    <div>
                      <p className="text-[10px] text-white/50 uppercase">Neural Confidence</p>
                      <p className="text-sm font-semibold text-white">{(result.confidenceScore * 100).toFixed(1)}%</p>
                    </div>
                  )}
                  {result.metamorphosisIndex != null && (
                    <p className="text-[10px] text-white/50">Signal Evolution: {(result.metamorphosisIndex * 100).toFixed(1)}%</p>
                  )}
                </div>
              </details>
            )}

            {result.level && (
            <details className="group mt-2">
              <summary className="bg-white/[0.03] rounded-lg px-3 py-2 text-center cursor-pointer hover:bg-white/[0.06] transition-colors list-none flex items-center justify-center gap-1">
                <Activity className="h-3 w-3 text-white/40" />
                <span className="text-xs text-white/40">Solar Context</span>
                <span className="text-xs text-white/40 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="bg-white/[0.03] rounded-lg p-2 mt-1 text-center">
                <p className="text-[10px] text-white/50">Solar: {result.level} ({result.signal})</p>
              </div>
            </details>
            )}

            {/* Signature */}
            {result.signature && (
              <div className="bg-white/[0.02] rounded-lg px-3 py-1.5 text-center mt-3">
                <p className="text-[10px] text-white/15 font-mono tracking-widest">{result.signature}</p>
              </div>
            )}

            {/* Source */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-white/40 mt-3">
              <Shield className="h-3 w-3" /><Zap className="h-3 w-3" /><Brain className="h-3 w-3" />
              <span>{result.source}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {result && result.answer === 'error' && (
          <div className="rounded-2xl p-5 text-center space-y-2 bg-white/[0.03] border border-white/10">
            <div className="text-3xl">⚠️</div>
            <p className="text-lg font-bold text-white">Could not reach governance</p>
            <p className="text-sm text-white/60">Check your connection and try again</p>
          </div>
        )}

        {/* Public Feed */}
        {feed.length > 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-4 py-2 border-b border-white/[0.04]">
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Live feed</p>
            </div>
            <div className="divide-y divide-white/[0.03] max-h-64 overflow-y-auto">
              {feed.slice(0, 20).map((entry, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedEntry(entry)}
                  className="px-4 py-2 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60 truncate">{entry.proposal}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{formatTime(entry.timestamp)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-white/50">{entry.activityLevel}</span>
                    <span className={`text-xs font-bold ${verdictColor(entry.recommendation)}`}>
                      {(entry.resonanceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feed Detail Modal */}
        {selectedEntry && selectedEntry.response && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedEntry(null)}
          >
            <div
              className="bg-[#0a0a0f] border border-white/10 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-5 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-white/60 truncate">{selectedEntry.proposal}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{formatFullTime(selectedEntry.timestamp)}</p>
                </div>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-white/40 hover:text-white/80 shrink-0 text-lg leading-none"
                >✕</button>
              </div>

              <div className="space-y-3">
                <p className={`text-lg font-bold ${verdictColor(selectedEntry.recommendation)}`}>
                  {selectedEntry.recommendation}
                </p>

                {(() => {
                  const r = selectedEntry.response
                  return <>
                    {/* Current TDF */}
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 font-semibold">Current TDF formula</p>
                      <div className="space-y-1.5">
                        <Row label="Structural Resonance" v={r.structuralResonance} color={scoreColor(r.structuralResonance)} />
                        <Row label="Proximity" v={r.proximity} />
                        <Row label="Phase Alignment" v={r.phaseAlignment} />
                        <Row label="Vortex Alignment" v={r.vortexAlignment} />
                        <Row label="Synchronization" v={r.synchronization} />
                        <Row label="Signal Timing" v={r.signalTiming} plain />
                      </div>
                    </div>

                    {/* Wave */}
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 font-semibold">Wave (raw)</p>
                      <div className="space-y-1.5">
                        <Row label="Wave Proximity" v={r.waveProximity} />
                        <Row label="Wave Vortex" v={r.waveVortexAlignment} />
                        <Row label="Wave Sync" v={r.waveSynchronization} color={scoreColor(r.waveSynchronization, 0.5, 0.1)} />
                      </div>
                    </div>

                    {/* Hybrid */}
                    {r.hybrid4DComposite != null && (
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 font-semibold">Hybrid</p>
                        <div className="space-y-1.5">
                          <Row label="Hybrid 4D" v={r.hybrid4DComposite} color={verdictColor(r.hybridVerdict)} bold />
                          <Row label="Verdict" v={r.hybridVerdict} plain color={verdictColor(r.hybridVerdict)} />
                          <Row label="Wave Vortex (cal)" v={r.hybridVortexAlignment} />
                        </div>
                      </div>
                    )}

                    {/* Full Box */}
                    {r.fullBox4DComposite != null && (
                      <div>
                        <p className="text-[10px] text-cyan-500/60 uppercase tracking-wider mb-1.5 font-semibold">Full Box</p>
                        <div className="space-y-1.5">
                          <Row label="Full Box 6D" v={r.fullBox4DComposite} color={verdictColor(r.fullBoxVerdict)} bold />
                          <Row label="Verdict" v={r.fullBoxVerdict} plain color={verdictColor(r.fullBoxVerdict)} />
                          {r.fullBoxThresholds && <Row label="Thresholds (S/G/W)" plain v={`${(r.fullBoxThresholds.strong*100).toFixed(0)}/${(r.fullBoxThresholds.good*100).toFixed(0)}/${(r.fullBoxThresholds.weak*100).toFixed(0)}`} color="text-white/40" />}
                          <Row label="Wave Proximity" v={r.fullBoxProximity} />
                          <Row label="Wave Vortex (cal)" v={r.fullBoxVortexAlignment} />
                          <Row label="Wave Sync (cal)" v={r.fullBoxSynchronization} />
                          <Row label="Neural Prox (6D)" v={r.fullBoxNeuralProximity} />
                          <Row label="Neural Vortex (6D)" v={r.fullBoxNeuralVortex} />
                        </div>
                      </div>
                    )}
                    {r.fullBox7DComposite != null && (
                      <div className="mt-2">
                        <p className="text-[10px] text-amber-500/60 uppercase tracking-wider mb-1.5 font-semibold">Full Box 7D (+gematria)</p>
                        <div className="space-y-1.5">
                          <Row label="Full Box 7D" v={r.fullBox7DComposite} color={verdictColor(r.fullBox7DVerdict)} bold />
                          <Row label="7D Verdict" v={r.fullBox7DVerdict} plain color={verdictColor(r.fullBox7DVerdict)} />
                          <Row label="Gematria Res" v={r.fullBoxGematriaResonance} />
                        </div>
                      </div>
                    )}

                    {/* Neural Quantum Realms */}
                    {r.neuralWaveProximity != null && (
                      <div>
                        <p className="text-[10px] text-rose-500/60 uppercase tracking-wider mb-1.5 font-semibold">Neural Quantum Realms</p>
                        <div className="space-y-1.5">
                          <Row label="Neural Proximity (per-dim MSE)" v={r.neuralWaveProximity} />
                          <Row label="Neural Vortex (cosine sim)" v={r.neuralWaveVortexAlignment} />
                        </div>
                      </div>
                    )}

                    {/* Extra */}
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 font-semibold">Details</p>
                      <div className="space-y-1.5">
                        <Row label="Solar" v={r.solarContext?.solarActivityLevel} plain />
                        <Row label="TDF (proposal)" v={r.proposalTdf?.toExponential(3)} plain />
                        <Row label="TDF (sun)" v={r.solarReferenceTdf?.toExponential(3)} plain />
                      </div>
                    </div>
                  </>
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {result && result.answer !== 'error' && (
          <div className="flex gap-3">
            <button
              onClick={() => { setResult(null); setProposal(''); }}
              className="flex-1 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/70 text-sm font-medium flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              Ask another
            </button>
            <button
              onClick={shareVerdict}
              className="flex-1 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/70 text-sm font-medium flex items-center justify-center gap-2 transition-all"
            >
              <Share2 className="h-4 w-4" />
              Share verdict
            </button>
          </div>
        )}

        <p className="text-center text-[10px] text-white/25">Powered by NOAA · Resonance + Solar + Neural</p>

      </div>
    </div>
  );
}
