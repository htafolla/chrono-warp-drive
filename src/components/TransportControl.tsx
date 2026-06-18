import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Rocket, Sun, Waves, Hash, AlertCircle, CheckCircle2, XCircle, Shield, Orbit, Radio, Loader2 } from 'lucide-react';

import { DYNAMO_MCP_URL as MCP_URL } from '@/config/platform-env';

interface TransportControlProps {
  simple?: boolean;
}

interface TemporalRecord {
  recommendation: string;
  confidence: number;
  resonanceScore: number;
  structuralResonance: number;
  proximity: number;
  phaseAlignment: number;
  vortexAlignment: number;
  synchronization: number;
  solarContext: {
    solarActivityLevel: string;
    solarActivityModifier: number;
    recommendation: string;
    solarIsotopicResonance: number;
    proposalTdf: number;
    solarReferenceTdf: number;
  };
  hammerReason: string;
  signalTiming: string;
  crossCorrelationLag: number;
  hybridVerdict: string;
  hybrid4DComposite: number;
  fullBoxVerdict: string;
  fullBox4DComposite: number;
  fullBoxProximity: number;
  fullBoxVortexAlignment: number;
  fullBoxSynchronization: number;
  fullBoxNeuralProximity: number;
  fullBoxNeuralVortex: number;
  fullBoxThresholds: { strong: number; good: number; weak: number };
  neuralWaveProximity: number;
  neuralWaveVortexAlignment: number;
  smoothedResonance?: number;
  trend?: string;
  momentum?: number;
  peakForecast?: { estimatedPeakResonance: number; minutesToPeak: number; windowQuality: string };
  adaptiveThresholds: { strong: number; good: number; weak: number };
  spectralQuality?: number;
  neuralContextUsed: boolean;
  trinitariumMoralScore?: number;
  trinitariumVirtueAlignment?: number;
  trinitariumHarmPotential?: number;
  trinitariumIntentAlignment?: number;
  trinitariumSacredTextAffinity?: number;
  trinitariumDetectedVirtues?: string[];
  trinitariumDetectedConcerns?: string[];
  trinitariumGematriaFusion?: number;
  moralNumerologicalTension?: string;
}

type StageId = 'ingestion' | 'tdf' | 'kuramoto' | 'wave' | 'verdict';

