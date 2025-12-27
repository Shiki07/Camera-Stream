import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting store
const rateLimits = new Map<string, { count: number; resetTime: number }>();

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

// Validate Home Assistant URL format
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

// Validate Home Assistant token format (long-lived access tokens are typically 180+ chars)
const validateHAToken = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  // HA tokens are JWT-like, at least 100 characters
  return token.length >= 100 && token.length <= 500 && /^[A-Za-z0-9._-]+$/.test(token);
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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody = await req.json();
    const { action } = requestBody;

    if (action === 'save') {
      const { token, url, webhookId, enabled } = requestBody;
      
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

      // Encrypt the token
      const { data: encryptedToken, error: encryptError } = await supabase.rpc('encrypt_credential', {
        plaintext: token,
        user_id: user.id
      });

      if (encryptError || !encryptedToken) {
        console.error('Error encrypting token');
        return new Response(
          JSON.stringify({ error: 'Failed to encrypt token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build metadata object (non-sensitive data)
      const metadata = JSON.stringify({
        url: url || '',
        webhookId: webhookId || '',
        enabled: enabled ?? false
      });

      // Check for existing token
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
        console.error('Error saving token');
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

    } else if (action === 'load') {
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

      // Parse the combined encrypted token and metadata
      const parts = tokenRecord.encrypted_token.split('|||');
      const encryptedToken = parts[0];
      const metadata = parts[1] ? JSON.parse(parts[1]) : {};

      // Decrypt the token
      const { data: decryptedToken, error: decryptError } = await supabase.rpc('decrypt_credential', {
        ciphertext: encryptedToken,
        user_id: user.id
      });

      if (decryptError) {
        console.error('Error decrypting token');
        return new Response(
          JSON.stringify({ error: 'Failed to decrypt configuration' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          config: {
            token: decryptedToken || '',
            url: metadata.url || '',
            webhookId: metadata.webhookId || '',
            enabled: metadata.enabled ?? false
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'delete') {
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

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('HA token manager error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
