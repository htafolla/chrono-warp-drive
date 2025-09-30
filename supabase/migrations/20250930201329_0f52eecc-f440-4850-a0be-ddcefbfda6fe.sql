-- Phase 2: Realtime Supabase Integration for CTI Cascade Synchronization
-- Create tables for multi-user CTI session tracking and real-time updates

-- CTI Sessions table for tracking active cascade sessions
CREATE TABLE IF NOT EXISTS public.cti_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cascade_level INTEGER NOT NULL DEFAULT 29,
  tdf_value NUMERIC,
  q_ent NUMERIC,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Cascade Updates table for real-time CTI broadcast data
CREATE TABLE IF NOT EXISTS public.cascade_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES public.cti_sessions(session_id) ON DELETE CASCADE,
  cascade_index INTEGER NOT NULL,
  cti_value NUMERIC NOT NULL,
  q_ent NUMERIC NOT NULL,
  delta_phase NUMERIC NOT NULL,
  n INTEGER NOT NULL,
  tdf_value NUMERIC NOT NULL,
  efficiency NUMERIC NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Performance Metrics table for FPS/memory tracking
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES public.cti_sessions(session_id) ON DELETE CASCADE,
  fps INTEGER NOT NULL,
  memory_mb INTEGER NOT NULL,
  vertex_count INTEGER NOT NULL,
  cascade_level INTEGER NOT NULL,
  quality_setting TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cti_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cascade_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public read access (collaborative testing)
CREATE POLICY "Anyone can view CTI sessions"
  ON public.cti_sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create CTI sessions"
  ON public.cti_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Session owners can update their sessions"
  ON public.cti_sessions FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can view cascade updates"
  ON public.cascade_updates FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create cascade updates"
  ON public.cascade_updates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view performance metrics"
  ON public.performance_metrics FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert performance metrics"
  ON public.performance_metrics FOR INSERT
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_cti_sessions_session_id ON public.cti_sessions(session_id);
CREATE INDEX idx_cascade_updates_session_id ON public.cascade_updates(session_id);
CREATE INDEX idx_cascade_updates_timestamp ON public.cascade_updates(timestamp);
CREATE INDEX idx_performance_metrics_session_id ON public.performance_metrics(session_id);

-- Enable realtime for cascade updates and performance metrics
ALTER PUBLICATION supabase_realtime ADD TABLE public.cascade_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_metrics;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_cti_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cti_sessions_updated_at
  BEFORE UPDATE ON public.cti_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cti_session_timestamp();