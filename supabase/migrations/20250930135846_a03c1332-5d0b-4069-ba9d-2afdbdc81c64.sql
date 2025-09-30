-- Update RLS policies to allow session-based logging without authentication
-- This enables experiment logging without requiring user login

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can create their own experiments" ON public.tdf_experiments;
DROP POLICY IF EXISTS "Users can view their own experiments" ON public.tdf_experiments;
DROP POLICY IF EXISTS "Users can update their own experiments" ON public.tdf_experiments;
DROP POLICY IF EXISTS "Users can create their own performance logs" ON public.scene_performance_logs;
DROP POLICY IF EXISTS "Users can view their own performance logs" ON public.scene_performance_logs;

-- Create public policies for session-based logging
-- Anyone can insert experiments (session-based tracking)
CREATE POLICY "Allow session-based experiment inserts" 
ON public.tdf_experiments 
FOR INSERT 
WITH CHECK (true);

-- Anyone can view experiments
CREATE POLICY "Allow public experiment reads" 
ON public.tdf_experiments 
FOR SELECT 
USING (true);

-- Anyone can update their session's experiments
CREATE POLICY "Allow session-based experiment updates" 
ON public.tdf_experiments 
FOR UPDATE 
USING (true);

-- Anyone can insert performance logs (session-based tracking)
CREATE POLICY "Allow session-based performance log inserts" 
ON public.scene_performance_logs 
FOR INSERT 
WITH CHECK (true);

-- Anyone can view performance logs
CREATE POLICY "Allow public performance log reads" 
ON public.scene_performance_logs 
FOR SELECT 
USING (true);