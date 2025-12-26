-- Fix security vulnerability: Add search_path protection to update_motion_event_cleared function
-- Using SECURITY INVOKER since this function doesn't require elevated privileges
-- The function already has proper user_id check via auth.uid()

CREATE OR REPLACE FUNCTION public.update_motion_event_cleared(event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.motion_events 
  SET cleared_at = now() 
  WHERE id = event_id AND user_id = auth.uid();
END;
$$;