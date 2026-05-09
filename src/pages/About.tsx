import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APP_NAME, APP_VERSION, APP_TAG, APP_TAGLINE, VERSION_FEATURES } from "@/lib/version";
import { Link } from "react-router-dom";

const FEATURE_DESC: Record<string, string> = {
  '4.5': 'SDSS core — Kuramoto oscillator engine',
  '4.6': 'Neural fusion + time-shift pipeline',
  '4.7': 'Multi-threaded cascade optimizer',
};

const subsystems = [
  { name: "Temporal Calculator", version: "v4.5", desc: FEATURE_DESC['4.5'] },
  { name: "Time Machine Ascension", version: "v4.6", desc: FEATURE_DESC['4.6'] },
  { name: "Cascade Optimization", version: "v4.7", desc: FEATURE_DESC['4.7'] },
  { name: "Isotopic Temporal Vortex", version: `v${APP_VERSION}`, desc: `${APP_TAGLINE} — phase-coherent vortex engine` },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-8 w-8 bg-gradient-to-r from-primary to-primary/60 rounded-full flex items-center justify-center">
              <div className="h-4 w-4 bg-background rounded-full animate-pulse" />
            </div>
            <h1 className="text-4xl font-semibold text-foreground">{APP_NAME}</h1>
            <Badge variant="default" className="text-xs">{APP_TAG}</Badge>
          </div>
          <p className="text-muted-foreground">Temporal Phase Transport — Isotropic Time Vortex v{APP_VERSION}</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>About BLURRN v{APP_VERSION}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              The Blurrn Unified Resonance & Relativity Navigator is a temporal phase transport system
              that models, simulates, and optimizes phase-coherent energy transport through isotropic
              time vortices. v{APP_VERSION} introduces the Isotopic Temporal Vortex engine — a
              numerically stable phase-coherence core for large TDF values.
            </p>
            <p>
              Built on a layered architecture spanning four major subsystem generations, each
              progressively refining the precision and stability of temporal energy calculations.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subsystem Architecture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subsystems.map((s) => (
              <div key={s.version} className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge variant="outline" className="shrink-0 mt-0.5">{s.version}</Badge>
                <div>
                  <div className="font-medium text-foreground">{s.name}</div>
                  <div className="text-sm text-muted-foreground">{s.desc}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Build Info</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>Runtime: Browser (React + Vite)</p>
            <p>Engine: Isotropic Temporal Vortex (phase-coherent TDF)</p>
            <p>Repository: github.com/htafolla/chrono-warp-drive</p>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to="/" className="text-sm text-primary hover:underline">
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
