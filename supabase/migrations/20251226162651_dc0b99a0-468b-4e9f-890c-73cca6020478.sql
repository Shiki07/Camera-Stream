-- Add relay columns to camera_credentials for automatic webcam relay
ALTER TABLE public.camera_credentials
ADD COLUMN IF NOT EXISTS relay_room_id text,
ADD COLUMN IF NOT EXISTS relay_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS relay_last_heartbeat timestamp with time zone;

-- Create index for efficient queries on active relays
CREATE INDEX IF NOT EXISTS idx_camera_credentials_relay_active 
ON public.camera_credentials(user_id, relay_active) 
WHERE relay_active = true;