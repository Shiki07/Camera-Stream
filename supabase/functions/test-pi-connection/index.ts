import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestRequest {
  pi_endpoint: string;
}

// Validate URL to prevent SSRF attacks
function validatePiEndpointUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }
    
    // Block internal IP ranges (SSRF prevention)
    const hostname = url.hostname.toLowerCase();
    
    // Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return { valid: false, error: 'Localhost addresses are not allowed' };
    }
    
    // Block cloud metadata endpoints
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      return { valid: false, error: 'Cloud metadata endpoints are not allowed' };
    }
    
    // Block private IP ranges
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Pattern);
    if (match) {
      const [, a, b, c, d] = match.map(Number);
      
      // 10.x.x.x
      if (a === 10) {
        return { valid: false, error: 'Private IP addresses (10.x.x.x) are not allowed' };
      }
      
      // 172.16.x.x - 172.31.x.x
      if (a === 172 && b >= 16 && b <= 31) {
        return { valid: false, error: 'Private IP addresses (172.16-31.x.x) are not allowed' };
      }
      
      // 192.168.x.x
      if (a === 192 && b === 168) {
        return { valid: false, error: 'Private IP addresses (192.168.x.x) are not allowed' };
      }
      
      // Link-local 169.254.x.x
      if (a === 169 && b === 254) {
        return { valid: false, error: 'Link-local addresses are not allowed' };
      }
    }
    
    // Must have valid port for Pi service (3002 expected, but allow flexibility)
    const port = url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80);
    if (port < 1 || port > 65535) {
      return { valid: false, error: 'Invalid port number' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify the JWT token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired authentication token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Authenticated user ${user.id} testing Pi connection`);

    const { pi_endpoint }: TestRequest = await req.json();

    if (!pi_endpoint) {
      return new Response(
        JSON.stringify({ error: 'Pi endpoint is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate URL to prevent SSRF attacks
    const urlValidation = validatePiEndpointUrl(pi_endpoint);
    if (!urlValidation.valid) {
      console.log(`URL validation failed for ${pi_endpoint}: ${urlValidation.error}`);
      return new Response(
        JSON.stringify({ error: urlValidation.error }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Normalize the endpoint URL
    const normalizedEndpoint = pi_endpoint.endsWith('/') 
      ? pi_endpoint.slice(0, -1) 
      : pi_endpoint;

    console.log(`Testing Pi connection to: ${normalizedEndpoint}/health`);

    // Test the Pi health endpoint from the cloud (health endpoint doesn't require auth)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

    try {
      const response = await fetch(`${normalizedEndpoint}/health`, {
        method: 'GET',
        headers: {
          'User-Agent': 'CameraStream-Cloud-Test/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `Pi service returned ${response.status}: ${response.statusText}`,
            reachable: true, // It's reachable but returned an error
            statusCode: response.status
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const healthData = await response.json();
      
      return new Response(
        JSON.stringify({ 
          success: true,
          reachable: true,
          healthData,
          authEnabled: healthData.authEnabled ?? false,
          message: 'Pi service is reachable and responding correctly'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      let errorMessage = 'Unknown connection error';
      let reachable = false;

      if (fetchError.name === 'AbortError') {
        errorMessage = 'Connection timeout (12 seconds) - Port 3002 may not be forwarded or Pi service not running';
      } else if (fetchError.message.includes('fetch')) {
        errorMessage = 'Cannot reach Pi service on port 3002 - Verify: 1) Port 3002 is forwarded in router, 2) Pi service is running (npm start in pi-service folder), 3) Firewall allows port 3002';
      } else {
        errorMessage = fetchError.message || 'Connection failed';
      }

      return new Response(
        JSON.stringify({ 
          success: false,
          reachable,
          error: errorMessage,
          details: fetchError.message
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error: any) {
    console.error("Error in Pi connection test:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Server error during connection test'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
