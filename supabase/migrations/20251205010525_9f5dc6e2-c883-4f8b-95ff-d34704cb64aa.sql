-- Drop the security definer view and recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.camera_credentials_decrypted;

-- Recreate the view with SECURITY INVOKER (default) to enforce RLS of querying user
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
FROM public.camera_credentials
WHERE user_id = auth.uid();

-- Grant access to the view for authenticated users
GRANT SELECT ON public.camera_credentials_decrypted TO authenticated;