interface StageDef {
  id: StageId;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const STAGES: StageDef[] = [
  { id: 'ingestion', label: 'Solar Ingestion', description: 'Fetching real-time solar data from NOAA GOES', icon: <Radio className="h-4 w-4" /> },
  { id: 'tdf', label: 'TDF Computation', description: 'Computing Temporal Displacement Factor', icon: <Hash className="h-4 w-4" /> },
  { id: 'kuramoto', label: 'Kuramoto Coupling', description: 'Running N=3 oscillator phase alignment', icon: <Waves className="h-4 w-4" /> },
  { id: 'wave', label: 'Wave Propagation', description: 'Propagating resonance through temporal field', icon: <Orbit className="h-4 w-4" /> },
  { id: 'verdict', label: 'Governance Verdict', description: 'Evaluating against adaptive thresholds', icon: <Shield className="h-4 w-4" /> },
];

const STAGE_DURATION_MS: Record<StageId, number> = {
  ingestion: 600,
  tdf: 500,
  kuramoto: 600,
  wave: 500,
  verdict: Infinity,
};

const TransportControl = ({ simple }: TransportControlProps) => {
  const [proposal, setProposal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<TemporalRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentStageIdx, setCurrentStageIdx] = useState(-1);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('proposal');
    if (p) setProposal(p);
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const advanceStages = useCallback(() => {
    setCurrentStageIdx(0);
    clearTimers();
    STAGES.forEach((stage, i) => {
      if (stage.id === 'verdict') return;
      const timer = setTimeout(() => {
        setCurrentStageIdx(i + 1);
      }, STAGE_DURATION_MS[stage.id]);
      timersRef.current.push(timer);
    });
  }, [clearTimers]);

  const createTemporalRecord = async () => {
    if (!proposal || proposal.length < 10) {
      setError('Proposal must be at least 10 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    setRecord(null);
    advanceStages();

    try {
      const res = await fetch(`${MCP_URL}/govern_with_solar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal,
          baseVoteWeight: 1.0,
          sharePublicly: true,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();
      setRecord(data);
      setCurrentStageIdx(STAGES.length - 1);
    } catch (err: any) {
      setError(err.message || 'Failed to create temporal record');
    } finally {
      clearTimers();
      setLoading(false);
    }
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'PASS':
        return <Badge className="bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" />PASS</Badge>;
      case 'NEEDS_REVISION':
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" />NEEDS REVISION</Badge>;
      case 'REJECT':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />REJECT</Badge>;
      default:
        return <Badge variant="outline">{verdict}</Badge>;
    }
  };

  const dimBar = (label: string, value: number | undefined | null, color: string) => {
    const v = value ?? 0;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono">{v.toFixed(3)}</span>
        </div>
        <Progress value={v * 100} className={`h-1.5 ${color}`} />
      </div>
    );
  };

  const solarLabel = (level: string) => {
    switch (level) {
      case 'quiet': return <Badge variant="outline" className="border-green-500 text-green-500">Quiet</Badge>;
      case 'moderate': return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Moderate</Badge>;
      case 'active': return <Badge variant="outline" className="border-orange-500 text-orange-500">Active</Badge>;
      case 'storm': return <Badge variant="destructive">Storm</Badge>;
      default: return <Badge variant="outline">{level}</Badge>;
    }
  };

  const content = (
    <div className="space-y-4">
      {/* Proposal Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Proposal or Event Text</label>
        <Textarea
          placeholder="Enter a proposal, decision, or event to create a temporal record..."
          value={proposal}
          onChange={(e) => setProposal(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Minimum 10 characters. This text will be bound to the current solar moment.
        </p>
      </div>

      {/* Create Button */}
      <Button
        onClick={createTemporalRecord}
        disabled={loading || !proposal || proposal.length < 10}
        className="w-full gap-2"
        size="lg"
      >
        <Sun className="h-5 w-5" />
        Create Temporal Record
      </Button>

      {/* Pipeline Visualization */}
      {loading && (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Running temporal pipeline…</span>
          </div>
          <div className="flex items-center justify-between">
            {STAGES.map((stage, i) => (
              <div key={stage.id} className="flex-1 flex flex-col items-center relative">
                {/* Connecting line */}
                {i > 0 && (
                  <div className={`absolute top-[14px] right-1/2 w-full h-[2px] transition-colors duration-500 ${
                    i <= currentStageIdx ? 'bg-cyan-500/60' : 'bg-muted-foreground/20'
                  }`} />
                )}
                {/* Stage node */}
                <div className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all duration-500 ${
                  i < currentStageIdx
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                    : i === currentStageIdx
                    ? 'bg-cyan-500/30 border-cyan-400 text-cyan-300 animate-pulse'
                    : 'bg-muted/30 border-muted-foreground/30 text-muted-foreground/50'
                }`}>
                  {i < currentStageIdx ? <CheckCircle2 className="h-3.5 w-3.5" /> : stage.icon}
                </div>
                {/* Label */}
                <span className={`mt-1.5 text-[10px] text-center leading-tight transition-colors duration-500 ${
                  i <= currentStageIdx ? 'text-foreground/80' : 'text-muted-foreground/40'
                }`}>
                  {stage.label}
                </span>
              </div>
            ))}
          </div>
          <div className="text-center text-[10px] text-muted-foreground/60">
            {currentStageIdx >= 0 && currentStageIdx < STAGES.length
              ? STAGES[currentStageIdx].description
              : 'Initializing…'}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Temporal Record Result */}
      {record && (
        <div className="space-y-4">
          <Separator />

          {/* Verdict + Solar Context Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getVerdictBadge(record.recommendation)}
              <span className="text-sm text-muted-foreground">
                Confidence: {(record.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-yellow-500" />
              {solarLabel(record.solarContext.solarActivityLevel)}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{record.hammerReason}</p>

          {/* Solar Snapshot */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Solar Snapshot</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
              <span className="text-muted-foreground">Isotopic Resonance:</span>
              <span>{(record.solarContext.solarIsotopicResonance * 100).toFixed(1)}%</span>
              <span className="text-muted-foreground">Proposal TDF:</span>
              <span>{record.solarContext.proposalTdf?.toExponential(3) ?? 'N/A'}</span>
              <span className="text-muted-foreground">Solar Reference TDF:</span>
              <span>{record.solarContext.solarReferenceTdf?.toExponential(3) ?? 'N/A'}</span>
              <span className="text-muted-foreground">Solar Modifier:</span>
              <span>{(record.solarContext.solarActivityModifier >= 0 ? '+' : '') + record.solarContext.solarActivityModifier.toFixed(3)}</span>
            </div>
          </div>

          {/* 6D Resonance Profile */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Waves className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium">6D Resonance Profile</span>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-2">
                  <div className="text-xs text-muted-foreground mb-1">Resonance Score</div>
                  <div className="text-lg font-bold font-mono">{(record.resonanceScore * 100).toFixed(1)}%</div>
                </div>
                <div className="rounded-lg border p-2">
                  <div className="text-xs text-muted-foreground mb-1">Signal Timing</div>
                  <div className="text-lg font-bold font-mono">{record.signalTiming}</div>
                </div>
              </div>
              {dimBar('Proximity', record.proximity, '')}
              {dimBar('Phase Alignment', record.phaseAlignment, '')}
              {dimBar('Vortex Alignment', record.vortexAlignment, '')}
              {dimBar('Synchronization', record.synchronization, '')}
              {dimBar('Neural Proximity', record.fullBoxNeuralProximity, '')}
              {dimBar('Neural Vortex', record.fullBoxNeuralVortex, '')}
            </div>
          </div>

          {/* Three Concurrent Models */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Three Model Verdicts</span>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border p-2 text-center space-y-1">
                <div className="text-xs text-muted-foreground">Hammer</div>
                <div className="flex justify-center">{getVerdictBadge(record.recommendation)}</div>
                <div className="text-xs font-mono text-muted-foreground">{(record.resonanceScore * 100).toFixed(0)}%</div>
              </div>
              <div className="rounded-lg border p-2 text-center space-y-1">
                <div className="text-xs text-muted-foreground">Hybrid</div>
                <div className="flex justify-center">{getVerdictBadge(record.hybridVerdict)}</div>
                <div className="text-xs font-mono text-muted-foreground">{(record.hybrid4DComposite * 100).toFixed(0)}%</div>
              </div>
              <div className="rounded-lg border p-2 text-center space-y-1">
                <div className="text-xs text-muted-foreground">Full Box 6D</div>
                <div className="flex justify-center">{getVerdictBadge(record.fullBoxVerdict)}</div>
                <div className="text-xs font-mono text-muted-foreground">{(record.fullBox4DComposite * 100).toFixed(0)}%</div>
              </div>
              <div className="rounded-lg border p-2 text-center space-y-1">
                <div className="text-xs text-muted-foreground">Full Box 7D (+gem)</div>
                <div className="flex justify-center">{getVerdictBadge(record.fullBox7DVerdict)}</div>
                <div className="text-xs font-mono text-muted-foreground">{record.fullBox7DComposite != null ? `${(record.fullBox7DComposite * 100).toFixed(0)}%` : '—'}</div>
              </div>
            </div>
          </div>

          {/* Trinitarium Moral Overlay */}
          {record.trinitariumMoralScore != null && (
            <TooltipProvider delayDuration={300}>
            <div className="rounded-lg border bg-amber-500/[0.04] border-amber-500/20 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium">Trinitarium Moral Overlay</span>
              </div>
<div className="grid grid-cols-3 gap-2 text-center">
                  <Tooltip><TooltipTrigger asChild><div className="rounded-lg border p-2 cursor-help">
                    <div className="text-[10px] text-muted-foreground mb-0.5">Moral Score</div>
                    <div className={`text-sm font-bold font-mono ${
                      record.trinitariumMoralScore >= 0.60 ? 'text-emerald-400' :
                      record.trinitariumMoralScore >= 0.40 ? 'text-amber-400' :
                      record.trinitariumMoralScore >= 0.25 ? 'text-orange-400' : 'text-red-400'
                    }`}>{(record.trinitariumMoralScore * 100).toFixed(0)}%</div>
                  </div></TooltipTrigger><TooltipContent>Overall moral alignment (0–100%). Combines virtue, safety, intent, and sacred text affinity</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild><div className="rounded-lg border p-2 cursor-help">
                    <div className="text-[10px] text-muted-foreground mb-0.5">Fusion</div>
                    <div className="text-sm font-bold font-mono text-amber-300">
                      {record.trinitariumGematriaFusion != null ? `${(record.trinitariumGematriaFusion * 100).toFixed(0)}%` : '—'}
                    </div>
                  </div></TooltipTrigger><TooltipContent>Moral score × numerological resonance — how well moral intent aligns with the numerological moment</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild><div className="rounded-lg border p-2 cursor-help">
                    <div className="text-[10px] text-muted-foreground mb-0.5">Tension</div>
                    <div className={`text-sm font-bold font-mono ${
                      record.moralNumerologicalTension === 'Aligned' ? 'text-emerald-400' :
                      record.moralNumerologicalTension === 'Mild' ? 'text-amber-400' :
                      record.moralNumerologicalTension === 'Significant' ? 'text-orange-400' :
                      record.moralNumerologicalTension === 'Critical' ? 'text-red-400' : 'text-white/50'
                    }`}>{record.moralNumerologicalTension ?? '—'}</div>
                  </div></TooltipTrigger><TooltipContent>Moral-Numerological Tension: Aligned, Mild, Significant, or Critical</TooltipContent></Tooltip>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                  <Tooltip><TooltipTrigger asChild><span className="text-muted-foreground cursor-help">Virtue Alignment:</span></TooltipTrigger><TooltipContent>How many of the 9 virtue pillars the proposal matches</TooltipContent></Tooltip>
                  <span>{record.trinitariumVirtueAlignment != null ? `${(record.trinitariumVirtueAlignment * 100).toFixed(0)}%` : '—'}</span>
                  <Tooltip><TooltipTrigger asChild><span className="text-muted-foreground cursor-help">Moral Safety:</span></TooltipTrigger><TooltipContent>Inverse of harm potential — higher means morally safer</TooltipContent></Tooltip>
                  <span>{record.trinitariumHarmPotential != null ? `${((1 - record.trinitariumHarmPotential) * 100).toFixed(0)}%` : '—'}</span>
                  <Tooltip><TooltipTrigger asChild><span className="text-muted-foreground cursor-help">Intent Alignment:</span></TooltipTrigger><TooltipContent>Whether the proposal's intent aligns with virtue or concern patterns</TooltipContent></Tooltip>
                  <span>{record.trinitariumIntentAlignment != null ? `${(record.trinitariumIntentAlignment * 100).toFixed(0)}%` : '—'}</span>
                  <Tooltip><TooltipTrigger asChild><span className="text-muted-foreground cursor-help">Sacred Text Affinity:</span></TooltipTrigger><TooltipContent>Similarity to sacred text patterns (prayer, worship, scriptural language)</TooltipContent></Tooltip>
                  <span>{record.trinitariumSacredTextAffinity != null ? `${(record.trinitariumSacredTextAffinity * 100).toFixed(0)}%` : '—'}</span>
                </div>
              {record.trinitariumDetectedVirtues && record.trinitariumDetectedVirtues.length > 0 && (
                <div className="text-xs">
                  <span className="text-emerald-500/70">Virtues: </span>
                  <span className="text-emerald-400/80">{record.trinitariumDetectedVirtues.join(', ')}</span>
                </div>
              )}
              {record.trinitariumDetectedConcerns && record.trinitariumDetectedConcerns.length > 0 && (
                <div className="text-xs">
                  <span className="text-red-500/70">Concerns: </span>
                  <span className="text-red-400/80">{record.trinitariumDetectedConcerns.join(', ')}</span>
                </div>
              )}
            </div>
            </TooltipProvider>
          )}

          {/* Temporal Grounding Info */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium">Temporal Grounding</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
              <span className="text-muted-foreground">Trend:</span>
              <span>{record.trend ?? 'N/A'}</span>
              <span className="text-muted-foreground">Momentum:</span>
              <span>{record.momentum?.toFixed(5) ?? 'N/A'}</span>
              <span className="text-muted-foreground">Peak Estimated:</span>
              <span>{record.peakForecast ? `${(record.peakForecast.estimatedPeakResonance * 100).toFixed(1)}% in ${record.peakForecast.minutesToPeak}min` : 'N/A'}</span>
              <span className="text-muted-foreground">Neural Context:</span>
              <span>{record.neuralContextUsed ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (simple) {
    return content;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Temporal Record Creator
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};

export default TransportControl;
