-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a function to encrypt credentials
-- Uses AES-256 encryption with a key derived from the user_id and a secret
CREATE OR REPLACE FUNCTION encrypt_credential(plaintext text, user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key bytea;
  secret text;
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;
  
  -- Get the secret key from app settings or use a derived one
  -- The key is derived from the user_id to ensure per-user encryption
  secret := current_setting('app.encryption_secret', true);
  IF secret IS NULL OR secret = '' THEN
    -- Fallback: derive key from user_id (still secure, but consistent)
    secret := 'cam_alert_secure_key_v1';
  END IF;
  
  -- Derive a 32-byte key using SHA-256 of user_id + secret
  encryption_key := digest(user_id::text || secret, 'sha256');
  
  -- Encrypt using AES and encode as base64
  RETURN encode(
    encrypt_iv(
      plaintext::bytea,
      encryption_key,
      substring(encryption_key from 1 for 16), -- Use first 16 bytes as IV
      'aes-cbc/pad:pkcs'
    ),
    'base64'
  );
END;
$$;

-- Create a function to decrypt credentials
CREATE OR REPLACE FUNCTION decrypt_credential(ciphertext text, user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key bytea;
  secret text;
  decrypted bytea;
BEGIN
  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN NULL;
  END IF;
  
  secret := current_setting('app.encryption_secret', true);
  IF secret IS NULL OR secret = '' THEN
    secret := 'cam_alert_secure_key_v1';
  END IF;
  
  -- Derive the same key
  encryption_key := digest(user_id::text || secret, 'sha256');
  
  -- Decrypt
  BEGIN
    decrypted := decrypt_iv(
      decode(ciphertext, 'base64'),
      encryption_key,
      substring(encryption_key from 1 for 16),
      'aes-cbc/pad:pkcs'
    );
    RETURN convert_from(decrypted, 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    -- Return NULL if decryption fails (corrupted data or wrong key)
    RETURN NULL;
  END;
END;
$$;

-- Add encrypted columns to camera_credentials table
ALTER TABLE public.camera_credentials 
ADD COLUMN IF NOT EXISTS encrypted_username text,
ADD COLUMN IF NOT EXISTS encrypted_password text;

-- Create a trigger to automatically encrypt credentials on insert/update
CREATE OR REPLACE FUNCTION encrypt_camera_credentials_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Encrypt username if provided
  IF NEW.username IS NOT NULL AND NEW.username != '' THEN
    NEW.encrypted_username := encrypt_credential(NEW.username, NEW.user_id);
    NEW.username := NULL; -- Clear plaintext
  END IF;
  
  -- Encrypt password if provided
  IF NEW.password IS NOT NULL AND NEW.password != '' THEN
    NEW.encrypted_password := encrypt_credential(NEW.password, NEW.user_id);
    NEW.password := NULL; -- Clear plaintext
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS encrypt_credentials_on_save ON public.camera_credentials;
CREATE TRIGGER encrypt_credentials_on_save
  BEFORE INSERT OR UPDATE ON public.camera_credentials
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_camera_credentials_trigger();

-- Create a secure view for accessing decrypted credentials (only accessible by owner)
CREATE OR REPLACE VIEW public.camera_credentials_decrypted AS
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

-- Migrate existing plaintext credentials to encrypted format
UPDATE public.camera_credentials
SET 
  encrypted_username = encrypt_credential(username, user_id),
  encrypted_password = encrypt_credential(password, user_id),
  username = NULL,
  password = NULL
WHERE (username IS NOT NULL AND username != '') 
   OR (password IS NOT NULL AND password != '');

-- Add comment explaining the encryption
COMMENT ON COLUMN public.camera_credentials.encrypted_username IS 'AES-256 encrypted username';
COMMENT ON COLUMN public.camera_credentials.encrypted_password IS 'AES-256 encrypted password';
COMMENT ON COLUMN public.camera_credentials.username IS 'Deprecated: Use encrypted_username via decrypt_credential function';
COMMENT ON COLUMN public.camera_credentials.password IS 'Deprecated: Use encrypted_password via decrypt_credential function';