-- Enable realtime for motion_events table
ALTER TABLE public.motion_events REPLICA IDENTITY FULL;

-- Add to realtime publication (only if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'motion_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.motion_events;
  END IF;
END
$$;