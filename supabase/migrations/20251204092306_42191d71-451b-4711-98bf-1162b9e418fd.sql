-- Create recordings table
CREATE TABLE public.recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_size BIGINT,
  duration_seconds INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  storage_type TEXT DEFAULT 'local',
  storage_path TEXT,
  motion_detected BOOLEAN DEFAULT false,
  camera_id TEXT,
  pi_sync_status TEXT DEFAULT 'pending',
  pi_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create motion_events table
CREATE TABLE public.motion_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  camera_id TEXT,
  motion_level REAL,
  duration_ms INTEGER,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cleared_at TIMESTAMP WITH TIME ZONE,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create camera_credentials table
CREATE TABLE public.camera_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  camera_name TEXT NOT NULL,
  camera_url TEXT NOT NULL,
  username TEXT,
  password TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for recordings
CREATE POLICY "Users can view their own recordings" ON public.recordings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own recordings" ON public.recordings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recordings" ON public.recordings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recordings" ON public.recordings FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for motion_events
CREATE POLICY "Users can view their own motion_events" ON public.motion_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own motion_events" ON public.motion_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own motion_events" ON public.motion_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own motion_events" ON public.motion_events FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for camera_credentials
CREATE POLICY "Users can view their own camera_credentials" ON public.camera_credentials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own camera_credentials" ON public.camera_credentials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own camera_credentials" ON public.camera_credentials FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own camera_credentials" ON public.camera_credentials FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for profiles
CREATE POLICY "Profiles are viewable by owner" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update motion event cleared_at
CREATE OR REPLACE FUNCTION public.update_motion_event_cleared(event_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.motion_events SET cleared_at = now() WHERE id = event_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;