-- Enable Row Level Security on the camera_credentials_decrypted view
ALTER VIEW public.camera_credentials_decrypted SET (security_invoker = true);

-- Since this is a view, we need to add RLS to the underlying table (camera_credentials)
-- The view already derives from camera_credentials which has RLS enabled
-- However, to properly secure the view, we should recreate it with security_invoker = true

-- Drop the existing view
DROP VIEW IF EXISTS public.camera_credentials_decrypted;

-- Recreate the view with security_invoker enabled
-- This ensures the view respects the RLS policies of the underlying table
CREATE VIEW public.camera_credentials_decrypted
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  camera_name,
  camera_url,
  created_at,
  updated_at,
  decrypt_credential(encrypted_username, user_id) as username,
  decrypt_credential(encrypted_password, user_id) as password
FROM public.camera_credentials;