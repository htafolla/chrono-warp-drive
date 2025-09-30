import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Video, Image, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportGeneratorProps {
  currentState: any;
  tpttV4Result?: any;
  neuralFusionData?: any;
  chronoTransportResult?: any;
  cascadeParams?: any;
}

export const ReportGenerator = ({ currentState, tpttV4Result, neuralFusionData, chronoTransportResult, cascadeParams }: ReportGeneratorProps) => {
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = useState<'pdf' | 'html' | 'png' | 'video'>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const generatePDFReport = async () => {
    setIsGenerating(true);
    setProgress(10);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;

      // Title Page
      const version = chronoTransportResult ? 'BLURRN v4.7' : tpttV4Result?.v46_components ? 'BLURRN v4.6' : 'BLURRN v4.5';
      pdf.setFontSize(24);
      pdf.text(`${version} Analysis Report`, margin, 40);
      
      pdf.setFontSize(12);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, 55);
      pdf.text(`Analysis Duration: ${Math.round(currentState.time * 100) / 100}s`, margin, 65);
      
      if (chronoTransportResult) {
        pdf.setFontSize(10);
        pdf.setTextColor(0, 128, 255);
        pdf.text('🚀 Chrono Transport Cascade Active', margin, 75);
        pdf.setTextColor(0, 0, 0);
      }
      
      setProgress(30);

      // Executive Summary
      pdf.setFontSize(16);
      pdf.text('Executive Summary', margin, 85);
      pdf.setFontSize(10);
      
      const summaryText = [
        `Temporal Phase: ${currentState.phases[0]?.toFixed(4) || 'N/A'}`,
        `Isotope Configuration: ${currentState.isotope?.type || 'N/A'}`,
        `Fractal Enhancement: ${currentState.fractalToggle ? 'Enabled' : 'Disabled'}`,
        `tPTT Value: ${tpttV4Result?.tPTT_value?.toFixed(6) || 'Calculating...'}`,
        `Neural Confidence: ${neuralFusionData?.confidenceScore ? (neuralFusionData.confidenceScore * 100).toFixed(2) + '%' : 'N/A'}`
      ];
      
      if (chronoTransportResult) {
        summaryText.push(
          '',
          '=== v4.7 Chrono Transport Cascade ===',
          `CTI Status: ${chronoTransportResult.status}`,
          `Transport Score: ${(chronoTransportResult.score * 100).toFixed(1)}%`,
          `Q_ent: ${chronoTransportResult.q_ent?.toFixed(6)}`,
          `Cascade Index: ${chronoTransportResult.cascadeIndex}`,
          `Efficiency: ${chronoTransportResult.efficiency?.toFixed(1)}%`
        );
      }

      summaryText.forEach((text, index) => {
        pdf.text(text, margin, 95 + (index * 8));
      });

      setProgress(50);

      // Technical Parameters
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text('Technical Parameters', margin, 30);
      pdf.setFontSize(10);

      if (tpttV4Result?.components) {
        const components = Object.entries(tpttV4Result.components);
        components.forEach(([key, value], index) => {
          const yPos = 45 + (index * 6);
          pdf.text(`${key}: ${typeof value === 'number' ? value.toFixed(6) : value}`, margin, yPos);
        });
      }

      setProgress(70);

      // Transport Analysis Section
      if (currentState.transportStatus || currentState.destinationData) {
        pdf.addPage();
        pdf.setFontSize(16);
        pdf.text('Transport System Analysis', margin, 30);
        pdf.setFontSize(10);

        const transportText = [
          `Transport Status: ${currentState.transportStatus?.status?.toUpperCase() || 'OFFLINE'}`,
          `Transport Readiness: ${currentState.transportStatus?.transportReadiness ? (currentState.transportStatus.transportReadiness * 100).toFixed(1) + '%' : 'N/A'}`,
          `Phase Coherence: ${currentState.transportStatus?.phaseCoherence ? (currentState.transportStatus.phaseCoherence * 100).toFixed(1) + '%' : 'N/A'}`,
          `Neural Synchronization: ${currentState.transportStatus?.neuralSync ? (currentState.transportStatus.neuralSync * 100).toFixed(1) + '%' : 'N/A'}`,
          '',
          'Destination Coordinates:',
          `  RA: ${currentState.destinationData?.coords?.ra?.toFixed(6) || 'N/A'}°`,
          `  DEC: ${currentState.destinationData?.coords?.dec?.toFixed(6) || 'N/A'}°`,
          `  Redshift (Z): ${currentState.destinationData?.coords?.z?.toFixed(6) || 'N/A'}`,
          '',
          'Temporal Destination:',
          `  Target Date: ${currentState.destinationData?.targetUTC || 'N/A'}`,
          `  Target MJD: ${currentState.destinationData?.targetMJD?.toFixed(2) || 'N/A'}`,
          `  Years Ago: ${currentState.destinationData?.yearsAgo?.toFixed(0) || 'N/A'} years`,
          `  Emission Era: ${currentState.destinationData?.emissionEra || 'Unknown'}`,
          `  Distance: ${currentState.destinationData?.distance?.toFixed(2) || 'N/A'} light-years`,
          '',
          'Stellar Observation:',
          `  Observatory: ${currentState.stellarTimestamp?.observatoryCode || 'SYNTHETIC'}`,
          `  Observation Date: ${currentState.stellarTimestamp?.gregorian || 'N/A'}`,
          `  Session Type: ${currentState.stellarTimestamp?.sessionType || 'N/A'}`
        ];

        transportText.forEach((text, index) => {
          pdf.text(text, margin, 45 + (index * 6));
        });
      }

      // Neural Analysis Section
      if (neuralFusionData) {
        pdf.addPage();
        pdf.setFontSize(16);
        pdf.text('Neural Fusion Analysis', margin, 30);
        pdf.setFontSize(10);

        const neuralText = [
          `Synaptic Sequence: ${neuralFusionData.synapticSequence || 'Processing...'}`,
          `Metamorphosis Index: ${neuralFusionData.metamorphosisIndex?.toFixed(4) || 'N/A'}`,
          `Confidence Score: ${neuralFusionData.confidenceScore ? (neuralFusionData.confidenceScore * 100).toFixed(2) + '%' : 'N/A'}`,
          `Neural Spectra Points: ${neuralFusionData.neuralSpectra?.length || 0}`
        ];

        neuralText.forEach((text, index) => {
          pdf.text(text, margin, 45 + (index * 8));
        });
      }

      setProgress(90);

      // v4.7 Chrono Transport Section
      if (chronoTransportResult && cascadeParams) {
        pdf.addPage();
        pdf.setFontSize(16);
        pdf.text('v4.7 Chrono Transport Cascade', margin, 30);
        pdf.setFontSize(10);

        const chronoText = [
          '=== Cascade Parameters ===',
          `Delta Phase (δφ): ${cascadeParams.delta_phase}`,
          `Cascade N: ${cascadeParams.n}`,
          `Voids: ${cascadeParams.voids}`,
          `Target tPTT: ${cascadeParams.tptt?.toExponential(2)}`,
          '',
          '=== CTI Components ===',
          `CTI Value: ${chronoTransportResult.cascadeIndex}`,
          `Q_ent: ${chronoTransportResult.q_ent?.toFixed(6)}`,
          '',
          '=== Transport Status ===',
          `Status: ${chronoTransportResult.status}`,
          `Score: ${(chronoTransportResult.score * 100).toFixed(1)}%`,
          `Efficiency: ${chronoTransportResult.efficiency?.toFixed(1)}%`,
          '',
          '=== Dual Black Hole Sync ===',
          `Seq1: ${chronoTransportResult.dualBlackHole?.seq1}`,
          `Seq2: ${chronoTransportResult.dualBlackHole?.seq2}`,
          `Total: ${chronoTransportResult.dualBlackHole?.total}`,
          `Sync Efficiency: ${(chronoTransportResult.dualBlackHole?.syncEfficiency * 100).toFixed(1)}%`
        ];

        chronoText.forEach((text, index) => {
          pdf.text(text, margin, 45 + (index * 6));
        });
      }

      // Methodology & References
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text('Methodology', margin, 30);
      pdf.setFontSize(10);

      const methodology = [
        `This analysis was performed using the ${version} Temporal Phase Transport`,
        'algorithm with enhanced neural fusion processing.',
        chronoTransportResult ? 'Includes dual black hole time transport with CTI cascade enumeration.' : '',
        'Data sources include the Sloan Digital Sky Survey (SDSS) and Pickles Atlas.',
        '',
        'Key algorithms:',
        chronoTransportResult ? '• Chrono Transport Interview (CTI) with XOR cascade logic' : '',
        chronoTransportResult ? '• Dual Black Hole sequence synchronization' : '',
        '• Temporal Phase Transport Theory (tPTT)',
        '• Neural Fusion with TensorFlow.js integration',
        '• Kuramoto oscillator model for phase synchronization',
        '• Enhanced spectral analysis with temporal correlation'
      ].filter(Boolean);

      methodology.forEach((text, index) => {
        pdf.text(text, margin, 45 + (index * 6));
      });

      setProgress(100);

      // Save PDF
      pdf.save(`BLURRN-Report-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "PDF Report Generated",
        description: "Professional analysis report has been downloaded successfully."
      });

    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const generateImageExport = async () => {
    setIsGenerating(true);
    setProgress(20);

    try {
      const canvas = await html2canvas(document.body, {
        height: window.innerHeight,
        width: window.innerWidth,
        useCORS: true
      });

      setProgress(70);

      const link = document.createElement('a');
      link.download = `BLURRN-Screenshot-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();

      setProgress(100);

      toast({
        title: "Image Exported",
        description: "High-resolution screenshot has been saved."
      });

    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to capture image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const generateHTMLExport = async () => {
    setIsGenerating(true);
    setProgress(30);

    try {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>${chronoTransportResult ? 'BLURRN v4.7' : 'BLURRN v4.6'} Analysis Export</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #0a0a0a; color: #ffffff; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .data-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .data-item { background: #1a1a1a; padding: 15px; border-radius: 8px; border: 1px solid #333; }
        .value { font-size: 1.2em; color: #00ff88; font-weight: bold; }
        .label { color: #888; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${chronoTransportResult ? 'BLURRN v4.7' : 'BLURRN v4.6'} Analysis Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        ${chronoTransportResult ? '<p style="color: #00ff88;">🚀 Chrono Transport Cascade Active</p>' : ''}
    </div>
    
    <div class="section">
        <h2>Current State</h2>
        <div class="data-grid">
            <div class="data-item">
                <div class="label">Time</div>
                <div class="value">${currentState.time?.toFixed(4) || 'N/A'}</div>
            </div>
            <div class="data-item">
                <div class="label">Isotope</div>
                <div class="value">${currentState.isotope?.type || 'N/A'}</div>
            </div>
            <div class="data-item">
                <div class="label">Fractal</div>
                <div class="value">${currentState.fractalToggle ? 'ON' : 'OFF'}</div>
            </div>
        </div>
    </div>
    
    ${tpttV4Result ? `
    <div class="section">
        <h2>tPTT Analysis</h2>
        <div class="data-grid">
            <div class="data-item">
                <div class="label">tPTT Value</div>
                <div class="value">${tpttV4Result.tPTT_value?.toFixed(6)}</div>
            </div>
            <div class="data-item">
                <div class="label">Rippel</div>
                <div class="value">${tpttV4Result.rippel}</div>
            </div>
        </div>
    </div>` : ''}
    
    ${chronoTransportResult ? `
    <div class="section">
        <h2>v4.7 Chrono Transport Cascade</h2>
        <div class="data-grid">
            <div class="data-item">
                <div class="label">CTI Status</div>
                <div class="value">${chronoTransportResult.status}</div>
            </div>
            <div class="data-item">
                <div class="label">Transport Score</div>
                <div class="value">${(chronoTransportResult.score * 100).toFixed(1)}%</div>
            </div>
            <div class="data-item">
                <div class="label">Q_ent</div>
                <div class="value">${chronoTransportResult.q_ent?.toFixed(6)}</div>
            </div>
            <div class="data-item">
                <div class="label">Cascade Index</div>
                <div class="value">${chronoTransportResult.cascadeIndex}</div>
            </div>
            <div class="data-item">
                <div class="label">Efficiency</div>
                <div class="value">${chronoTransportResult.efficiency?.toFixed(1)}%</div>
            </div>
            <div class="data-item">
                <div class="label">Dual BH Sync</div>
                <div class="value">${(chronoTransportResult.dualBlackHole?.syncEfficiency * 100).toFixed(1)}%</div>
            </div>
        </div>
    </div>` : ''}
    
    <div class="section">
        <h2>Analysis Parameters</h2>
        <pre style="background: #1a1a1a; padding: 15px; border-radius: 8px; overflow-x: auto;">
${JSON.stringify(currentState, null, 2)}
        </pre>
    </div>
</body>
</html>`;

      setProgress(80);

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BLURRN-Report-${Date.now()}.html`;
      link.click();
      URL.revokeObjectURL(url);

      setProgress(100);

      toast({
        title: "HTML Export Complete",
        description: "Interactive report has been saved as HTML file."
      });

    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate HTML export. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleExport = async () => {
    switch (exportFormat) {
      case 'pdf':
        await generatePDFReport();
        break;
      case 'png':
        await generateImageExport();
        break;
      case 'html':
        await generateHTMLExport();
        break;
      case 'video':
        toast({
          title: "Coming Soon",
          description: "Video export functionality will be available in the next update."
        });
        break;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Professional Export & Reporting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Format Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Export Format</label>
          <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  PDF Report
                </div>
              </SelectItem>
              <SelectItem value="png">
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  High-Res Image
                </div>
              </SelectItem>
              <SelectItem value="html">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Interactive HTML
                </div>
              </SelectItem>
              <SelectItem value="video">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Video Recording
                  <Badge variant="secondary" className="ml-2">Soon</Badge>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Progress Indicator */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Generating export...</div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Export Button */}
        <Button 
          onClick={handleExport} 
          disabled={isGenerating}
          className="w-full"
        >
          <Download className="w-4 h-4 mr-2" />
          {isGenerating ? 'Generating...' : 'Generate Export'}
        </Button>

        {/* Current State Preview */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Current Analysis State</div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Time: {currentState.time?.toFixed(4) || 'N/A'}</div>
            <div>Isotope: {currentState.isotope?.type || 'N/A'}</div>
            <div>Fractal: {currentState.fractalToggle ? 'ON' : 'OFF'}</div>
            <div>tPTT: {tpttV4Result?.tPTT_value?.toFixed(6) || 'Calculating...'}</div>
            {chronoTransportResult && (
              <>
                <div>CTI Status: {chronoTransportResult.status}</div>
                <div>Q_ent: {chronoTransportResult.q_ent?.toFixed(6)}</div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};