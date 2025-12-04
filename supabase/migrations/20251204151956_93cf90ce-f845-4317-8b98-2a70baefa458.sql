-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create camera_settings table for per-camera configuration
CREATE TABLE public.camera_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  camera_id UUID REFERENCES public.camera_credentials(id) ON DELETE CASCADE,
  motion_enabled BOOLEAN DEFAULT false,
  motion_sensitivity INTEGER DEFAULT 70,
  motion_threshold NUMERIC DEFAULT 0.5,
  quality TEXT DEFAULT 'medium',
  recording_enabled BOOLEAN DEFAULT false,
  email_notifications BOOLEAN DEFAULT false,
  notification_email TEXT,
  schedule_enabled BOOLEAN DEFAULT false,
  start_hour INTEGER DEFAULT 22,
  end_hour INTEGER DEFAULT 6,
  cooldown_period INTEGER DEFAULT 30,
  min_motion_duration INTEGER DEFAULT 500,
  noise_reduction BOOLEAN DEFAULT true,
  detection_zones_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, camera_id)
);

-- Enable RLS
ALTER TABLE public.camera_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own camera_settings"
ON public.camera_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own camera_settings"
ON public.camera_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own camera_settings"
ON public.camera_settings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own camera_settings"
ON public.camera_settings FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_camera_settings_updated_at
BEFORE UPDATE ON public.camera_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();