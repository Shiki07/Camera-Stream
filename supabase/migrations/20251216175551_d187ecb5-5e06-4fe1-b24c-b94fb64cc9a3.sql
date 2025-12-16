-- Lock down permissions on the decrypted credentials view
-- Even with security_invoker, the view itself must not be selectable by anon/public roles.

REVOKE ALL ON TABLE public.camera_credentials_decrypted FROM PUBLIC;
REVOKE ALL ON TABLE public.camera_credentials_decrypted FROM anon;

-- Allow only authenticated users to select from the view (RLS on camera_credentials will still apply)
GRANT SELECT ON TABLE public.camera_credentials_decrypted TO authenticated;

-- Ensure the view uses invoker privileges (so underlying RLS is enforced)
ALTER VIEW public.camera_credentials_decrypted SET (security_invoker = true);