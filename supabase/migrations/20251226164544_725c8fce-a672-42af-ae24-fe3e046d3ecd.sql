-- Create table for storing relay frames (temporary frame storage)
CREATE TABLE public.relay_frames (
  room_id text PRIMARY KEY,
  frame text NOT NULL,
  host_id text,
  host_name text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for cleanup queries
CREATE INDEX idx_relay_frames_updated_at ON public.relay_frames(updated_at);

-- Enable RLS
ALTER TABLE public.relay_frames ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read frames (public access for viewers)
CREATE POLICY "Anyone can read relay frames" 
ON public.relay_frames 
FOR SELECT 
USING (true);

-- Allow authenticated users to insert/update frames
CREATE POLICY "Authenticated users can push frames" 
ON public.relay_frames 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update frames" 
ON public.relay_frames 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete frames" 
ON public.relay_frames 
FOR DELETE 
USING (auth.uid() IS NOT NULL);