import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Copy, FileText, Database } from 'lucide-react';
import { type Isotope } from '@/lib/temporalCalculator';

interface TemporalState {
  time: number;
  phases: number[];
  fractalToggle: boolean;
  timeline: number;
  isotope: Isotope;
  cycle: number;
  e_t: number;
  phi: number;
  delta_t: number;
  timestamp: string;
}

interface ExportImportProps {
  currentState: TemporalState;
  onImport: (state: Partial<TemporalState>) => void;
}

export function ExportImport({ currentState, onImport }: ExportImportProps) {
  const [importData, setImportData] = useState('');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const { toast } = useToast();

  const exportState = () => {
    try {
      const exportState: TemporalState = {
        ...currentState,
        timestamp: new Date().toISOString()
      };

      let exportString = '';
      let filename = '';
      let mimeType = '';

      if (exportFormat === 'json') {
        exportString = JSON.stringify(exportState, null, 2);
        filename = `temporal-state-${Date.now()}.json`;
        mimeType = 'application/json';
      } else {
        // CSV format
        const headers = Object.keys(exportState).join(',');
        const values = Object.values(exportState).map(value => 
          Array.isArray(value) ? `"[${value.join(';')}]"` : 
          typeof value === 'object' ? JSON.stringify(value) : 
          String(value)
        ).join(',');
        exportString = `${headers}\n${values}`;
        filename = `temporal-state-${Date.now()}.csv`;
        mimeType = 'text/csv';
      }

      const blob = new Blob([exportString], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "State Exported",
        description: `Temporal state saved as ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export temporal state",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = async () => {
    try {
      const exportState = {
        ...currentState,
        timestamp: new Date().toISOString()
      };
      
      await navigator.clipboard.writeText(JSON.stringify(exportState, null, 2));
      
      toast({
        title: "Copied to Clipboard",
        description: "Temporal state copied as JSON",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const importState = () => {
    try {
      if (!importData.trim()) {
        toast({
          title: "Import Failed",
          description: "No data to import",
          variant: "destructive"
        });
        return;
      }

      let parsedData: Partial<TemporalState>;

      // Try to parse as JSON first
      try {
        parsedData = JSON.parse(importData);
      } catch {
        // Try to parse as CSV
        const lines = importData.split('\n');
        if (lines.length >= 2) {
          const headers = lines[0].split(',');
          const values = lines[1].split(',');
          
          parsedData = {};
          headers.forEach((header, index) => {
            const value = values[index];
            if (value) {
              try {
                // Handle array values
                if (value.startsWith('"[') && value.endsWith(']"')) {
                  const arrayContent = value.slice(2, -2);
                  (parsedData as any)[header] = arrayContent.split(';').map(Number);
                } else if (value.startsWith('"') && value.endsWith('"')) {
                  // Handle object values
                  (parsedData as any)[header] = JSON.parse(value.slice(1, -1));
                } else if (!isNaN(Number(value))) {
                  (parsedData as any)[header] = Number(value);
                } else if (value === 'true' || value === 'false') {
                  (parsedData as any)[header] = value === 'true';
                } else {
                  (parsedData as any)[header] = value;
                }
              } catch {
                (parsedData as any)[header] = value;
              }
            }
          });
        } else {
          throw new Error('Invalid CSV format');
        }
      }

      // Validate imported data
      const validatedData: Partial<TemporalState> = {};
      
      if (typeof parsedData.time === 'number' && !isNaN(parsedData.time)) {
        validatedData.time = parsedData.time;
      }
      
      if (Array.isArray(parsedData.phases) && parsedData.phases.every(p => typeof p === 'number')) {
        validatedData.phases = parsedData.phases;
      }
      
      if (typeof parsedData.fractalToggle === 'boolean') {
        validatedData.fractalToggle = parsedData.fractalToggle;
      }
      
      if (typeof parsedData.timeline === 'number' && !isNaN(parsedData.timeline)) {
        validatedData.timeline = parsedData.timeline;
      }
      
      if (parsedData.isotope && typeof parsedData.isotope === 'object') {
        validatedData.isotope = parsedData.isotope as Isotope;
      }
      
      if (typeof parsedData.cycle === 'number' && !isNaN(parsedData.cycle)) {
        validatedData.cycle = parsedData.cycle;
      }
      
      if (typeof parsedData.e_t === 'number' && !isNaN(parsedData.e_t)) {
        validatedData.e_t = parsedData.e_t;
      }
      
      if (typeof parsedData.phi === 'number' && !isNaN(parsedData.phi)) {
        validatedData.phi = parsedData.phi;
      }
      
      if (typeof parsedData.delta_t === 'number' && !isNaN(parsedData.delta_t)) {
        validatedData.delta_t = parsedData.delta_t;
      }

      if (Object.keys(validatedData).length === 0) {
        throw new Error('No valid data found');
      }

      onImport(validatedData);
      setImportData('');
      
      toast({
        title: "State Imported",
        description: `Successfully imported ${Object.keys(validatedData).length} parameters`,
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Invalid temporal state data format",
        variant: "destructive"
      });
    }
  };

  const generateExample = () => {
    const exampleState = {
      time: 42.5,
      phases: [1.57, 3.14, 4.71],
      fractalToggle: true,
      timeline: 5,
      isotope: { type: "C-14", factor: 0.8 },
      cycle: 1000,
      e_t: 0.75,
      phi: 1.618,
      delta_t: 1e-6,
      timestamp: new Date().toISOString()
    };
    
    setImportData(JSON.stringify(exampleState, null, 2));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Temporal State Management
          <Badge variant="outline">
            <Database className="h-3 w-3 mr-1" />
            Export/Import
          </Badge>
        </CardTitle>
        <CardDescription>
          Save and restore temporal simulation states for research and analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">Export Current State</h4>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={exportState}
              variant="default"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export as {exportFormat.toUpperCase()}
            </Button>
            
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy JSON
            </Button>

            <Button
              onClick={() => setExportFormat(exportFormat === 'json' ? 'csv' : 'json')}
              variant="ghost"
              size="sm"
            >
              <FileText className="h-4 w-4 mr-1" />
              {exportFormat === 'json' ? 'Switch to CSV' : 'Switch to JSON'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Current state includes: time, phases, isotope, fractal mode, and all temporal parameters
          </div>
        </div>

        {/* Import Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">Import Temporal State</h4>
          </div>
          
          <Textarea
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            placeholder="Paste temporal state JSON or CSV data here..."
            className="min-h-[120px] font-mono text-xs"
          />
          
          <div className="flex gap-2">
            <Button
              onClick={importState}
              variant="secondary"
              disabled={!importData.trim()}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Import State
            </Button>
            
            <Button
              onClick={generateExample}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Load Example
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Supports JSON and CSV formats. Only valid parameters will be imported.
          </div>
        </div>

        {/* Current State Preview */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-xs text-muted-foreground mb-2">Current State Summary</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Time: {currentState.time.toFixed(3)}s</div>
            <div>Cycle: {currentState.cycle}</div>
            <div>Phases: {currentState.phases.length} active</div>
            <div>Isotope: {currentState.isotope.type}</div>
            <div>Fractal: {currentState.fractalToggle ? 'ON' : 'OFF'}</div>
            <div>E_t: {currentState.e_t.toFixed(3)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}