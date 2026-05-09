import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface VortexDashboardProps {
  metrics: {
    isotopicRatio: number;
    vortexVolume: number;
    phaseCoherence: number;
    crossCorrelation: number;
  };
}

export function VortexDashboard({ metrics }: VortexDashboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Isotopic Ratio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{metrics.isotopicRatio.toFixed(4)}</div>
          <p className="text-xs text-muted-foreground mt-1">Core stability</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Vortex Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {(metrics.vortexVolume / 1e24).toFixed(2)}e24
          </div>
          <p className="text-xs text-muted-foreground mt-1">W × M = V</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Phase Coherence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{(metrics.phaseCoherence * 100).toFixed(1)}%</div>
          <Badge variant={metrics.phaseCoherence > 0.8 ? "default" : "secondary"} className="mt-2">
            {metrics.phaseCoherence > 0.8 ? "Stable" : "Drifting"}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Cross-Correlation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{(metrics.crossCorrelation * 100).toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground mt-1">Symbiotic strength</p>
        </CardContent>
      </Card>
    </div>
  );
}
