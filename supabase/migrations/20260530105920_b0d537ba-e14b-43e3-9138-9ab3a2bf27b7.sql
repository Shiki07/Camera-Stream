
-- Remove sensitive tables from Realtime publication to prevent broadcast of camera credentials and motion events
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.camera_credentials;
    EXCEPTION WHEN undefined_object THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.motion_events;
    EXCEPTION WHEN undefined_object THEN NULL; END;
  END IF;
END $$;

-- Clean up any orphaned null-user relay frames, then enforce NOT NULL
DELETE FROM public.relay_frames WHERE user_id IS NULL;
ALTER TABLE public.relay_frames ALTER COLUMN user_id SET NOT NULL;

-- Revoke EXECUTE on SECURITY DEFINER helpers from anon; keep auth where appropriate
REVOKE EXECUTE ON FUNCTION public.encrypt_credential(text, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrypt_credential(text, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_motion_event_cleared(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;

-- Re-grant to authenticated for the functions they need
GRANT EXECUTE ON FUNCTION public.encrypt_credential(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_credential(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_motion_event_cleared(uuid) TO authenticated;
