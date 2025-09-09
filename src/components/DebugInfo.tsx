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
            <Badge variant={debugState.systemStatus.isV4Initialized ? "default" : "secondary"}>
              {debugState.systemStatus.isV4Initialized ? "v4.5 Active" : "Legacy Mode"}
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
        </div>

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
          </div>
          <p className="text-xs text-muted-foreground">
            Share this debug information with AI for comprehensive troubleshooting
          </p>
        </div>
      </CardContent>
    </Card>
  );
}