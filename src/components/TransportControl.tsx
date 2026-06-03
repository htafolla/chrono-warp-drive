import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Rocket, Sun, Waves, Hash, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

const MCP_URL = 'https://mcp-production-80e2.up.railway.app';

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
}

const TransportControl = ({ simple }: TransportControlProps) => {
  const [proposal, setProposal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<TemporalRecord | null>(null);
  const [copied, setCopied] = useState(false);

  const createTemporalRecord = async () => {
    if (!proposal || proposal.length < 10) {
      setError('Proposal must be at least 10 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    setRecord(null);

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
    } catch (err: any) {
      setError(err.message || 'Failed to create temporal record');
    } finally {
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
        <Sun className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Contacting Sun...' : 'Create Temporal Record'}
      </Button>

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
