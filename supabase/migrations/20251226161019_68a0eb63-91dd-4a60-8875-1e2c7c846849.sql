-- Create table to store active shared camera streams
CREATE TABLE public.shared_streams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  room_id text NOT NULL UNIQUE,
  camera_name text NOT NULL,
  camera_type text DEFAULT 'webcam',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  last_heartbeat timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shared_streams ENABLE ROW LEVEL SECURITY;

-- Users can view their own shared streams (for viewing on other devices)
CREATE POLICY "Users can view their own shared_streams"
ON public.shared_streams
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own shared streams
CREATE POLICY "Users can create their own shared_streams"
ON public.shared_streams
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own shared streams
CREATE POLICY "Users can update their own shared_streams"
ON public.shared_streams
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own shared streams
CREATE POLICY "Users can delete their own shared_streams"
ON public.shared_streams
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_shared_streams_user_id ON public.shared_streams(user_id);
CREATE INDEX idx_shared_streams_room_id ON public.shared_streams(room_id);
CREATE INDEX idx_shared_streams_active ON public.shared_streams(is_active) WHERE is_active = true;