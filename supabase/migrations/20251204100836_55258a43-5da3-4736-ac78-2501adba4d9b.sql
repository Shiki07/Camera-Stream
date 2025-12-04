-- Fix function search_path security issue
CREATE OR REPLACE FUNCTION public.update_motion_event_cleared(event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.motion_events 
  SET cleared_at = now() 
  WHERE id = event_id AND user_id = auth.uid();
END;
$$;