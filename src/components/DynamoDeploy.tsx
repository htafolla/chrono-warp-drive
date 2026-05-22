import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Sun, Zap, Shield, Radio } from 'lucide-react';
import { APP_TAG } from '@/lib/version';

const MCP_URL = 'https://mcp-production-80e2.up.railway.app';
const STELLAR_URL = 'https://stellar-mcp-production.up.railway.app';
const NEURAL_URL = 'https://neural-fusion-backend-production.up.railway.app';

interface Beacon {
  name: string;
  icon: string;
  online: boolean;
  channels?: number;
  sunStatus?: string;
  signalBoost?: string;
  ping: number;
  loading: boolean;
  error?: string;
}

const BEACON_ICONS: Record<string, string> = {
  dynamo: '⚡',
  stellar: '✦',
  neural: '🧬',
};

async function ping(url: string): Promise<{ ok: boolean; channels?: number; ping: number; error?: string; sunStatus?: string; signalBoost?: string }> {
  const t0 = performance.now();
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false, ping: performance.now() - t0, error: `HTTP ${res.status}` };
    const data = await res.json();
    const ping = performance.now() - t0;
    let sunStatus: string | undefined;
    let signalBoost: string | undefined;
    if (data.name === 'blurrn-mcp') {
      try {
        const gov = await fetch(`${url}/govern_with_solar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposal: 'signal check', baseVoteWeight: 1.0 }),
          signal: AbortSignal.timeout(10000),
        });
        if (gov.ok) {
          const g = await gov.json();
          const level = g.solarContext?.solarActivityLevel;
          const modifier = g.solarContext?.solarActivityModifier;
          if (level === 'storm') sunStatus = 'storms';
          else if (level === 'active') sunStatus = 'active';
          else if (level === 'moderate') sunStatus = 'calm';
          else sunStatus = 'quiet';
          signalBoost = modifier >= 0 ? `+${(modifier * 100).toFixed(0)}%` : `${(modifier * 100).toFixed(0)}%`;
        }
      } catch { /* optional */ }
    }
    return { ok: true, channels: data.tools, ping, sunStatus, signalBoost };
  } catch (err: unknown) {
    return { ok: false, ping: performance.now() - t0, error: err instanceof Error ? err.message : 'unreachable' };
  }
}

function statusLabel(b: Beacon): string {
  if (b.loading) return 'Checking...';
  if (!b.online) return 'Offline';
  if (b.sunStatus === 'storms') return 'Standing by — solar storm';
  if (b.sunStatus === 'active') return 'Online — sun is active';
  return 'Online — all clear';
}

export default function DynamoDeploy() {
  const [beacons, setBeacons] = useState<Beacon[]>([
    { name: 'dynamo', icon: BEACON_ICONS.dynamo, online: false, ping: 0, loading: false },
    { name: 'stellar', icon: BEACON_ICONS.stellar, online: false, ping: 0, loading: false },
    { name: 'neural', icon: BEACON_ICONS.neural, online: false, ping: 0, loading: false },
  ]);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(0);

  const scan = useCallback(async () => {
    setScanning(true);
    const urls = [MCP_URL, STELLAR_URL, NEURAL_URL];
    const names = ['dynamo', 'stellar', 'neural'];
    for (let i = 0; i < 3; i++) {
      setBeacons(prev => prev.map(b => b.name === names[i] ? { ...b, loading: true } : b));
      const r = await ping(urls[i]);
      setBeacons(prev => prev.map(b => b.name === names[i] ? {
        ...b,
        loading: false,
        online: r.ok,
        channels: r.channels,
        ping: r.ping,
        error: r.error,
        sunStatus: r.sunStatus,
        signalBoost: r.signalBoost,
      } : b));
    }
    setScanning(false);
    setLastScan(Date.now());
  }, []);

  useEffect(() => { scan(); }, [scan]);

  const allOnline = beacons.every(b => b.online);
  const totalChannels = beacons.reduce((s, b) => s + (b.channels ?? 0), 0);
  const dynamo = beacons.find(b => b.name === 'dynamo');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-4xl">{allOnline ? '⚡' : scanning ? '📡' : '🌑'}</div>
          <h1 className="text-xl font-bold text-foreground">
            {allOnline ? 'All Beacons Online' : scanning ? 'Scanning...' : 'Some Beaacons Offline'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {allOnline
              ? `${totalChannels} channels open — ready to receive`
              : 'Tap Scan to check again'}
          </p>
        </div>

        {/* Big status */}
        <Card className={`border-2 transition-all ${allOnline ? 'border-emerald-500/40 bg-emerald-500/5' : scanning ? 'border-amber-500/40 bg-amber-500/5' : 'border-red-500/40 bg-red-500/5'}`}>
          <CardContent className="p-6 text-center space-y-3">
            {scanning ? (
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-400" />
            ) : allOnline ? (
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
            ) : (
              <XCircle className="h-8 w-8 mx-auto text-red-500" />
            )}
            <p className="text-lg font-semibold">
              {beacons.filter(b => b.online).length} of {beacons.length} beacons online
            </p>
            {dynamo?.sunStatus && (
              <div className="flex items-center justify-center gap-2">
                <Sun className={`h-4 w-4 ${dynamo.sunStatus === 'storms' ? 'text-red-400' : dynamo.sunStatus === 'active' ? 'text-amber-400' : 'text-emerald-400'}`} />
                <span className="text-sm text-muted-foreground">
                  Sun: <span className="text-foreground font-medium">{dynamo.sunStatus}</span>
                  {dynamo.signalBoost && (
                    <span className="ml-1">({dynamo.signalBoost} to readings)</span>
                  )}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Beacon cards */}
        <div className="space-y-2">
          {beacons.map(b => (
            <Card key={b.name} className={`transition-all ${b.online ? 'border-emerald-500/20' : b.loading ? 'border-amber-500/20' : 'border-red-500/20'}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{b.icon}</span>
                  <div>
                    <p className="font-medium capitalize text-foreground">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{statusLabel(b)}</p>
                  </div>
                </div>
                <div className="text-right">
                  {b.loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : b.online ? (
                    <div className="space-y-0.5 text-right">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs text-muted-foreground">{b.ping.toFixed(0)}ms</span>
                      </div>
                      {b.channels && <p className="text-[10px] text-muted-foreground">{b.channels} channels</p>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      <span className="text-xs text-red-400">{b.error ? 'Error' : 'Down'}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Scan button */}
        <Button onClick={scan} disabled={scanning} className="w-full h-12 text-base gap-2" variant={allOnline ? 'default' : 'secondary'}>
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {scanning ? 'Scanning...' : 'Scan Beacons'}
        </Button>

        {lastScan > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Last scan: {new Date(lastScan).toLocaleTimeString()}
          </p>
        )}

        {/* Quick signal test */}
        <SignalTest />

        <p className="text-center text-[10px] text-muted-foreground/50 pt-4">{APP_TAG}</p>
      </div>
    </div>
  );
}

function SignalTest() {
  const [data, setData] = useState<{ sun: string; boost: string; reading: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${MCP_URL}/govern_with_solar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal: 'signal test', baseVoteWeight: 1.0 }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const sc = json.solarContext || {};
      const level = sc.solarActivityLevel || '?';
      const modifier = sc.solarActivityModifier ?? 0;
      const sunLabel = level === 'storm' ? 'Storm ⛈️' : level === 'active' ? 'Active 🌤️' : level === 'moderate' ? 'Calm ☀️' : 'Quiet 🌙';
      const boostLabel = modifier >= 0 ? `+${(modifier * 100).toFixed(0)}%` : `${(modifier * 100).toFixed(0)}%`;
      const reading = json.finalRecommendation?.includes('STORM WARNING') ? '⚠️ Hold — solar storm' : '✅ Clear to proceed';
      setData({ sun: sunLabel, boost: boostLabel, reading });
    } catch {
      setData({ sun: '?', boost: '?', reading: '❌ Could not reach beacon' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { run(); }, [run]);

  if (loading) return <Card className="border-border/50"><CardContent className="p-4 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">Reading signals...</p></CardContent></Card>;
  if (!data) return null;

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-medium">Signal Reading</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Sun</p>
            <p className="text-sm font-semibold">{data.sun}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Boost</p>
            <p className="text-sm font-semibold">{data.boost}</p>
          </div>
        </div>
        <div className={`rounded-lg p-3 text-center text-sm font-medium ${data.reading.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
          {data.reading}
        </div>
      </CardContent>
    </Card>
  );
}