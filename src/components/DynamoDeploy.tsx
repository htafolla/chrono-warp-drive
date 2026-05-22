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

const EXAMPLE_PROPOSALS = [
  'Should I go hiking tomorrow?',
  'Can I fly my drone this weekend?',
  'Is it safe to deploy tonight?',
  'Should I schedule surgery Friday?',
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
  governanceConfidence: number | null;
  solarApplied: boolean;
  resonanceScore: number | null;
  isotopicRatio: number | null;
  historicalCoherence: number | null;
  signature: string;
  alignmentRec: string | null;
  alignmentReason: string | null;
  tension: string | null;
  source: string;
}

async function checkGovernance(proposal: string): Promise<GovernanceResult | null> {
  try {
    const proposalLabel = proposal.length < 30 ? proposal + ' — via Dynamo governance' : proposal;
    const [solarRes, alignRes, neuralRes] = await Promise.allSettled([
      fetch(`${MCP_URL}/govern_with_solar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal, baseVoteWeight: 1 }),
        signal: AbortSignal.timeout(15000),
      }).then(async r => r.ok ? r.json() : null),
      fetch(`${MCP_URL}/governance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: `ui-${Date.now()}`, proposalText: proposalLabel, agentReviews: ['UI submission'] }),
        signal: AbortSignal.timeout(15000),
      }).then(async r => r.ok ? r.json() : null),
      fetch(`${NEURAL_URL}/process-current-sun`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
      }).then(async r => r.ok ? r.json() : null),
    ]);

    const solar = solarRes.status === 'fulfilled' ? solarRes.value : null;
    const alignment = alignRes.status === 'fulfilled' ? alignRes.value : null;
    const neural = neuralRes.status === 'fulfilled' ? neuralRes.value : null;

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
    const governanceConfidence = alignment?.confidence ?? null;
    const solarApplied = neural?.neuralOutput?.solarApplied ?? neural?.solarModulation?.solar_applied ?? (solar?.solarContext != null) ?? false;

    const resonanceScore = alignment?.resonanceScore != null ? Number(alignment.resonanceScore) : null;
    const isotopicRatio = alignment?.isotopicRatio != null ? Number(alignment.isotopicRatio) : null;
    const historicalCoherence = alignment?.historicalCoherence != null ? Number(alignment.historicalCoherence) : null;
    const alignmentRec = alignment?.recommendation ?? null;
    const alignmentReason = alignment?.reasons?.[0] ?? null;

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

    const clearSolar = !isStorm && !isBadSignal;
    const clearAlign = !isRejected && !isNeedsRevision;
    let tension: string | null = null;
    if (clearSolar && !clearAlign) tension = 'Solar clear but alignment weak';
    else if (!clearSolar && clearAlign) tension = 'Proposal aligned but conditions unfavorable';
    else if (isBadSignal && isNeedsRevision) tension = 'Both oscillators flag caution';

    const sources = [solar ? 'Solar' : '', alignment ? 'Alignment' : '', neural ? 'Neural' : ''].filter(Boolean);
    const source = sources.length >= 2 ? sources.join(' + ') : sources[0] || 'unknown';

    const sigInput = [proposal, alignment?.resonanceScore ?? '', alignment?.isotopicRatio ?? '', alignment?.recommendation ?? ''].join('|');
    const signature = `dynamo-${hashProposal(sigInput)}`;

    return {
      answer, detail, phrase, level: levelLabel, signal: signalLabel,
      weight: adjustedWeight, gain, metamorphosisIndex, confidenceScore, governanceConfidence,
      solarApplied, resonanceScore, isotopicRatio, historicalCoherence,
      signature, alignmentRec, alignmentReason, tension, source,
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

  const run = useCallback(async (text?: string) => {
    const input = (text || proposal).trim();
    if (!input) return;
    setLoading(true);
    setResult(null);
    setLastProposal(input);
    if (text) setProposal(text);
    const r = await checkGovernance(input);
    setResult(r);
    setLoading(false);
  }, [proposal]);

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
    if (result.confidenceScore != null) lines.push(`Neural ${(result.confidenceScore * 100).toFixed(1)}%`);
    lines.push('dynamo-ui-psi.vercel.app');
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
  }, [result, lastProposal]);

  const beacons = [
    { name: 'Dynamo', emoji: '⚡', sub: 'MCP', on: services[0] },
    { name: 'Stellar', emoji: '✦', sub: 'MCP', on: services[1] },
    { name: 'Neural', emoji: '🧬', sub: neuralVersion, on: services[2] },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-5xl mb-2">⚡</div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dynamo</h1>
          <p className="text-sm text-white/40 mt-1">Solar + Alignment + Neural · Should you? The sun knows.</p>
        </div>

        {/* Beacon dots */}
        <div className="flex items-center justify-center gap-3">
          {beacons.map(b => (
            <div key={b.name} className="flex items-center gap-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${b.on ? 'bg-emerald-500' : beaconOnline === null ? 'bg-white/20 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs text-white/40">{b.emoji} {b.name} <span className="text-white/20">{b.sub}</span></span>
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

        {/* Info */}
        <div className="text-center space-y-1">
          <p className="text-xs text-white/25">Solar context + proposal alignment + neural metrics = your verdict</p>
          <div className="flex items-center justify-center gap-2 text-[10px] text-white/15">
            <Zap className="h-3 w-3" /><span>Solar</span>
            <span>+</span>
            <Shield className="h-3 w-3" /><span>Alignment</span>
            <span>+</span>
            <Brain className="h-3 w-3" /><span>Neural</span>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <textarea
            value={proposal}
            onChange={e => setProposal(e.target.value)}
            placeholder="Should I go hiking tomorrow?"
            rows={3}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-white text-base placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none transition-all"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(); } }}
            disabled={loading}
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROPOSALS.map(p => (
              <button
                key={p}
                onClick={() => run(p)}
                disabled={loading}
                className="text-xs bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70 border border-white/[0.06] rounded-full px-3 py-1.5 transition-all disabled:opacity-30"
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => run()}
            disabled={loading || !proposal.trim()}
            className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-lg shadow-violet-600/20"
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {loading ? 'Analyzing proposal...' : 'Ask Dynamo'}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-2xl p-5 text-center space-y-3 border shadow-xl ${
            result.answer === 'yes' ? 'bg-emerald-500/[0.07] border-emerald-500/30 shadow-emerald-500/5' :
            result.answer === 'no' ? 'bg-red-500/[0.07] border-red-500/30 shadow-red-500/5' :
            'bg-amber-500/[0.07] border-amber-500/30 shadow-amber-500/5'
          }`}>
            <div className="text-4xl">{result.answer === 'yes' ? '✅' : result.answer === 'no' ? '❌' : '🔄'}</div>
            <p className="text-xl font-bold text-white">
              {result.answer === 'yes' ? 'Go for it' : result.answer === 'no' ? 'Not now' : 'Be careful'}
            </p>
            <p className="text-sm text-white/50 italic">&ldquo;{result.phrase}&rdquo;</p>

            {/* Solar + Signal */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                <p className="text-[10px] text-white/30 uppercase">Solar</p>
                <p className="text-sm font-semibold text-white">{result.level}</p>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                <p className="text-[10px] text-white/30 uppercase">Signal</p>
                <p className="text-sm font-semibold text-white">{result.signal}</p>
              </div>
            </div>

            {/* Resonance + Alignment */}
            {result.resonanceScore != null && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Shield className="h-2.5 w-2.5 text-blue-400/60" />
                      <p className="text-[10px] text-white/30 uppercase">Res.</p>
                    </div>
                    <p className="text-sm font-semibold text-white">{(result.resonanceScore * 100).toFixed(0)}%</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className={`text-[10px] font-bold ${alignColor(result.alignmentRec)}`}>{alignIcon(result.alignmentRec)}</span>
                      <p className="text-[10px] text-white/30 uppercase">Align</p>
                    </div>
                    <p className={`text-sm font-semibold ${alignColor(result.alignmentRec)}`}>{alignLabel(result.alignmentRec)}</p>
                  </div>
                </div>
                {result.signature && (
                  <div className="bg-white/[0.02] rounded-lg px-3 py-1.5 text-center">
                    <p className="text-[10px] text-white/30 font-mono tracking-widest">{result.signature}</p>
                  </div>
                )}
                {result.alignmentReason && (
                  <p className="text-[10px] text-white/30 italic text-center">&ldquo;{result.alignmentReason}&rdquo;</p>
                )}
              </div>
            )}

            {/* Neural metrics */}
            {(result.metamorphosisIndex != null || result.governanceConfidence != null) && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {result.metamorphosisIndex != null && (
                    <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Brain className="h-2.5 w-2.5 text-violet-400/60" />
                        <p className="text-[10px] text-white/30 uppercase">MI</p>
                      </div>
                      <p className="text-sm font-semibold text-white">{(result.metamorphosisIndex * 100).toFixed(1)}%</p>
                    </div>
                  )}
                  {result.governanceConfidence != null && (
                    <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Shield className="h-2.5 w-2.5 text-emerald-400/60" />
                        <p className="text-[10px] text-white/30 uppercase">Gov</p>
                      </div>
                      <p className="text-sm font-semibold text-white">{(result.governanceConfidence * 100).toFixed(1)}%</p>
                    </div>
                  )}
                </div>
                {result.confidenceScore != null && (
                  <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Brain className="h-2.5 w-2.5 text-emerald-400/60" />
                      <p className="text-[10px] text-white/30 uppercase">Neural</p>
                    </div>
                    <p className="text-sm font-semibold text-white">{(result.confidenceScore * 100).toFixed(1)}%</p>
                  </div>
                )}
              </div>
            )}

            {/* Gain bar */}
            <div className="bg-white/[0.02] rounded-lg p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-3 w-3 text-white/30" />
                  <span className="text-[10px] text-white/30">Coupling</span>
                </div>
                <span className="text-[10px] text-white/40">{result.gain}x · {gainLabel(result.gain)}</span>
              </div>
              <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div className={`h-full rounded-full transition-all ${
                  result.gain >= 1.3 ? 'bg-red-400' : result.gain >= 1 ? 'bg-amber-400' : result.gain >= 0.75 ? 'bg-violet-400' : 'bg-emerald-400'
                } ${gainWidth(result.gain)}`} />
              </div>
            </div>

            {/* Tension */}
            {result.tension && (
              <div className="bg-amber-500/[0.08] border border-amber-500/20 rounded-lg px-3 py-2 text-center">
                <p className="text-[11px] text-amber-300/80">⚠ {result.tension}</p>
              </div>
            )}

            {/* Source */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-white/20">
              <Zap className="h-3 w-3" /><Shield className="h-3 w-3" /><Brain className="h-3 w-3" />
              <span>{result.source}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {result && result.answer === 'error' && (
          <div className="rounded-2xl p-5 text-center space-y-2 bg-white/[0.03] border border-white/10">
            <div className="text-3xl">⚠️</div>
            <p className="text-lg font-bold text-white">Could not reach governance</p>
            <p className="text-sm text-white/40">Check your connection and try again</p>
          </div>
        )}

        {/* Actions */}
        {result && result.answer !== 'error' && (
          <div className="flex gap-3">
            <button
              onClick={() => { setResult(null); setProposal(''); }}
              className="flex-1 h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/60 text-sm font-medium flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              Ask another
            </button>
            <button
              onClick={shareVerdict}
              className="flex-1 h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/60 text-sm font-medium flex items-center justify-center gap-2 transition-all"
            >
              <Share2 className="h-4 w-4" />
              Share verdict
            </button>
          </div>
        )}

        <p className="text-center text-[10px] text-white/10">Powered by NOAA · Solar + Alignment + Neural</p>
      </div>
    </div>
  );
}
