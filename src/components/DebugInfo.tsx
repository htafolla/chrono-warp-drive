import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Download, FileText, AlertTriangle } from 'lucide-react';
import { DebugExporter } from '@/lib/debugExporter';
import { toast } from 'sonner';

interface DebugInfoProps {
  currentState: any;
}

export function DebugInfo({ currentState }: DebugInfoProps) {
  const debugState = DebugExporter.captureDebugState(currentState);

  const copyDebugToClipboard = async (format: 'summary' | 'json') => {
    try {
      const content = format === 'json' 
        ? DebugExporter.exportDebugJSON(currentState)
        : DebugExporter.exportDebugSummary(currentState);
      
      await navigator.clipboard.writeText(content);
      toast.success(`Debug ${format} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy debug info');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Debug Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium">System Status</p>
            <Badge variant={debugState.systemStatus.isV47Active ? "default" : debugState.systemStatus.isV46Breakthrough ? "secondary" : debugState.systemStatus.isV4Initialized ? "outline" : "outline"}>
              {debugState.systemStatus.isV47Active ? "v4.7 CTI" : debugState.systemStatus.isV46Breakthrough ? "v4.6 TDF" : debugState.systemStatus.isV4Initialized ? "v4.5 Active" : "Legacy Mode"}
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium">Neural Fusion</p>
            <Badge variant={debugState.neuralFusionDetails.isActive ? "default" : "outline"}>
              {debugState.neuralFusionDetails.isActive ? "Active" : "Standby"}
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium">Data Source</p>
            <Badge variant="outline">
              {debugState.spectrumAnalysis.fullSpectrumData?.source || "SYNTHETIC"}
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium">WebGL Support</p>
            <Badge variant={debugState.browserInfo.webglSupport ? "default" : "destructive"}>
              {debugState.browserInfo.webglSupport ? "Available" : "Not Available"}
            </Badge>
          </div>
        </div>

        {/* Issues Alert */}
        {(debugState.systemStatus.errors.length > 0 || debugState.systemStatus.warnings.length > 0) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {debugState.systemStatus.errors.length > 0 && (
                <p className="text-destructive">
                  {debugState.systemStatus.errors.length} error(s) detected
                </p>
              )}
              {debugState.systemStatus.warnings.length > 0 && (
                <p className="text-orange-600">
                  {debugState.systemStatus.warnings.length} warning(s) found
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Stats */}
        <div className="bg-muted p-3 rounded text-sm space-y-1">
          <p><strong>tPTT:</strong> {debugState.temporalState.tPTT_value.toFixed(2)}</p>
          <p><strong>E_t:</strong> {debugState.temporalState.e_t.toFixed(3)}</p>
          <p><strong>Cycle:</strong> {debugState.temporalState.cycle}</p>
          <p><strong>Spectrum Points:</strong> {debugState.spectrumAnalysis.wavelengthRange.count || 'N/A'}</p>
          {debugState.tdfBreakthrough && (
            <>
              <p><strong>TDF:</strong> {debugState.tdfBreakthrough.components.TDF_value.toExponential(2)}</p>
              <p><strong>τ (Tau):</strong> {debugState.tdfBreakthrough.components.tau.toFixed(3)}</p>
              <p><strong>Time Shift:</strong> {debugState.tdfBreakthrough.timeShiftMetrics.timeShiftCapable ? 'CAPABLE' : 'Inactive'}</p>
              <p><strong>Ethics Score:</strong> {(debugState.systemStatus.ethicsScore * 100).toFixed(0)}%</p>
            </>
          )}
          {debugState.chronoTransport && (
            <>
              <p><strong>CTI:</strong> {debugState.chronoTransport.ctiComponents.CTI_value.toExponential(2)}</p>
              <p><strong>Q_ent:</strong> {debugState.chronoTransport.chronoTransportResult.q_ent.toFixed(3)}</p>
              <p><strong>Status:</strong> {debugState.chronoTransport.chronoTransportResult.status}</p>
              <p><strong>Efficiency:</strong> {(debugState.chronoTransport.chronoTransportResult.efficiency * 100).toFixed(0)}%</p>
            </>
          )}
        </div>

        {/* v4.7 Chrono Transport Status */}
        {debugState.chronoTransport && (
          <div className="bg-secondary/10 border border-secondary/30 p-3 rounded text-sm space-y-2">
            <p className="font-medium text-secondary">v4.7 Chrono Transport Active</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <p><strong>Status:</strong> {debugState.chronoTransport.chronoTransportResult.status}</p>
              <p><strong>Score:</strong> {debugState.chronoTransport.chronoTransportResult.score.toFixed(3)}</p>
              <p><strong>Efficiency:</strong> {(debugState.chronoTransport.chronoTransportResult.efficiency * 100).toFixed(0)}%</p>
              <p><strong>Cascade N:</strong> {debugState.chronoTransport.ctiComponents.n}</p>
              <p><strong>Delta Phase:</strong> {debugState.chronoTransport.ctiComponents.delta_phase.toFixed(3)}</p>
              <p><strong>Sync Eff:</strong> {(debugState.chronoTransport.dualBlackHoleSync.syncEfficiency * 100).toFixed(0)}%</p>
            </div>
          </div>
        )}

        {/* v4.6 TDF Breakthrough Status */}
        {debugState.tdfBreakthrough && (
          <div className="bg-primary/5 border border-primary/20 p-3 rounded text-sm space-y-2">
            <p className="font-medium text-primary">TDF Breakthrough Active</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <p><strong>Validation:</strong> {debugState.tdfBreakthrough.timeShiftMetrics.breakthrough_validated ? '✓ Validated' : '⚠ Pending'}</p>
              <p><strong>Oscillator:</strong> {debugState.tdfBreakthrough.timeShiftMetrics.oscillatorMode}</p>
              <p><strong>Phase Sync:</strong> {(debugState.tdfBreakthrough.timeShiftMetrics.phaseSync * 100).toFixed(0)}%</p>
              <p><strong>Round:</strong> #{debugState.tdfBreakthrough.experimentData.roundNumber}</p>
            </div>
          </div>
        )}

        {/* Export Actions */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Export Debug State</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyDebugToClipboard('summary')}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Summary
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyDebugToClipboard('json')}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => DebugExporter.downloadDebugReport(currentState, 'summary')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Report
            </Button>
            {debugState.tdfBreakthrough && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const tdfReport = `# TDF Experiment Report
Generated: ${new Date().toISOString()}

## TDF Breakthrough Values
- TDF Value: ${debugState.tdfBreakthrough.components.TDF_value.toExponential(6)}
- τ (Tau): ${debugState.tdfBreakthrough.components.tau}
- BlackHole_Seq: ${debugState.tdfBreakthrough.components.BlackHole_Seq}
- S_L (Dynamic): ${debugState.tdfBreakthrough.components.S_L}
- E_t_growth: ${debugState.tdfBreakthrough.components.E_t_growth}

## Time Shift Status
- Capable: ${debugState.tdfBreakthrough.timeShiftMetrics.timeShiftCapable}
- Oscillator Mode: ${debugState.tdfBreakthrough.timeShiftMetrics.oscillatorMode}
- Phase Sync: ${debugState.tdfBreakthrough.timeShiftMetrics.phaseSync}
- Breakthrough Validated: ${debugState.tdfBreakthrough.timeShiftMetrics.breakthrough_validated}

## Validation Proofs
${debugState.tdfBreakthrough.validationProofs.map(proof => `- ${proof}`).join('\n')}
`;
                  navigator.clipboard.writeText(tdfReport);
                  toast.success('TDF experiment report copied');
                }}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy TDF Report
              </Button>
            )}
            {debugState.chronoTransport && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const ctiReport = `# v4.7 Chrono Transport Interface Report
Generated: ${new Date().toISOString()}

## CTI Components
- CTI Value: ${debugState.chronoTransport.ctiComponents.CTI_value.toExponential(6)}
- Cascade Index: ${debugState.chronoTransport.ctiComponents.cascade_index}
- Quantum Entanglement (Q_ent): ${debugState.chronoTransport.ctiComponents.q_ent.toExponential(6)}
- Delta Phase: ${debugState.chronoTransport.ctiComponents.delta_phase}
- Cascade N: ${debugState.chronoTransport.ctiComponents.n}

## Transport Status
- Status: ${debugState.chronoTransport.chronoTransportResult.status}
- Score: ${debugState.chronoTransport.chronoTransportResult.score}
- Efficiency: ${(debugState.chronoTransport.chronoTransportResult.efficiency * 100).toFixed(2)}%

## Dual Black Hole Synchronization
- Sequence 1: ${debugState.chronoTransport.dualBlackHoleSync.seq1}
- Sequence 2: ${debugState.chronoTransport.dualBlackHoleSync.seq2}
- Total: ${debugState.chronoTransport.dualBlackHoleSync.total}
- Sync Efficiency: ${(debugState.chronoTransport.dualBlackHoleSync.syncEfficiency * 100).toFixed(2)}%

## Oscillator (P_o at 3e8 m/s)
- Value: ${debugState.chronoTransport.oscillator.p_o}
- Frequency: ${debugState.chronoTransport.oscillator.frequency} Hz
- Phase: ${debugState.chronoTransport.oscillator.phase}

## Formula Breakdown
- CTI = (TDF × cascade_index) ⊕ (τ × φ^n)
- cascade_index = floor(π / voids) + n
- Q_ent = |0.996 × (cos(φn/2)/π) × sin(φn/4) × exp(-n/20)| × (1+δφ) × log(n+1)
`;
                  navigator.clipboard.writeText(ctiReport);
                  toast.success('v4.7 CTI report copied');
                }}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy v4.7 CTI Report
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {debugState.chronoTransport
              ? 'v4.7 Chrono Transport Cascade data available for CTI analysis'
              : debugState.tdfBreakthrough 
              ? 'v4.6 TDF breakthrough data available for comprehensive analysis'
              : 'Share this debug information with AI for comprehensive troubleshooting'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}