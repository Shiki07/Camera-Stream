-- Remove the trigger that references the plaintext columns
DROP TRIGGER IF EXISTS encrypt_credentials_on_save ON public.camera_credentials;

-- Remove the encryption trigger function
DROP FUNCTION IF EXISTS public.encrypt_camera_credentials_trigger();

-- Remove the plaintext columns - only encrypted columns will remain
ALTER TABLE public.camera_credentials 
DROP COLUMN IF EXISTS username,
DROP COLUMN IF EXISTS password;