
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting store (in production, use Redis or similar)
const rateLimits = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const limit = rateLimits.get(userId);
  
  if (!limit || now > limit.resetTime) {
    rateLimits.set(userId, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }
  
  if (limit.count >= 5) { // Reduced from 10 to 5 for security
    return false;
  }
  
  limit.count++;
  return true;
};

// Comprehensive input validation
const validateDuckDNSToken = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  
  // DuckDNS tokens are UUIDs - strict validation
  const tokenRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return tokenRegex.test(token) && token.length === 36;
};

const textEncoder = new TextEncoder();

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Invalid authorization header format');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Service role client for auth verification and DB writes
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // User-authenticated client for encrypt_credential (requires auth.uid())
    const jwt = authHeader.replace('Bearer ', '');
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    });

    let userId: string | null = null;

    // Try getUser first, fallback to manual JWT decode
    try {
      const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
      if (!authErr && user) {
        userId = user.id;
      }
    } catch (e) {
      console.log('save-duckdns-token: getUser failed, trying JWT decode fallback');
    }

    if (!userId) {
      try {
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        if (payload.sub && payload.role === 'authenticated') {
          userId = payload.sub;
        }
      } catch (e) {
        console.warn('save-duckdns-token: JWT decode fallback failed');
      }
    }

    if (!userId) {
      console.warn('Invalid or expired token');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check rate limit
    if (!checkRateLimit(userId)) {
      console.warn(`Rate limit exceeded for user: ${userId}`);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      console.warn('Invalid JSON in request body');
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { token } = requestBody;

    if (!validateDuckDNSToken(token)) {
      console.warn('Invalid DuckDNS token format');
      return new Response(
        JSON.stringify({ error: 'Invalid DuckDNS token format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let encryptedToken: string;
    try {
      encryptedToken = await encryptToken(token, userId);
    } catch (error) {
      console.error('Error encrypting token:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to encrypt token' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // First try to find existing token
    const { data: existingToken, error: fetchError } = await supabaseAdmin
      .from('user_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('token_type', 'duckdns')
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking existing token:', fetchError.message);
    }

    let upsertError;
    if (existingToken) {
      // Update existing record
      const { error } = await supabaseAdmin
        .from('user_tokens')
        .update({
          encrypted_token: encryptedToken,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingToken.id);
      upsertError = error;
    } else {
      // Insert new record
      const { error } = await supabaseAdmin
        .from('user_tokens')
        .insert({
          user_id: userId,
          token_type: 'duckdns',
          encrypted_token: encryptedToken,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      upsertError = error;
    }

    if (upsertError) {
      console.error('Error saving encrypted token:', upsertError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to save token', details: upsertError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('DuckDNS token encrypted and saved successfully');
    return new Response(
      JSON.stringify({ success: true, message: 'Token saved securely' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Save token error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
