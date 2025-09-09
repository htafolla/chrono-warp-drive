import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AnalysisEngineProps {
  currentState: any;
  tpttV4Result?: any;
  neuralFusionData?: any;
  historicalData?: any[];
}

interface AnalysisInsight {
  type: 'trend' | 'anomaly' | 'optimization' | 'correlation';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  recommendation?: string;
}

export const AnalysisEngine = ({ currentState, tpttV4Result, neuralFusionData, historicalData = [] }: AnalysisEngineProps) => {
  const [insights, setInsights] = useState<AnalysisInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null);

  const performAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    const newInsights: AnalysisInsight[] = [];

    try {
      // Phase 1: Temporal Stability Analysis
      setAnalysisProgress(20);
      await new Promise(resolve => setTimeout(resolve, 500));

      if (currentState.phases && currentState.phases.length > 0) {
        const phaseVariation = Math.abs(currentState.phases[0] - (currentState.phases[1] || 0));
        
        if (phaseVariation > 0.5) {
          newInsights.push({
            type: 'anomaly',
            severity: 'high',
            title: 'High Phase Variation Detected',
            description: `Current phase variation of ${phaseVariation.toFixed(4)} exceeds stable parameters.`,
            recommendation: 'Consider adjusting temporal synchronization parameters or checking for external interference.'
          });
        } else if (phaseVariation < 0.01) {
          newInsights.push({
            type: 'optimization',
            severity: 'low',
            title: 'Excellent Phase Stability',
            description: `Phase variation of ${phaseVariation.toFixed(6)} indicates optimal synchronization.`,
            recommendation: 'Current settings are producing stable results. Consider maintaining these parameters.'
          });
        }
      }

      // Phase 2: tPTT Analysis
      setAnalysisProgress(40);
      await new Promise(resolve => setTimeout(resolve, 500));

      if (tpttV4Result?.tPTT_value) {
        const tpttValue = tpttV4Result.tPTT_value;
        
        if (tpttValue > 1.0) {
          newInsights.push({
            type: 'trend',
            severity: 'medium',
            title: 'Elevated tPTT Values',
            description: `Current tPTT of ${tpttValue.toFixed(6)} indicates high temporal transport efficiency.`,
            recommendation: 'Monitor for potential system strain. Consider implementing cooling protocols.'
          });
        }

        // Component analysis
        if (tpttV4Result.components) {
          const { E_t, W_c, C_m } = tpttV4Result.components;
          
          if (E_t && E_t > 0.8) {
            newInsights.push({
              type: 'correlation',
              severity: 'medium',
              title: 'High Entropy Correlation',
              description: `Entropy factor (${E_t.toFixed(4)}) shows strong correlation with temporal flux.`,
              recommendation: 'Consider leveraging high entropy state for enhanced spectral analysis.'
            });
          }
        }
      }

      // Phase 3: Neural Fusion Assessment
      setAnalysisProgress(60);
      await new Promise(resolve => setTimeout(resolve, 500));

      if (neuralFusionData?.confidenceScore) {
        const confidence = neuralFusionData.confidenceScore;
        
        if (confidence > 0.9) {
          newInsights.push({
            type: 'optimization',
            severity: 'low',
            title: 'Exceptional Neural Confidence',
            description: `Neural fusion confidence of ${(confidence * 100).toFixed(2)}% indicates optimal processing.`,
            recommendation: 'Excellent neural synchronization achieved. Document current parameters for future reference.'
          });
        } else if (confidence < 0.7) {
          newInsights.push({
            type: 'anomaly',
            severity: 'high',
            title: 'Low Neural Confidence',
            description: `Neural confidence of ${(confidence * 100).toFixed(2)}% suggests processing instability.`,
            recommendation: 'Review neural network parameters and consider recalibration or data quality assessment.'
          });
        }

        // Synaptic sequence analysis
        if (neuralFusionData.synapticSequence) {
          const sequenceLength = neuralFusionData.synapticSequence.length;
          if (sequenceLength > 50) {
            newInsights.push({
              type: 'trend',
              severity: 'medium',
              title: 'Complex Synaptic Patterns',
              description: `Synaptic sequence contains ${sequenceLength} elements, indicating high complexity.`,
              recommendation: 'Complex patterns may indicate rich data content. Consider extended analysis duration.'
            });
          }
        }
      }

      // Phase 4: Configuration Optimization
      setAnalysisProgress(80);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Isotope analysis
      if (currentState.isotope) {
        const isotopeRecommendations: { [key: string]: string } = {
          'C-12': 'Stable configuration. Optimal for long-duration analysis.',
          'C-13': 'Enhanced spectral resolution. Good for detailed stellar classification.',
          'C-14': 'Temporal sensitivity increased. Monitor for decay effects.',
          'N-14': 'Neutral stability. Balanced performance across all metrics.',
          'O-16': 'High energy state. Excellent for active galactic nuclei analysis.'
        };

        const recommendation = isotopeRecommendations[currentState.isotope];
        if (recommendation) {
          newInsights.push({
            type: 'optimization',
            severity: 'low',
            title: `${currentState.isotope} Configuration Analysis`,
            description: recommendation,
            recommendation: 'Current isotope selection is appropriate for the analysis type.'
          });
        }
      }

      // Fractal toggle analysis
      if (currentState.fractalToggle !== undefined) {
        if (currentState.fractalToggle && tpttV4Result?.tPTT_value < 0.5) {
          newInsights.push({
            type: 'optimization',
            severity: 'medium',
            title: 'Fractal Enhancement Underutilized',
            description: 'Fractal processing is enabled but tPTT values suggest minimal benefit.',
            recommendation: 'Consider disabling fractal enhancement to reduce computational overhead.'
          });
        } else if (!currentState.fractalToggle && tpttV4Result?.tPTT_value > 0.8) {
          newInsights.push({
            type: 'optimization',
            severity: 'medium',
            title: 'Fractal Enhancement Recommended',
            description: 'High tPTT values suggest fractal processing could provide additional insights.',
            recommendation: 'Enable fractal enhancement to potentially improve analysis depth.'
          });
        }
      }

      setAnalysisProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300));

      setInsights(newInsights);
      setLastAnalysisTime(new Date());

    } catch (error) {
      console.error('Analysis error:', error);
      newInsights.push({
        type: 'anomaly',
        severity: 'high',
        title: 'Analysis Engine Error',
        description: 'An error occurred during automated analysis.',
        recommendation: 'Check system logs and restart analysis engine if necessary.'
      });
      setInsights(newInsights);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  useEffect(() => {
    // Auto-analyze when significant state changes occur
    const timer = setTimeout(performAnalysis, 1000);
    return () => clearTimeout(timer);
  }, [currentState.isotope, currentState.fractalToggle, tpttV4Result?.tPTT_value]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'medium': return <TrendingUp className="w-4 h-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'anomaly': return 'destructive';
      case 'trend': return 'default';
      case 'optimization': return 'secondary';
      case 'correlation': return 'outline';
      default: return 'default';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Automated Analysis Engine
          <Button
            size="sm"
            variant="outline"
            onClick={performAnalysis}
            disabled={isAnalyzing}
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Analyze
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Analysis Progress */}
        {isAnalyzing && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Running analysis...</div>
            <Progress value={analysisProgress} className="w-full" />
          </div>
        )}

        {/* Last Analysis Time */}
        {lastAnalysisTime && !isAnalyzing && (
          <div className="text-xs text-muted-foreground">
            Last analysis: {lastAnalysisTime.toLocaleTimeString()}
          </div>
        )}

        {/* Insights */}
        <div className="space-y-3">
          {insights.length === 0 && !isAnalyzing ? (
            <Alert>
              <Brain className="w-4 h-4" />
              <AlertDescription>
                No insights generated. Run analysis to get automated recommendations.
              </AlertDescription>
            </Alert>
          ) : (
            insights.map((insight, index) => (
              <Alert key={index} className="border-l-4 border-l-primary/50">
                <div className="flex items-start gap-3">
                  {getSeverityIcon(insight.severity)}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{insight.title}</span>
                      <Badge variant={getTypeColor(insight.type) as any} className="text-xs">
                        {insight.type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {insight.description}
                    </div>
                    {insight.recommendation && (
                      <div className="text-sm p-2 bg-muted/50 rounded border-l-2 border-l-primary">
                        <strong>Recommendation:</strong> {insight.recommendation}
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            ))
          )}
        </div>

        {/* Analysis Statistics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">Total Insights</div>
            <div className="font-semibold">{insights.length}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">High Priority</div>
            <div className="font-semibold text-red-500">
              {insights.filter(i => i.severity === 'high').length}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};