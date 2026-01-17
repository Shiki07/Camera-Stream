-- Update encrypt_credential function to validate user_id matches auth.uid()
CREATE OR REPLACE FUNCTION public.encrypt_credential(plaintext text, user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  encryption_key bytea;
  secret text;
BEGIN
  -- Validate that the caller is the owner of this user_id
  IF user_id IS NULL OR user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user_id must match authenticated user';
  END IF;

  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;

  secret := current_setting('app.encryption_secret', true);
  IF secret IS NULL OR secret = '' THEN
    secret := 'cam_alert_secure_key_v1';
  END IF;

  -- Derive a 32-byte key using SHA-256 of user_id + secret
  encryption_key := extensions.digest((user_id::text || secret)::text, 'sha256'::text);

  -- Encrypt using AES and encode as base64
  RETURN encode(
    extensions.encrypt_iv(
      plaintext::bytea,
      encryption_key,
      substring(encryption_key from 1 for 16),
      'aes-cbc/pad:pkcs'
    ),
    'base64'
  );
END;
$function$;

-- Update decrypt_credential function to validate user_id matches auth.uid()
CREATE OR REPLACE FUNCTION public.decrypt_credential(ciphertext text, user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  encryption_key bytea;
  secret text;
  decrypted bytea;
BEGIN
  -- Validate that the caller is the owner of this user_id
  IF user_id IS NULL OR user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user_id must match authenticated user';
  END IF;

  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN NULL;
  END IF;

  secret := current_setting('app.encryption_secret', true);
  IF secret IS NULL OR secret = '' THEN
    secret := 'cam_alert_secure_key_v1';
  END IF;

  encryption_key := extensions.digest((user_id::text || secret)::text, 'sha256'::text);

  BEGIN
    decrypted := extensions.decrypt_iv(
      decode(ciphertext, 'base64'),
      encryption_key,
      substring(encryption_key from 1 for 16),
      'aes-cbc/pad:pkcs'
    );
    RETURN convert_from(decrypted, 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$function$;

COMMENT ON FUNCTION public.encrypt_credential(text, uuid) IS 'Encrypts credential data. Only the authenticated user matching user_id can encrypt their own credentials.';
COMMENT ON FUNCTION public.decrypt_credential(text, uuid) IS 'Decrypts credential data. Only the authenticated user matching user_id can decrypt their own credentials.';