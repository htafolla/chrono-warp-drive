// Phase 6: Neural Cascade Prediction System
// Predicts breakthrough probability and optimal cascade parameters

export interface CascadePrediction {
  optimalN: number;
  optimalDeltaPhase: number;
  breakthroughProbability: number;
  predictedEfficiency: number;
  confidenceScore: number;
  recommendation: string;
}

export interface HistoricalCascadeData {
  n: number;
  deltaPhase: number;
  efficiency: number;
  qEnt: number;
  timestamp: number;
}

export class NeuralCascadePredictor {
  private history: HistoricalCascadeData[] = [];
  private readonly MAX_HISTORY = 100;

  // Add cascade data point to history
  addDataPoint(data: HistoricalCascadeData): void {
    this.history.push(data);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }
  }

  // Predict breakthrough probability based on historical data
  predictBreakthrough(n: number, deltaPhase: number): CascadePrediction {
    if (this.history.length < 5) {
      return this.getDefaultPrediction(n, deltaPhase);
    }

    // Analyze historical patterns
    const similarRuns = this.history.filter(h => 
      Math.abs(h.n - n) <= 2 && 
      Math.abs(h.deltaPhase - deltaPhase) <= 0.05
    );

    let breakthroughProbability = 0;
    let predictedEfficiency = 0;
    let confidenceScore = 0;

    if (similarRuns.length > 0) {
      // Calculate average efficiency from similar runs
      predictedEfficiency = similarRuns.reduce((sum, r) => sum + r.efficiency, 0) / similarRuns.length;
      
      // Breakthrough criteria: efficiency >= 95% and Q_ent > 0.8
      const breakthroughs = similarRuns.filter(r => r.efficiency >= 95 && r.qEnt > 0.8);
      breakthroughProbability = breakthroughs.length / similarRuns.length;
      
      // Confidence based on sample size
      confidenceScore = Math.min(1.0, similarRuns.length / 10);
    } else {
      // No similar data, use trend analysis
      const trendAnalysis = this.analyzeTrends(n, deltaPhase);
      breakthroughProbability = trendAnalysis.probability;
      predictedEfficiency = trendAnalysis.efficiency;
      confidenceScore = 0.5; // Lower confidence without direct data
    }

    // Find optimal parameters
    const optimal = this.findOptimalParameters();

    // Generate recommendation
    let recommendation = '';
    if (breakthroughProbability > 0.8) {
      recommendation = `Excellent breakthrough potential! Current parameters are optimal.`;
    } else if (breakthroughProbability > 0.5) {
      recommendation = `Good breakthrough potential. Consider adjusting to n=${optimal.optimalN}, δφ=${optimal.optimalDeltaPhase.toFixed(2)} for better results.`;
    } else if (breakthroughProbability > 0.2) {
      recommendation = `Moderate breakthrough potential. Recommend n=${optimal.optimalN}, δφ=${optimal.optimalDeltaPhase.toFixed(2)} for optimization.`;
    } else {
      recommendation = `Low breakthrough potential. Switch to n=${optimal.optimalN}, δφ=${optimal.optimalDeltaPhase.toFixed(2)} for best chance.`;
    }

    return {
      optimalN: optimal.optimalN,
      optimalDeltaPhase: optimal.optimalDeltaPhase,
      breakthroughProbability,
      predictedEfficiency,
      confidenceScore,
      recommendation
    };
  }

  // Analyze trends in historical data
  private analyzeTrends(n: number, deltaPhase: number): { probability: number; efficiency: number } {
    if (this.history.length < 3) {
      return { probability: 0.3, efficiency: 85 };
    }

    // Sort by timestamp (most recent first)
    const recent = [...this.history].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

    // Calculate trend direction
    const efficiencyTrend = this.calculateTrend(recent.map(r => r.efficiency));
    const qEntTrend = this.calculateTrend(recent.map(r => r.qEnt));

    // Predict based on trends
    const latestEfficiency = recent[0].efficiency;
    const predictedEfficiency = Math.max(0, Math.min(100, latestEfficiency + efficiencyTrend * 2));

    // Breakthrough probability based on efficiency and Q_ent trends
    let probability = 0;
    if (predictedEfficiency >= 95 && qEntTrend > 0) {
      probability = 0.7 + (predictedEfficiency - 95) * 0.05;
    } else if (predictedEfficiency >= 90) {
      probability = 0.5 + (predictedEfficiency - 90) * 0.04;
    } else if (predictedEfficiency >= 80) {
      probability = 0.3 + (predictedEfficiency - 80) * 0.02;
    } else {
      probability = 0.1;
    }

    return { 
      probability: Math.min(0.95, probability), 
      efficiency: predictedEfficiency 
    };
  }

  // Calculate linear trend (slope) of data series
  private calculateTrend(data: number[]): number {
    if (data.length < 2) return 0;

    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, y) => sum + y, 0);
    const sumXY = data.reduce((sum, y, i) => sum + i * y, 0);
    const sumX2 = data.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  // Find optimal cascade parameters from historical data
  private findOptimalParameters(): { optimalN: number; optimalDeltaPhase: number } {
    if (this.history.length === 0) {
      return { optimalN: 29, optimalDeltaPhase: 0.27 };
    }

    // Find the run with highest efficiency * Q_ent score
    const scored = this.history.map(h => ({
      ...h,
      score: h.efficiency * h.qEnt
    }));

    const best = scored.reduce((max, curr) => 
      curr.score > max.score ? curr : max
    );

    return {
      optimalN: best.n,
      optimalDeltaPhase: best.deltaPhase
    };
  }

  // Get default prediction when insufficient data
  private getDefaultPrediction(n: number, deltaPhase: number): CascadePrediction {
    // Codex v4.7 optimal ranges: n=25-34, δφ=0.25-0.3
    const isInOptimalRange = n >= 25 && n <= 34 && deltaPhase >= 0.25 && deltaPhase <= 0.3;
    
    let breakthroughProbability = 0.3;
    let predictedEfficiency = 85;
    
    if (isInOptimalRange) {
      // Higher baseline for optimal range
      breakthroughProbability = 0.6;
      predictedEfficiency = 92;
      
      // Bonus for n=29-31, δφ=0.27-0.29 (sweet spot)
      if (n >= 29 && n <= 31 && deltaPhase >= 0.27 && deltaPhase <= 0.29) {
        breakthroughProbability = 0.8;
        predictedEfficiency = 97;
      }
    }

    return {
      optimalN: 29,
      optimalDeltaPhase: 0.27,
      breakthroughProbability,
      predictedEfficiency,
      confidenceScore: 0.3,
      recommendation: `Insufficient historical data. Recommend n=29, δφ=0.27 based on Codex v4.7 specifications.`
    };
  }

  // Get prediction statistics
  getStatistics(): {
    totalRuns: number;
    avgEfficiency: number;
    breakthroughCount: number;
    breakthroughRate: number;
  } {
    if (this.history.length === 0) {
      return { totalRuns: 0, avgEfficiency: 0, breakthroughCount: 0, breakthroughRate: 0 };
    }

    const avgEfficiency = this.history.reduce((sum, h) => sum + h.efficiency, 0) / this.history.length;
    const breakthroughCount = this.history.filter(h => h.efficiency >= 95 && h.qEnt > 0.8).length;
    const breakthroughRate = breakthroughCount / this.history.length;

    return {
      totalRuns: this.history.length,
      avgEfficiency,
      breakthroughCount,
      breakthroughRate
    };
  }

  // Clear history
  clearHistory(): void {
    this.history = [];
  }
}

// Singleton instance
export const cascadePredictor = new NeuralCascadePredictor();
