-- Create scene performance logging table for TDF Scene Optimization
CREATE TABLE public.scene_performance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  tdf_value NUMERIC NOT NULL,
  fps INTEGER NOT NULL,
  memory_usage BIGINT NOT NULL,
  vertex_count INTEGER NOT NULL,
  cycle_number INTEGER NOT NULL,
  breakthrough_validated BOOLEAN DEFAULT false,
  quality_setting TEXT NOT NULL CHECK (quality_setting IN ('low', 'medium', 'high')),
  particles_enabled BOOLEAN DEFAULT true,
  shadows_enabled BOOLEAN DEFAULT true,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_id TEXT,
  performance_warnings TEXT[]
);

-- Create experiment tracking table
CREATE TABLE public.tdf_experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  experiment_name TEXT NOT NULL,
  tdf_components JSONB NOT NULL,
  time_shift_metrics JSONB NOT NULL,
  performance_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed'))
);

-- Enable Row Level Security
ALTER TABLE public.scene_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tdf_experiments ENABLE ROW LEVEL SECURITY;

-- Create policies for scene_performance_logs
CREATE POLICY "Users can view their own performance logs" 
ON public.scene_performance_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own performance logs" 
ON public.scene_performance_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policies for tdf_experiments  
CREATE POLICY "Users can view their own experiments" 
ON public.tdf_experiments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own experiments" 
ON public.tdf_experiments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own experiments" 
ON public.tdf_experiments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_scene_logs_user_timestamp ON public.scene_performance_logs(user_id, timestamp DESC);
CREATE INDEX idx_scene_logs_tdf_value ON public.scene_performance_logs(tdf_value);
CREATE INDEX idx_experiments_user_status ON public.tdf_experiments(user_id, status);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.completed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;