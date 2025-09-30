-- Fix security linter warning: Set search_path for function (with CASCADE)
DROP FUNCTION IF EXISTS public.update_cti_session_timestamp() CASCADE;

CREATE OR REPLACE FUNCTION public.update_cti_session_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Re-create the trigger
CREATE TRIGGER update_cti_sessions_updated_at
  BEFORE UPDATE ON public.cti_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cti_session_timestamp();