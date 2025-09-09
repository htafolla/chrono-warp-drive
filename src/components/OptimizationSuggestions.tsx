import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lightbulb, Zap, TrendingUp, Target, X, ChevronRight } from 'lucide-react';

interface OptimizationSuggestion {
  id: string;
  type: 'energy' | 'spectrum' | 'configuration' | 'timing';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  action: string;
  estimatedImprovement: number; // percentage
  implementable: boolean;
}

interface OptimizationSuggestionsProps {
  e_t: number;
  targetE_t: number;
  transportReadiness: number;
  energyGrowthRate: number;
  isRealtime: boolean;
  fractalToggle: boolean;
  spectrumBoost: number;
  neuralBoost: number;
  phaseCoherence: number;
  neuralSync: number;
  adaptiveThreshold: number;
  tPTT_value: number;
  onOptimize: (suggestion: OptimizationSuggestion) => void;
  onDismiss?: (suggestionId: string) => void;
}

export const OptimizationSuggestions = ({
  e_t,
  targetE_t,
  transportReadiness,
  energyGrowthRate,
  isRealtime,
  fractalToggle,
  spectrumBoost,
  neuralBoost,
  phaseCoherence,
  neuralSync,
  adaptiveThreshold,
  tPTT_value,
  onOptimize,
  onDismiss
}: OptimizationSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  // Generate suggestions based on current system state
  useEffect(() => {
    const newSuggestions: OptimizationSuggestion[] = [];

    // Energy-related suggestions
    if (e_t < targetE_t * 0.5) {
      newSuggestions.push({
        id: 'low-energy',
        type: 'energy',
        priority: 'high',
        title: 'Increase Energy Growth Rate',
        description: 'Current energy level is below 50% of target. Increasing growth rate will accelerate energy accumulation.',
        impact: 'Faster transport readiness',
        action: 'Increase growth rate multiplier',
        estimatedImprovement: 25,
        implementable: energyGrowthRate < 8
      });
    }

    if (!isRealtime && transportReadiness < 60) {
      newSuggestions.push({
        id: 'enable-realtime',
        type: 'configuration',
        priority: 'high',
        title: 'Enable Realtime Mode',
        description: 'Realtime mode provides continuous energy updates and faster system response.',
        impact: 'Immediate boost to energy accumulation',
        action: 'Enable realtime mode',
        estimatedImprovement: 30,
        implementable: true
      });
    }

    if (!fractalToggle) {
      newSuggestions.push({
        id: 'enable-fractal',
        type: 'configuration',
        priority: 'medium',
        title: 'Enable Fractal Enhancement',
        description: 'Fractal mode provides a 20% energy bonus and improves transport stability.',
        impact: '+20% energy boost',
        action: 'Enable fractal toggle',
        estimatedImprovement: 20,
        implementable: true
      });
    }

    // Spectrum-related suggestions
    if (spectrumBoost < 0.3) {
      newSuggestions.push({
        id: 'better-spectrum',
        type: 'spectrum',
        priority: 'high',
        title: 'Select High-Energy Spectrum',
        description: 'Current spectrum provides minimal energy boost. O-Type or B-Type stars offer significantly better performance.',
        impact: 'Up to 5x energy multiplier',
        action: 'Select O-Type stellar spectrum',
        estimatedImprovement: 40,
        implementable: true
      });
    }

    // Neural synchronization suggestions
    if (neuralSync < 70) {
      newSuggestions.push({
        id: 'improve-neural',
        type: 'configuration',
        priority: 'medium',
        title: 'Optimize Neural Synchronization',
        description: 'Neural sync below optimal levels. Adjusting temporal phases can improve coherence.',
        impact: 'Better transport efficiency',
        action: 'Recalibrate neural systems',
        estimatedImprovement: 15,
        implementable: false // Requires manual adjustment
      });
    }

    // Phase coherence suggestions
    if (phaseCoherence < 60) {
      newSuggestions.push({
        id: 'phase-coherence',
        type: 'configuration',
        priority: 'medium',
        title: 'Improve Phase Coherence',
        description: 'Low phase coherence affects transport stability. Consider isotope adjustment.',
        impact: 'More stable transport',
        action: 'Adjust temporal phases',
        estimatedImprovement: 18,
        implementable: false // Requires isotope change
      });
    }

    // Timing-related suggestions
    if (transportReadiness > 95 && e_t > targetE_t * 0.9) {
      newSuggestions.push({
        id: 'optimal-window',
        type: 'timing',
        priority: 'low',
        title: 'Optimal Transport Window',
        description: 'System is in optimal state for transport. Consider executing transport now.',
        impact: 'Maximum efficiency transport',
        action: 'Execute transport',
        estimatedImprovement: 35,
        implementable: true
      });
    }

    // Advanced optimization for high-performance systems
    if (transportReadiness > 80 && energyGrowthRate > 5) {
      newSuggestions.push({
        id: 'fine-tuning',
        type: 'configuration',
        priority: 'low',
        title: 'Fine-tune Parameters',
        description: 'System performing well. Minor adjustments can provide marginal improvements.',
        impact: 'Marginal efficiency gains',
        action: 'Optimize system parameters',
        estimatedImprovement: 8,
        implementable: false
      });
    }

    // Filter out dismissed suggestions
    const filteredSuggestions = newSuggestions.filter(s => !dismissedSuggestions.has(s.id));
    setSuggestions(filteredSuggestions);
  }, [
    e_t, targetE_t, transportReadiness, energyGrowthRate, isRealtime, fractalToggle,
    spectrumBoost, neuralBoost, phaseCoherence, neuralSync, dismissedSuggestions
  ]);

  const handleDismiss = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]));
    onDismiss?.(suggestionId);
  };

  const handleOptimize = (suggestion: OptimizationSuggestion) => {
    onOptimize(suggestion);
    if (suggestion.implementable) {
      handleDismiss(suggestion.id);
    }
  };

  const getPriorityColor = (priority: OptimizationSuggestion['priority']) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getTypeIcon = (type: OptimizationSuggestion['type']) => {
    switch (type) {
      case 'energy': return <Zap className="h-4 w-4" />;
      case 'spectrum': return <Target className="h-4 w-4" />;
      case 'timing': return <TrendingUp className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const visibleSuggestions = showAll ? suggestions : suggestions.slice(0, 3);
  const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high');

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            System Optimized
            <Badge variant="default">All Good</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-sm text-muted-foreground">
              No optimization suggestions at this time. Your system is running well!
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Optimization Suggestions
            <Badge variant="secondary">{suggestions.length}</Badge>
          </div>
          {suggestions.length > 3 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Less' : 'Show All'}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* High Priority Alert */}
        {highPrioritySuggestions.length > 0 && (
          <Alert variant="destructive">
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              {highPrioritySuggestions.length} high-priority optimization{highPrioritySuggestions.length > 1 ? 's' : ''} available. 
              Implementing these could improve performance by up to {Math.max(...highPrioritySuggestions.map(s => s.estimatedImprovement))}%.
            </AlertDescription>
          </Alert>
        )}

        {/* Suggestions List */}
        <div className="space-y-3">
          {visibleSuggestions.map((suggestion) => (
            <div key={suggestion.id} className="p-4 border rounded-lg relative">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getTypeIcon(suggestion.type)}
                  <span className="font-medium text-sm">{suggestion.title}</span>
                  <Badge variant={getPriorityColor(suggestion.priority) as any}>
                    {suggestion.priority}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    +{suggestion.estimatedImprovement}%
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDismiss(suggestion.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground mb-2">
                {suggestion.description}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-muted-foreground">Impact:</span> {suggestion.impact}
                </div>
                <Button
                  size="sm"
                  variant={suggestion.implementable ? "default" : "outline"}
                  onClick={() => handleOptimize(suggestion)}
                  disabled={!suggestion.implementable}
                  className="h-7 text-xs"
                >
                  {suggestion.action}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 bg-muted rounded text-center">
            <div className="text-muted-foreground">Total</div>
            <div className="font-bold">{suggestions.length}</div>
          </div>
          <div className="p-2 bg-muted rounded text-center">
            <div className="text-muted-foreground">Implementable</div>
            <div className="font-bold">{suggestions.filter(s => s.implementable).length}</div>
          </div>
          <div className="p-2 bg-muted rounded text-center">
            <div className="text-muted-foreground">Max Gain</div>
            <div className="font-bold">+{Math.max(...suggestions.map(s => s.estimatedImprovement), 0)}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};