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

// Valid token types that can be stored
const VALID_TOKEN_TYPES = ['homeassistant', 'cloud_storage', 'duckdns'] as const;
type TokenType = typeof VALID_TOKEN_TYPES[number];

const isValidTokenType = (type: string): type is TokenType => {
  return VALID_TOKEN_TYPES.includes(type as TokenType);
};

// Validate Home Assistant URL format
const validateHomeAssistantUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Validate cloud storage provider
const VALID_PROVIDERS = ['s3', 'google-drive', 'dropbox', 'onedrive', 'none'] as const;
const isValidProvider = (provider: string): boolean => {
  return VALID_PROVIDERS.includes(provider as typeof VALID_PROVIDERS[number]);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Missing or invalid authorization header');
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
      console.warn('Invalid or expired token');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!checkRateLimit(user.id)) {
      console.warn(`Rate limit exceeded for user: ${user.id}`);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      console.warn('Invalid JSON in request body');
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, token_type, data } = requestBody;

    // Validate token type
    if (!isValidTokenType(token_type)) {
      console.warn(`Invalid token type: ${token_type}`);
      return new Response(
        JSON.stringify({ error: 'Invalid token type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different actions
    if (action === 'save') {
      return await handleSave(supabase, user.id, token_type, data);
    } else if (action === 'load') {
      return await handleLoad(supabase, user.id, token_type);
    } else if (action === 'delete') {
      return await handleDelete(supabase, user.id, token_type);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('User token error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleSave(supabase: any, userId: string, tokenType: TokenType, data: any): Promise<Response> {
  try {
    // Validate and prepare data based on token type
    let tokenData: string;
    
    if (tokenType === 'homeassistant') {
      if (!data.url || !validateHomeAssistantUrl(data.url)) {
        return new Response(
          JSON.stringify({ error: 'Invalid Home Assistant URL' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Store all HA config as encrypted JSON
      tokenData = JSON.stringify({
        url: data.url,
        token: data.token || '',
        webhookId: data.webhookId || '',
        enabled: data.enabled || false,
      });
    } else if (tokenType === 'cloud_storage') {
      if (!data.provider || !isValidProvider(data.provider)) {
        return new Response(
          JSON.stringify({ error: 'Invalid cloud storage provider' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Store cloud config as encrypted JSON
      tokenData = JSON.stringify({
        provider: data.provider,
        authMethod: data.authMethod || 'api-key',
        credentials: data.credentials || {},
      });
    } else {
      tokenData = data.token || '';
    }

    if (!tokenData) {
      return new Response(
        JSON.stringify({ error: 'No data to save' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Encrypt the token data
    const { data: encryptedToken, error: encryptError } = await supabase.rpc('encrypt_credential', {
      plaintext: tokenData,
      user_id: userId
    });

    if (encryptError || !encryptedToken) {
      console.error('Error encrypting token:', encryptError);
      return new Response(
        JSON.stringify({ error: 'Failed to encrypt data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing token
    const { data: existingToken, error: fetchError } = await supabase
      .from('user_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('token_type', tokenType)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking existing token:', fetchError.message);
    }

    let upsertError;
    if (existingToken) {
      const { error } = await supabase
        .from('user_tokens')
        .update({
          encrypted_token: encryptedToken,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingToken.id);
      upsertError = error;
    } else {
      const { error } = await supabase
        .from('user_tokens')
        .insert({
          user_id: userId,
          token_type: tokenType,
          encrypted_token: encryptedToken,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      upsertError = error;
    }

    if (upsertError) {
      console.error('Error saving token:', upsertError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to save data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Token saved for user ${userId}, type: ${tokenType}`);
    return new Response(
      JSON.stringify({ success: true, message: 'Data saved securely' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Save error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to save data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleLoad(supabase: any, userId: string, tokenType: TokenType): Promise<Response> {
  try {
    // Fetch encrypted token
    const { data: tokenRecord, error: fetchError } = await supabase
      .from('user_tokens')
      .select('encrypted_token')
      .eq('user_id', userId)
      .eq('token_type', tokenType)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching token:', fetchError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to load data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokenRecord) {
      return new Response(
        JSON.stringify({ success: true, data: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt the token
    const { data: decryptedToken, error: decryptError } = await supabase.rpc('decrypt_credential', {
      ciphertext: tokenRecord.encrypted_token,
      user_id: userId
    });

    if (decryptError) {
      console.error('Error decrypting token:', decryptError);
      return new Response(
        JSON.stringify({ error: 'Failed to decrypt data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON for complex token types
    let parsedData;
    if (tokenType === 'homeassistant' || tokenType === 'cloud_storage') {
      try {
        parsedData = JSON.parse(decryptedToken);
      } catch {
        parsedData = decryptedToken;
      }
    } else {
      parsedData = decryptedToken;
    }

    console.log(`Token loaded for user ${userId}, type: ${tokenType}`);
    return new Response(
      JSON.stringify({ success: true, data: parsedData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Load error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to load data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleDelete(supabase: any, userId: string, tokenType: TokenType): Promise<Response> {
  try {
    const { error: deleteError } = await supabase
      .from('user_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token_type', tokenType);

    if (deleteError) {
      console.error('Error deleting token:', deleteError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to delete data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Token deleted for user ${userId}, type: ${tokenType}`);
    return new Response(
      JSON.stringify({ success: true, message: 'Data deleted' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Delete error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
