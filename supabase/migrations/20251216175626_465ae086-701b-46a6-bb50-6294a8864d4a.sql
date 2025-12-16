-- Remove the decrypted credentials view entirely to eliminate any possibility of cross-user exposure.
-- The application should use per-user encrypted credentials from camera_credentials and decrypt client-side as needed.
DROP VIEW IF EXISTS public.camera_credentials_decrypted;