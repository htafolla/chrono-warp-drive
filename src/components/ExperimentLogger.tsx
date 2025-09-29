import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ExperimentLog } from '@/types/blurrn-v4-6';
import { Download, FileText, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';

interface ExperimentLoggerProps {
  experiments: ExperimentLog[];
  onExportReport: () => string;
  onClearLogs: () => void;
  currentExperiment?: ExperimentLog | null;
}

export function ExperimentLogger({
  experiments,
  onExportReport,
  onClearLogs,
  currentExperiment
}: ExperimentLoggerProps) {
  const [reportContent, setReportContent] = useState<string>('');

  // Update report content when experiments change
  useEffect(() => {
    const report = onExportReport();
    setReportContent(report);
  }, [experiments, onExportReport]);

  const handleDownloadReport = () => {
    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Blurrn_Time_Shift_Experiment_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: ExperimentLog['validation_status']) => {
    switch (status) {
      case 'validated':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: ExperimentLog['validation_status']) => {
    switch (status) {
      case 'validated':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const validatedCount = experiments.filter(exp => exp.validation_status === 'validated').length;
  const pendingCount = experiments.filter(exp => exp.validation_status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Experiment Documentation
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{experiments.length}</div>
              <div className="text-sm text-muted-foreground">Total Experiments</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">{validatedCount}</div>
              <div className="text-sm text-muted-foreground">Validated</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-500">{pendingCount}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleDownloadReport}
              className="flex-1"
              disabled={experiments.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button 
              variant="outline" 
              onClick={onClearLogs}
              disabled={experiments.length === 0}
            >
              Clear Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Experiment */}
      {currentExperiment && (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Current Experiment</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(currentExperiment.validation_status)}
                <Badge variant={getStatusVariant(currentExperiment.validation_status)}>
                  {currentExperiment.validation_status}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">TDF Value</div>
                <div className="font-mono">{currentExperiment.tdf_value.toExponential(3)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">S_L Value</div>
                <div className="font-mono">{currentExperiment.s_l_value.toExponential(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">τ (Tau)</div>
                <div className="font-mono">{currentExperiment.tau.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Cycle</div>
                <div className="font-mono">{currentExperiment.cycle}</div>
              </div>
            </div>
            
            {currentExperiment.notes && (
              <div>
                <div className="text-sm font-medium mb-1">Notes</div>
                <div className="text-xs bg-muted/50 p-2 rounded">
                  {currentExperiment.notes}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Experiments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Recent Experiments</CardTitle>
        </CardHeader>
        
        <CardContent>
          {experiments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No experiments recorded yet. Run your first TDF experiment to begin logging.
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {experiments.slice(-10).reverse().map((experiment, index) => (
                <div key={experiment.experiment_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-mono">
                        {new Date(experiment.timestamp).toLocaleString()}
                      </span>
                      {getStatusIcon(experiment.validation_status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      TDF: {experiment.tdf_value.toExponential(2)} | 
                      Cycle: {experiment.cycle}
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(experiment.validation_status)} className="text-xs">
                    {experiment.validation_status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Preview */}
      {reportContent && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Report Preview</CardTitle>
          </CardHeader>
          
          <CardContent>
            <Textarea
              value={reportContent}
              readOnly
              className="min-h-40 text-xs font-mono"
              placeholder="Experiment report will appear here..."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}