-- Create table for secure camera share tokens
CREATE TABLE public.camera_share_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  camera_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.camera_share_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own share tokens" 
ON public.camera_share_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own share tokens" 
ON public.camera_share_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own share tokens" 
ON public.camera_share_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own share tokens" 
ON public.camera_share_tokens 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for efficient token lookups
CREATE INDEX idx_camera_share_tokens_token ON public.camera_share_tokens (token);
CREATE INDEX idx_camera_share_tokens_camera_id ON public.camera_share_tokens (camera_id);
CREATE INDEX idx_camera_share_tokens_expires_at ON public.camera_share_tokens (expires_at);