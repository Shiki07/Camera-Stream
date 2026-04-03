
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

// Enhanced input validation
const validateIP = (ip: string): boolean => {
  if (!ip || typeof ip !== 'string') return false;
  
  // Strict IPv4 validation
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(ip)) return false;
  
  // Block private IP ranges for security
  const parts = ip.split('.').map(Number);
  
  // Block localhost
  if (parts[0] === 127) return false;
  
  // Block private networks
  if (parts[0] === 10) return false;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
  if (parts[0] === 192 && parts[1] === 168) return false;
  
  // Block link-local
  if (parts[0] === 169 && parts[1] === 254) return false;
  
  return true;
};

const validateDomain = (domain: string): boolean => {
  if (!domain || typeof domain !== 'string') return false;
  
  const cleanDomain = domain.replace('.duckdns.org', '').replace(/^https?:\/\//, '');
  
  // Enhanced domain validation
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?$/;
  
  return domainRegex.test(cleanDomain) && 
         cleanDomain.length >= 3 && 
         cleanDomain.length <= 63 &&
         !cleanDomain.includes('..') &&
         !cleanDomain.startsWith('-') &&
         !cleanDomain.endsWith('-');
};

const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>'"&]/g, '');
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const getTokenEncryptionSecret = (): string => {
  const secret = Deno.env.get('TOKEN_ENCRYPTION_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) {
    throw new Error('Missing token encryption secret');
  }

  return secret;
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
    console.warn('Error decrypting token:', error);
    return null;
  }
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
    let userId: string | null = null;

    // Try getUser first, fallback to manual JWT decode
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
      if (!authError && user) {
        userId = user.id;
      }
    } catch (e) {
      console.log('DuckDNS: getUser failed, trying JWT decode fallback');
    }

    if (!userId) {
      try {
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        if (payload.sub && payload.role === 'authenticated') {
          userId = payload.sub;
          console.log('DuckDNS: Authenticated via JWT decode fallback');
        }
      } catch (e) {
        console.warn('DuckDNS: JWT decode fallback failed');
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

    // Create a user-like object for compatibility
    const user = { id: userId };

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      console.warn('Rate limit exceeded for user');
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

    const { domain, ip } = requestBody;

    if (!validateIP(ip)) {
      console.warn('Invalid IP address format or private IP blocked');
      return new Response(
        JSON.stringify({ error: 'Invalid IP address format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!validateDomain(domain)) {
      console.warn('Invalid domain format');
      return new Response(
        JSON.stringify({ error: 'Invalid domain format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Sanitize inputs
    const cleanDomain = sanitizeInput(domain.replace('.duckdns.org', '').replace(/^https?:\/\//, ''));
    const cleanIP = sanitizeInput(ip);

    // Get the encrypted token from user_tokens table
    const { data: tokenRecord, error: tokenFetchError } = await supabase
      .from('user_tokens')
      .select('encrypted_token')
      .eq('user_id', user.id)
      .eq('token_type', 'duckdns')
      .single();

    if (tokenFetchError || !tokenRecord?.encrypted_token) {
      console.warn('DuckDNS token not found for user');
      return new Response(
        JSON.stringify({ error: 'DuckDNS token not configured. Please save your token first.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const decryptedToken = await decryptToken(tokenRecord.encrypted_token, user.id);

    if (!decryptedToken) {
      console.error('Error decrypting token: token could not be decrypted');
      return new Response(
        JSON.stringify({ error: 'Failed to decrypt token. Please re-save your DuckDNS token.' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Make request to DuckDNS with retry logic for DNS failures
    const duckdnsUrl = `https://www.duckdns.org/update?domains=${encodeURIComponent(cleanDomain)}&token=${encodeURIComponent(decryptedToken)}&ip=${encodeURIComponent(cleanIP)}`;
    
    console.log('Updating DuckDNS record');
    
    // Add retry logic for DNS failures
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount <= maxRetries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(duckdnsUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'CameraStream/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.text();
        
        console.log(`DuckDNS response: ${result}`);
        
        if (result.trim() === 'OK') {
          return new Response(
            JSON.stringify({ success: true, message: 'DuckDNS updated successfully' }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        } else {
          return new Response(
            JSON.stringify({ error: 'DuckDNS update failed' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        const err = fetchError as Error & { name?: string };
        
        if (err.name === 'AbortError') {
          console.error('DuckDNS request timeout');
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying DuckDNS request (${retryCount}/${maxRetries}) after timeout...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          }
          return new Response(
            JSON.stringify({ error: 'Request timeout after retries' }),
            { 
              status: 408, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        // Check if it's a DNS-related error
        const errorString = String(err);
        if ((errorString.includes('dns error') || 
             errorString.includes('failed to lookup') ||
             errorString.includes('Name or service not known') ||
             errorString.includes('Temporary failure in name resolution')) && 
            retryCount < maxRetries) {
          retryCount++;
          console.log(`DNS error detected, retrying DuckDNS request (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // Progressive delay
          continue;
        }
        
        console.error('DuckDNS fetch error:', err);
        return new Response(
          JSON.stringify({ error: 'Failed to update DuckDNS', details: errorString }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    // Fallback return for edge case
    return new Response(
      JSON.stringify({ error: 'Unexpected end of retry loop' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('DuckDNS update error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
