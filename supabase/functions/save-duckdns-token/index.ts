
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the JWT token
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
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
    if (!checkRateLimit(user.id)) {
      console.warn(`Rate limit exceeded for user: ${user.id}`);
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

    // Encrypt the token using the database function
    const { data: encryptedToken, error: encryptError } = await supabase.rpc('encrypt_credential', {
      plaintext: token,
      user_id: user.id
    });

    if (encryptError || !encryptedToken) {
      console.error('Error encrypting token:', encryptError);
      return new Response(
        JSON.stringify({ error: 'Failed to encrypt token' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // First try to find existing token
    const { data: existingToken, error: fetchError } = await supabase
      .from('user_tokens')
      .select('id')
      .eq('user_id', user.id)
      .eq('token_type', 'duckdns')
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking existing token:', fetchError.message);
    }

    let upsertError;
    if (existingToken) {
      // Update existing record
      const { error } = await supabase
        .from('user_tokens')
        .update({
          encrypted_token: encryptedToken,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingToken.id);
      upsertError = error;
    } else {
      // Insert new record
      const { error } = await supabase
        .from('user_tokens')
        .insert({
          user_id: user.id,
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
