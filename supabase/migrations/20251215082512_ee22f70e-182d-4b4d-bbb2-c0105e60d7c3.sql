-- Drop and recreate the view with security_invoker = true
-- This ensures the view respects RLS policies of the underlying camera_credentials table

DROP VIEW IF EXISTS public.camera_credentials_decrypted;

CREATE VIEW public.camera_credentials_decrypted
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  camera_name,
  camera_url,
  decrypt_credential(encrypted_username, user_id) as username,
  decrypt_credential(encrypted_password, user_id) as password,
  created_at,
  updated_at
FROM public.camera_credentials;