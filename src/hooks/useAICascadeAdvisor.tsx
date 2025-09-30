import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIAnalysis {
  breakthroughProbability: number;
  optimalN: number;
  optimalDeltaPhase: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
  reasoning: string;
}

interface HistoricalContext {
  avgEfficiency: number;
  avgQEnt: number;
  breakthroughCount: number;
  totalRuns: number;
}

export const useAICascadeAdvisor = () => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [context, setContext] = useState<HistoricalContext | null>(null);
  const { toast } = useToast();

  const getAdvice = async (n: number, deltaPhase: number, sessionId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cascade-ai-advisor', {
        body: { n, deltaPhase, sessionId }
      });

      if (error) throw error;

      if (data.success) {
        setAnalysis(data.analysis);
        setContext(data.historicalContext);
        
        toast({
          title: "AI Analysis Complete",
          description: `Breakthrough probability: ${data.analysis.breakthroughProbability}%`,
        });
      } else {
        throw new Error(data.error || 'AI analysis failed');
      }
    } catch (error) {
      console.error('AI Advisor error:', error);
      toast({
        title: "AI Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    getAdvice,
    loading,
    analysis,
    context
  };
};
