import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Download, Shield, Clock, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SequenceData {
  timestamp: string;
  sequenceId: string;
  preTransportState: {
    tPTT_value: number;
    phases: number[];
    e_t: number;
    neuralSequence: string;
    rippelSignature: string;
    temporalHash: string;
  };
  transportSequence: {
    energyAccumulation: number[];
    neuralSyncProgress: number[];
    temporalFoldSequence: string[];
    phaseAlignmentData: number[];
    isotopicResonance: number;
  };
  postTransportState: {
    finalCoordinates: { ra: number; dec: number; z: number };
    energyResidue: number;
    temporalStability: number;
    verificationHash: string;
  };
  verificationData: {
    sequenceIntegrity: boolean;
    temporalConsistency: boolean;
    neuralCoherence: boolean;
    energyConservation: boolean;
    overallValidity: boolean;
  };
}

interface TransportSequenceVerificationProps {
  lastTransportResult?: any;
  currentState: any;
  onGenerateSequence: () => Promise<SequenceData>;
}

export const TransportSequenceVerification = ({ 
  lastTransportResult, 
  currentState,
  onGenerateSequence 
}: TransportSequenceVerificationProps) => {
  const { toast } = useToast();
  const [sequenceData, setSequenceData] = useState<SequenceData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSequenceData = async () => {
    setIsGenerating(true);
    try {
      const sequence = await onGenerateSequence();
      setSequenceData(sequence);
      
      toast({
        title: "Sequence Generated",
        description: "Transport verification data has been compiled and validated.",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Could not generate sequence verification data.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copySequenceData = async (format: 'json' | 'csv' | 'hash') => {
    if (!sequenceData) return;

    let textToCopy = '';
    
    switch (format) {
      case 'json':
        textToCopy = JSON.stringify(sequenceData, null, 2);
        break;
      case 'csv':
        textToCopy = generateCSVData();
        break;
      case 'hash':
        textToCopy = generateVerificationHash();
        break;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: "Copied to Clipboard",
        description: `${format.toUpperCase()} sequence data copied successfully.`
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard.",
        variant: "destructive"
      });
    }
  };

  const generateCSVData = (): string => {
    if (!sequenceData) return '';
    
    const rows = [
      'Parameter,Pre-Transport,Post-Transport,Verification',
      `Sequence ID,${sequenceData.sequenceId},,`,
      `Timestamp,${sequenceData.timestamp},,`,
      `tPTT Value,${sequenceData.preTransportState.tPTT_value},,`,
      `Energy Residue,,${sequenceData.postTransportState.energyResidue},`,
      `Temporal Stability,,${sequenceData.postTransportState.temporalStability},`,
      `Sequence Integrity,,,${sequenceData.verificationData.sequenceIntegrity}`,
      `Temporal Consistency,,,${sequenceData.verificationData.temporalConsistency}`,
      `Neural Coherence,,,${sequenceData.verificationData.neuralCoherence}`,
      `Energy Conservation,,,${sequenceData.verificationData.energyConservation}`,
      `Overall Validity,,,${sequenceData.verificationData.overallValidity}`,
      `Final RA,,${sequenceData.postTransportState.finalCoordinates.ra},`,
      `Final DEC,,${sequenceData.postTransportState.finalCoordinates.dec},`,
      `Final Z,,${sequenceData.postTransportState.finalCoordinates.z},`
    ];
    
    return rows.join('\n');
  };

  const generateVerificationHash = (): string => {
    if (!sequenceData) return '';
    
    const hashData = [
      sequenceData.sequenceId,
      sequenceData.preTransportState.temporalHash,
      sequenceData.postTransportState.verificationHash,
      sequenceData.verificationData.overallValidity.toString()
    ].join('|');
    
    // Simple hash simulation (in production, use proper crypto)
    let hash = 0;
    for (let i = 0; i < hashData.length; i++) {
      const char = hashData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `TPTT-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
  };

  const downloadSequenceReport = () => {
    if (!sequenceData) return;
    
    const reportContent = `
TEMPORAL TRANSPORT SEQUENCE VERIFICATION REPORT
===============================================

Sequence ID: ${sequenceData.sequenceId}
Timestamp: ${sequenceData.timestamp}
Verification Hash: ${generateVerificationHash()}

PRE-TRANSPORT STATE
===================
tPTT Value: ${sequenceData.preTransportState.tPTT_value.toExponential(6)}
Entropy (E_t): ${sequenceData.preTransportState.e_t.toFixed(6)}
Neural Sequence: ${sequenceData.preTransportState.neuralSequence}
Rippel Signature: ${sequenceData.preTransportState.rippelSignature}
Temporal Hash: ${sequenceData.preTransportState.temporalHash}

Phase Data:
${sequenceData.preTransportState.phases.map((p, i) => `  Phase ${i+1}: ${p.toFixed(6)}`).join('\n')}

TRANSPORT SEQUENCE
==================
Energy Accumulation Levels: ${sequenceData.transportSequence.energyAccumulation.length} samples
Neural Sync Progress: ${sequenceData.transportSequence.neuralSyncProgress.length} samples
Temporal Fold Sequence: ${sequenceData.transportSequence.temporalFoldSequence.length} operations
Phase Alignment Data: ${sequenceData.transportSequence.phaseAlignmentData.length} measurements
Isotopic Resonance: ${sequenceData.transportSequence.isotopicResonance.toFixed(6)}

POST-TRANSPORT STATE
====================
Final Coordinates:
  Right Ascension: ${sequenceData.postTransportState.finalCoordinates.ra.toFixed(6)}°
  Declination: ${sequenceData.postTransportState.finalCoordinates.dec.toFixed(6)}°
  Redshift (Z): ${sequenceData.postTransportState.finalCoordinates.z.toFixed(6)}

Energy Residue: ${sequenceData.postTransportState.energyResidue.toExponential(6)}
Temporal Stability: ${(sequenceData.postTransportState.temporalStability * 100).toFixed(2)}%
Verification Hash: ${sequenceData.postTransportState.verificationHash}

VERIFICATION RESULTS
====================
✓ Sequence Integrity: ${sequenceData.verificationData.sequenceIntegrity ? 'VALID' : 'INVALID'}
✓ Temporal Consistency: ${sequenceData.verificationData.temporalConsistency ? 'VALID' : 'INVALID'}
✓ Neural Coherence: ${sequenceData.verificationData.neuralCoherence ? 'VALID' : 'INVALID'}
✓ Energy Conservation: ${sequenceData.verificationData.energyConservation ? 'VALID' : 'INVALID'}

OVERALL VALIDITY: ${sequenceData.verificationData.overallValidity ? 'TRANSPORT VERIFIED' : 'TRANSPORT INVALID'}

Generated by BLURRN v4.5 Temporal Transport System
Report Date: ${new Date().toISOString()}
`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Transport-Verification-${sequenceData.sequenceId}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: "Verification report saved to downloads."
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Transport Sequence Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generate Button */}
        <div className="flex gap-2">
          <Button
            onClick={generateSequenceData}
            disabled={isGenerating || !lastTransportResult}
            className="flex-1"
          >
            <Zap className="w-4 h-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Sequence Data'}
          </Button>
          
          {sequenceData && (
            <Button
              onClick={downloadSequenceReport}
              variant="outline"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>

        {!lastTransportResult && (
          <Alert>
            <Clock className="w-4 h-4" />
            <AlertDescription>
              Perform a transport operation first to generate sequence verification data.
            </AlertDescription>
          </Alert>
        )}

        {/* Sequence Data Display */}
        {sequenceData && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sequence">Sequence</TabsTrigger>
              <TabsTrigger value="verification">Verification</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Sequence ID</div>
                  <div className="font-mono text-xs">{sequenceData.sequenceId}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Timestamp</div>
                  <div className="font-mono text-xs">{sequenceData.timestamp}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Verification Hash</div>
                  <div className="font-mono text-xs">{generateVerificationHash()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Overall Status</div>
                  <Badge variant={sequenceData.verificationData.overallValidity ? "default" : "destructive"}>
                    {sequenceData.verificationData.overallValidity ? "VERIFIED" : "INVALID"}
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Transport Summary</div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Pre-Transport tPTT: {sequenceData.preTransportState.tPTT_value.toExponential(2)}</div>
                  <div>Final Coordinates: RA {sequenceData.postTransportState.finalCoordinates.ra.toFixed(2)}°, DEC {sequenceData.postTransportState.finalCoordinates.dec.toFixed(2)}°</div>
                  <div>Energy Residue: {sequenceData.postTransportState.energyResidue.toExponential(2)}</div>
                  <div>Temporal Stability: {(sequenceData.postTransportState.temporalStability * 100).toFixed(1)}%</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sequence" className="space-y-4">
              <ScrollArea className="h-64 w-full">
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="font-medium mb-1">Pre-Transport State</div>
                    <div className="bg-muted p-2 rounded font-mono">
                      Neural Sequence: {sequenceData.preTransportState.neuralSequence}<br/>
                      Rippel: {sequenceData.preTransportState.rippelSignature}<br/>
                      Temporal Hash: {sequenceData.preTransportState.temporalHash}
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium mb-1">Transport Sequence</div>
                    <div className="bg-muted p-2 rounded space-y-1">
                      <div>Energy Levels: [{sequenceData.transportSequence.energyAccumulation.slice(0, 5).map(e => e.toFixed(2)).join(', ')}...]</div>
                      <div>Neural Sync: [{sequenceData.transportSequence.neuralSyncProgress.slice(0, 5).map(s => (s * 100).toFixed(1) + '%').join(', ')}...]</div>
                      <div>Temporal Folds: [{sequenceData.transportSequence.temporalFoldSequence.slice(0, 3).join(', ')}...]</div>
                      <div>Isotopic Resonance: {sequenceData.transportSequence.isotopicResonance.toFixed(6)}</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium mb-1">Post-Transport State</div>
                    <div className="bg-muted p-2 rounded font-mono">
                      Verification Hash: {sequenceData.postTransportState.verificationHash}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="verification" className="space-y-4">
              <div className="space-y-3">
                {Object.entries(sequenceData.verificationData).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <Badge variant={typeof value === 'boolean' && value ? "default" : "destructive"}>
                      {typeof value === 'boolean' ? (value ? 'VALID' : 'INVALID') : String(value)}
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="export" className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <Button
                  onClick={() => copySequenceData('json')}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy JSON Data
                </Button>
                <Button
                  onClick={() => copySequenceData('csv')}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy CSV Data
                </Button>
                <Button
                  onClick={() => copySequenceData('hash')}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Verification Hash
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Export formats available for external verification and audit trail documentation.
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};