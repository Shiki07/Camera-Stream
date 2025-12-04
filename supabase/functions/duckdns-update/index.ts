
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting store (in production, use Redis or similar)
const rateLimits = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const limit = rateLimits.get(identifier);
  
  if (!limit || now > limit.resetTime) {
    rateLimits.set(identifier, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }
  
  if (limit.count >= 10) {
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

// DuckDNS tokens are UUIDs
const validateToken = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  const tokenRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return tokenRegex.test(token) && token.length === 36;
};

const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>'"&]/g, '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { domain, ip, token } = requestBody;

    // Validate token
    if (!validateToken(token)) {
      console.warn('Invalid DuckDNS token format');
      return new Response(
        JSON.stringify({ error: 'Invalid DuckDNS token format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Rate limit by domain to prevent abuse
    if (!checkRateLimit(domain)) {
      console.warn(`Rate limit exceeded for domain: ${domain}`);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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
    const cleanToken = sanitizeInput(token);
    
    // Make request to DuckDNS with retry logic for DNS failures
    const duckdnsUrl = `https://www.duckdns.org/update?domains=${encodeURIComponent(cleanDomain)}&token=${encodeURIComponent(cleanToken)}&ip=${encodeURIComponent(cleanIP)}`;
    
    console.log(`Updating DuckDNS - Domain: ${cleanDomain}, IP: ${cleanIP}`);
    
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
            'User-Agent': 'CamAlert/1.0'
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
            JSON.stringify({ error: 'DuckDNS update failed - check your token and domain' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        
        const err = fetchError as Error;
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
        const errorString = String(fetchError);
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
        
        console.error('DuckDNS fetch error:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Failed to update DuckDNS', details: errorString }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    // Should not reach here, but TypeScript requires a return
    return new Response(
      JSON.stringify({ error: 'Unexpected error' }),
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
