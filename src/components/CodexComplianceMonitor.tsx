// Codex v4.7 Compliance Monitor UI (Phase 5)
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Zap, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { TPTTv4_7Result } from '@/types/blurrn-v4-7';
import { validateCodexCompliance, CodexValidationResult } from '@/lib/codexValidator';

interface CodexComplianceMonitorProps {
  tpttV47Result: TPTTv4_7Result | null;
  isActive: boolean;
  currentFPS: number;
}

export function CodexComplianceMonitor({ 
  tpttV47Result, 
  isActive,
  currentFPS 
}: CodexComplianceMonitorProps) {
  const [validation, setValidation] = useState<CodexValidationResult | null>(null);

  useEffect(() => {
    if (!isActive || !tpttV47Result) return;

    // Use performance.memory if available (Chrome only)
    const memoryInfo = (performance as any).memory;
    const performanceInfo = memoryInfo ? {
      fps: currentFPS,
      memory: (memoryInfo.usedJSHeapSize / 1024 / 1024),
      computeTime: 0 // Will be updated by actual measurements
    } : {
      fps: currentFPS,
      memory: 0,
      computeTime: 0
    };

    const result = validateCodexCompliance(tpttV47Result, performanceInfo);
    setValidation(result);
  }, [tpttV47Result, isActive, currentFPS]);

  if (!isActive || !validation) return null;

  const getScoreColor = (score: number): string => {
    if (score >= 95) return 'text-green-500';
    if (score >= 80) return 'text-yellow-500';
    if (score >= 60) return 'text-orange-500';
    return 'text-red-500';
  };

  const getComplianceVariant = (isCompliant: boolean): "default" | "secondary" | "destructive" => {
    return isCompliant ? "default" : "destructive";
  };

  const critical = validation.issues.filter(i => i.severity === 'critical');
  const warnings = validation.issues.filter(i => i.severity === 'warning');
  const info = validation.issues.filter(i => i.severity === 'info');

  return (
    <Card className="p-4 bg-background/50 backdrop-blur border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Codex v4.7 Compliance</h3>
        </div>
        <Badge variant={getComplianceVariant(validation.isCompliant)}>
          {validation.isCompliant ? '✅ Compliant' : '❌ Non-Compliant'}
        </Badge>
      </div>

      {/* Compliance Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Compliance Score</span>
          <span className={`text-xl font-bold ${getScoreColor(validation.score)}`}>
            {validation.score.toFixed(1)}%
          </span>
        </div>
        <Progress value={validation.score} className="h-2" />
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="p-2 rounded bg-background/30">
          <div className="text-muted-foreground mb-1">FPS</div>
          <div className={validation.metrics.fps >= 120 ? 'text-green-500' : 'text-yellow-500'}>
            {validation.metrics.fps.toFixed(0)} / 120
          </div>
        </div>
        <div className="p-2 rounded bg-background/30">
          <div className="text-muted-foreground mb-1">Q_ent</div>
          <div className="text-primary">
            {validation.metrics.q_ent.toFixed(3)}
          </div>
        </div>
        <div className="p-2 rounded bg-background/30">
          <div className="text-muted-foreground mb-1">Efficiency</div>
          <div className={validation.metrics.efficiency >= 90 ? 'text-green-500' : 'text-yellow-500'}>
            {validation.metrics.efficiency.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Parameters Validation */}
      <div className="mb-4 space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">L = {validation.metrics.l_value}</span>
          <CheckCircle className="w-3 h-3 text-green-500" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">φ = {validation.metrics.phi_value}</span>
          <CheckCircle className="w-3 h-3 text-green-500" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">τ = {validation.metrics.tau_value}</span>
          <CheckCircle className="w-3 h-3 text-green-500" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            δφ = {validation.metrics.delta_phase.toFixed(3)} (0.25-0.3)
          </span>
          {validation.metrics.delta_phase >= 0.25 && validation.metrics.delta_phase <= 0.3 ? (
            <CheckCircle className="w-3 h-3 text-green-500" />
          ) : (
            <AlertTriangle className="w-3 h-3 text-yellow-500" />
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            n = {validation.metrics.n_value} (25-34)
          </span>
          {validation.metrics.n_value >= 25 && validation.metrics.n_value <= 34 ? (
            <CheckCircle className="w-3 h-3 text-green-500" />
          ) : (
            <AlertTriangle className="w-3 h-3 text-yellow-500" />
          )}
        </div>
      </div>

      {/* Issues */}
      {validation.issues.length > 0 && (
        <div className="space-y-2">
          {critical.length > 0 && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {critical.length} Critical Issue{critical.length > 1 ? 's' : ''}
              </AlertDescription>
            </Alert>
          )}
          {warnings.length > 0 && (
            <Alert className="py-2 border-yellow-500/50">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-xs">
                {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
              </AlertDescription>
            </Alert>
          )}
          {info.length > 0 && (
            <Alert className="py-2 border-blue-500/50">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-xs">
                {info.length} Info Message{info.length > 1 ? 's' : ''}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Rules Validation */}
      <div className="mt-4 pt-4 border-t border-primary/20">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Rule Validation</span>
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-primary" />
            <span className="font-mono">
              {validation.metrics.rules_validated}/{validation.metrics.rules_total}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
