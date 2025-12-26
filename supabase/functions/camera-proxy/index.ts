import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const getCorsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma, accept',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Expose-Headers': 'content-type, content-length'
});

const rateLimits = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const limit = rateLimits.get(userId);
  if (!limit || now > limit.resetTime) {
    rateLimits.set(userId, { count: 1, resetTime: now + 60000 });
    return true;
  }
  if (limit.count >= 120) return false;
  limit.count++;
  return true;
};

const validateCameraURL = async (url: string): Promise<boolean> => {
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) return false;

    const hostname = urlObj.hostname.toLowerCase();
    const port = urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80');
    
    // Allow common camera ports
    if (!['80', '443', '8000', '8080', '554', '8554'].includes(port)) {
      console.log(`Camera proxy: Rejecting port ${port}`);
      return false;
    }
    
    if (['localhost', '127.0.0.1', '::1'].includes(hostname)) {
      console.log('Camera proxy: Rejecting localhost');
      return false;
    }
    
    // Allow dynamic DNS domains
    if (hostname.includes('.duckdns.org') || hostname.includes('.no-ip.') || hostname.includes('.ddns.net')) {
      console.log(`Camera proxy: Allowing dynamic DNS domain: ${hostname}`);
      return true;
    }
    
    return true;
  } catch (err) {
    console.error('Camera proxy: URL validation error:', err);
    return false;
  }
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    console.log('Camera proxy: Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');
    const authHeader = req.headers.get('authorization');
    
    console.log(`Camera proxy: ${req.method} request for ${targetUrl}`);
    
    const jwt = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    
    if (!jwt) {
      console.log('Camera proxy: No auth token provided');
      return new Response(JSON.stringify({ error: 'Authentication required' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!, 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      console.log('Camera proxy: Invalid token', authError?.message);
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`Camera proxy: Authenticated user ${user.id}`);

    if (!checkRateLimit(user.id)) {
      console.log('Camera proxy: Rate limit exceeded');
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { 
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    if (!targetUrl || !(await validateCameraURL(targetUrl))) {
      console.log('Camera proxy: Invalid URL:', targetUrl);
      return new Response(JSON.stringify({ error: 'Invalid URL' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`Camera proxy: Proxying to ${targetUrl}`);

    // NO hard timeout - the stream will stay open as long as data flows
    // Client-side stall detection handles frozen streams
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'User-Agent': 'CameraProxy/1.0',
        'Accept': 'multipart/x-mixed-replace, image/jpeg, */*',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
      keepalive: true
    });

    if (!response.ok) {
      console.log(`Camera proxy: Upstream error ${response.status}`);
      throw new Error(`HTTP ${response.status}`);
    }

    console.log(`Camera proxy: Connected successfully, status ${response.status}`);

    const responseHeaders = new Headers(corsHeaders);
    const contentType = response.headers.get('content-type');
    if (contentType) responseHeaders.set('content-type', contentType);
    responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    responseHeaders.set('X-Accel-Buffering', 'no');

    return new Response(response.body, { 
      status: response.status, 
      headers: responseHeaders 
    });

  } catch (error) {
    console.error('Camera proxy error:', error);
    return new Response(JSON.stringify({ error: 'Connection failed' }), { 
      status: 502, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
    });
  }
});