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
    
    // Verify JWT using admin client (reliable for all token types)
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      console.warn('Auth verification failed:', authError?.message || 'No user returned');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session. Please log in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // User-authenticated client for encrypt/decrypt RPC (requires auth.uid())
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    });

    if (!checkRateLimit(user.id)) {
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

      const { data: encryptedToken, error: encryptError } = await supabaseUserClient.rpc('encrypt_credential', {
        plaintext: token,
        user_id: user.id
      });

      if (encryptError || !encryptedToken) {
        console.error('Error encrypting token:', encryptError);
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
        .eq('user_id', user.id)
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
            user_id: user.id,
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
        .eq('user_id', user.id)
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

      const { data: decryptedToken, error: decryptError } = await supabaseUserClient.rpc('decrypt_credential', {
        ciphertext: encryptedToken,
        user_id: user.id
      });

      if (decryptError || !decryptedToken) {
        console.warn('Unable to decrypt stored Home Assistant token, returning metadata only', decryptError);
        return new Response(
          JSON.stringify({
            success: true,
            config: buildConfig('', metadata, false),
            requiresTokenReset: true,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
        .eq('user_id', user.id)
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
