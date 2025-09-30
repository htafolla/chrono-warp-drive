import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { n, deltaPhase, sessionId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get historical cascade data
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: historicalData } = await supabase
      .from('cascade_updates')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);

    // Build context from historical data
    const avgEfficiency = historicalData?.reduce((sum, d) => sum + Number(d.efficiency), 0) / (historicalData?.length || 1);
    const avgQEnt = historicalData?.reduce((sum, d) => sum + Number(d.q_ent), 0) / (historicalData?.length || 1);
    const breakthroughCount = historicalData?.filter(d => Number(d.efficiency) > 0.92 && Number(d.q_ent) > 0.88).length || 0;

    const prompt = `You are an AI advisor for the TPTT Cascade Optimization System, analyzing quantum entanglement breakthrough probabilities.

Current Parameters:
- Cascade Index (n): ${n}
- Delta Phase: ${deltaPhase}

Historical Performance:
- Average Efficiency: ${avgEfficiency.toFixed(4)}
- Average Q_ent: ${avgQEnt.toFixed(4)}
- Breakthrough Count: ${breakthroughCount} (out of ${historicalData?.length || 0} runs)

Breakthrough Threshold: Efficiency > 0.92 AND Q_ent > 0.88

Based on the historical data and current parameters, provide:
1. Breakthrough probability (0-100%)
2. Optimal n value recommendation (range: 25-34)
3. Optimal deltaPhase recommendation (range: 0.1-0.5)
4. Risk assessment and confidence level
5. Specific actions to maximize breakthrough probability

Respond in JSON format:
{
  "breakthroughProbability": number,
  "optimalN": number,
  "optimalDeltaPhase": number,
  "confidence": number,
  "riskLevel": "low" | "medium" | "high",
  "recommendation": string,
  "reasoning": string
}`;

    console.log("Calling Lovable AI Gateway for cascade analysis...");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a quantum cascade optimization AI advisor. Always respond with valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    console.log("AI Response:", aiResponse);
    
    // Parse JSON from response
    let analysis;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      analysis = {
        breakthroughProbability: 50,
        optimalN: n,
        optimalDeltaPhase: deltaPhase,
        confidence: 50,
        riskLevel: "medium",
        recommendation: "Continue monitoring cascade performance",
        reasoning: "Unable to parse AI analysis"
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        historicalContext: {
          avgEfficiency,
          avgQEnt,
          breakthroughCount,
          totalRuns: historicalData?.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in cascade-ai-advisor:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
