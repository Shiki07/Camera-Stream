-- Fix critical security issue: Add RLS to camera_credentials_decrypted view
-- This view currently exposes decrypted camera credentials to all authenticated users

-- Drop and recreate the view with SECURITY INVOKER to respect RLS from the base table
DROP VIEW IF EXISTS public.camera_credentials_decrypted;

-- Recreate the view with security_invoker = true so it respects the RLS policies on camera_credentials
CREATE OR REPLACE VIEW public.camera_credentials_decrypted
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  camera_name,
  camera_url,
  created_at,
  updated_at,
  -- Decrypt username if encrypted, otherwise return plaintext
  CASE 
    WHEN encrypted_username IS NOT NULL THEN decrypt_credential(encrypted_username, user_id)
    ELSE username 
  END as username,
  -- Decrypt password if encrypted, otherwise return plaintext
  CASE 
    WHEN encrypted_password IS NOT NULL THEN decrypt_credential(encrypted_password, user_id)
    ELSE password 
  END as password
FROM public.camera_credentials;

-- Grant appropriate permissions
GRANT SELECT ON public.camera_credentials_decrypted TO authenticated;

-- Add a comment documenting the security design
COMMENT ON VIEW public.camera_credentials_decrypted IS 'Decrypted view of camera credentials. Uses security_invoker=true to enforce RLS from camera_credentials table. Each user can only see their own credentials.';