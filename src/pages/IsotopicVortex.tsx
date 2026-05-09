import { useState } from 'react';
import { VortexDashboard } from '@/components/vortex/VortexDashboard';
import { SignalEmitter } from '@/components/vortex/SignalEmitter';
import { VortexVisualizer } from '@/components/vortex/VortexVisualizer';
import { TemporalBlurrnSignal } from '@/lib/temporalBlurrnSignal';

export default function IsotopicVortex() {
  const [metrics, setMetrics] = useState({
    isotopicRatio: 0,
    vortexVolume: 0,
    phaseCoherence: 0,
    crossCorrelation: 0,
  });

  const handleEmitSignal = (input: string) => {
    const signal = new TemporalBlurrnSignal(
      { id: `signal-${Date.now()}`, content: input },
      Math.random() * 1e13 + 1e12,
      Math.floor(Math.random() * 100),
    );

    const fingerprint = signal.getIsotopicFingerprint();

    const otherSignal = new TemporalBlurrnSignal(
      { id: 'reference' },
      signal.tdfValue * (0.98 + Math.random() * 0.04),
      42,
    );

    const correlation = signal.crossCorrelate(otherSignal);

    setMetrics({
      isotopicRatio: fingerprint.isotopicRatio,
      vortexVolume: correlation.metadata.vortexVolume,
      phaseCoherence: signal.phaseCoherence,
      crossCorrelation: correlation.strength,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Isotopic Temporal Vortex</h1>
        <p className="text-muted-foreground mt-1">
          v4.8 Engine — Live isotopic signal processing and vortex visualization
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <SignalEmitter onEmit={handleEmitSignal} />
        </div>

        <div className="lg:col-span-2">
          <VortexDashboard metrics={metrics} />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Vortex Visualization</h2>
        <VortexVisualizer 
          isotopicRatio={metrics.isotopicRatio} 
          vortexVolume={metrics.vortexVolume} 
        />
      </div>
    </div>
  );
}
