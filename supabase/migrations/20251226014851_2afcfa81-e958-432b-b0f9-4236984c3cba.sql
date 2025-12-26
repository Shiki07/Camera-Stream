-- Add columns for camera sync across devices
ALTER TABLE public.camera_credentials
ADD COLUMN IF NOT EXISTS camera_type text DEFAULT 'network',
ADD COLUMN IF NOT EXISTS source_device_id text,
ADD COLUMN IF NOT EXISTS source_device_name text,
ADD COLUMN IF NOT EXISTS ha_entity_id text,
ADD COLUMN IF NOT EXISTS stream_type text DEFAULT 'mjpeg',
ADD COLUMN IF NOT EXISTS quality text DEFAULT 'medium';

-- Add index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_camera_credentials_user_id ON public.camera_credentials(user_id);

-- Enable realtime for camera_credentials
ALTER PUBLICATION supabase_realtime ADD TABLE public.camera_credentials;