import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const rateLimits = new Map<string, { count: number; resetTime: number }>();

type RecordingLocation = 'sd_card' | 'nas' | 'local_media';

type HomeAssistantStoredMetadata = {
  url?: string;
  webhookId?: string;
  enabled?: boolean;
  recordingLocation?: RecordingLocation;
};

const checkRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const limit = rateLimits.get(userId);

  if (!limit || now > limit.resetTime) {
    rateLimits.set(userId, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (limit.count >= 10) {
    return false;
  }

  limit.count++;
  return true;
};

const validateHAUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) &&
           parsed.hostname.length > 0 &&
           !['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
};

const validateHAToken = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  return token.length >= 100 && token.length <= 500 && /^[A-Za-z0-9._-]+$/.test(token);
};

const parseStoredConfiguration = (storedValue: string): {
  encryptedToken: string;
  metadata: HomeAssistantStoredMetadata;
} => {
  const [encryptedToken = '', rawMetadata] = storedValue.split('|||');

  if (!rawMetadata) {
    return { encryptedToken, metadata: {} };
  }

  try {
    return {
      encryptedToken,
      metadata: JSON.parse(rawMetadata) as HomeAssistantStoredMetadata,
    };
  } catch (error) {
    console.warn('Failed to parse stored Home Assistant metadata:', error);
    return { encryptedToken, metadata: {} };
  }
};

const buildConfig = (token: string, metadata: HomeAssistantStoredMetadata, enabledOverride?: boolean) => ({
  token,
  url: metadata.url || '',
  webhookId: metadata.webhookId || '',
  enabled: enabledOverride ?? metadata.enabled ?? false,
  recordingLocation: metadata.recordingLocation || 'sd_card',
});

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const getTokenEncryptionSecret = (): string => {
  const secret = Deno.env.get('TOKEN_ENCRYPTION_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) {
    throw new Error('Missing token encryption secret');
  }

  return secret;
};

const toBase64 = (input: ArrayBuffer | Uint8Array): string => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return btoa(String.fromCharCode(...bytes));
};

const fromBase64 = (value: string): ArrayBuffer => {
  const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

const deriveEncryptionKey = async (userId: string): Promise<CryptoKey> => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(getTokenEncryptionSecret()),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: textEncoder.encode(`token:${userId}`),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

const encryptToken = async (plaintext: string, userId: string): Promise<string> => {
  const key = await deriveEncryptionKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(plaintext)
  );

  return `${toBase64(iv)}:${toBase64(ciphertext)}`;
};

const decryptToken = async (ciphertext: string, userId: string): Promise<string | null> => {
  const [ivBase64, encryptedBase64] = ciphertext.split(':');
  if (!ivBase64 || !encryptedBase64) {
    return null;
  }

  try {
    const key = await deriveEncryptionKey(userId);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(ivBase64) },
      key,
      fromBase64(encryptedBase64)
    );

    return textDecoder.decode(decrypted);
  } catch (error) {
    console.warn('Unable to decrypt stored Home Assistant token', error);
    return null;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // User-authenticated client for claims verification and encrypt/decrypt RPC (requires auth.uid())
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    });

    // Try standard auth first, then JWT decode fallback
    let userId: string | null = null;
    
    try {
      const { data: userData, error: authError } = await supabaseUserClient.auth.getUser();
      if (!authError && userData?.user?.id) {
        userId = userData.user.id;
      }
    } catch (e) {
      console.warn('Standard auth check failed, trying JWT fallback:', e);
    }

    if (!userId) {
      try {
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        if (payload.sub && payload.role === 'authenticated') {
          userId = payload.sub;
          console.log('Authenticated via JWT decode fallback');
        }
      } catch (e) {
        console.warn('JWT decode fallback failed:', e);
      }
    }

    if (!userId) {
      console.warn('Auth verification failed: no valid user ID found');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session. Please log in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody = await req.json();
    const { action } = requestBody;

    if (action === 'save') {
      const { token, url, webhookId, enabled, recordingLocation } = requestBody;

      if (!validateHAToken(token)) {
        return new Response(
          JSON.stringify({ error: 'Invalid Home Assistant token format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (url && !validateHAUrl(url)) {
        return new Response(
          JSON.stringify({ error: 'Invalid Home Assistant URL format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let encryptedToken: string;
      try {
        encryptedToken = await encryptToken(token, userId);
      } catch (error) {
        console.error('Error encrypting token:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to encrypt token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const metadata = JSON.stringify({
        url: url || '',
        webhookId: webhookId || '',
        enabled: enabled ?? false,
        recordingLocation: (recordingLocation || 'sd_card') as RecordingLocation,
      });

      const { data: existingToken } = await supabase
        .from('user_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('token_type', 'homeassistant')
        .maybeSingle();

      let upsertError;
      if (existingToken) {
        const { error } = await supabase
          .from('user_tokens')
          .update({
            encrypted_token: `${encryptedToken}|||${metadata}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingToken.id);
        upsertError = error;
      } else {
        const { error } = await supabase
          .from('user_tokens')
          .insert({
            user_id: userId,
            token_type: 'homeassistant',
            encrypted_token: `${encryptedToken}|||${metadata}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        upsertError = error;
      }

      if (upsertError) {
        console.error('Error saving token:', upsertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save configuration' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Home Assistant configuration saved successfully');
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'load') {
      const { data: tokenRecord } = await supabase
        .from('user_tokens')
        .select('encrypted_token')
        .eq('user_id', userId)
        .eq('token_type', 'homeassistant')
        .maybeSingle();

      if (!tokenRecord?.encrypted_token) {
        return new Response(
          JSON.stringify({ success: true, config: null }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { encryptedToken, metadata } = parseStoredConfiguration(tokenRecord.encrypted_token);

      if (!encryptedToken) {
        return new Response(
          JSON.stringify({ success: true, config: buildConfig('', metadata, false), requiresTokenReset: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const decryptedToken = await decryptToken(encryptedToken, userId);

      if (!decryptedToken) {
        console.warn('HA token decryption returned null for user', userId);
        return new Response(
          JSON.stringify({
            success: true,
            config: buildConfig('', metadata, false),
            requiresTokenReset: true,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log token length and prefix for debugging (never log full token)
      console.log(`HA token loaded: length=${decryptedToken.length}, prefix=${decryptedToken.substring(0, 10)}...`);

      return new Response(
        JSON.stringify({
          success: true,
          config: buildConfig(decryptedToken, metadata),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      await supabase
        .from('user_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('token_type', 'homeassistant');

      console.log('Home Assistant configuration deleted');
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('HA token manager error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
