import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://camerastream.live',
  'https://www.camerastream.live',
  'https://camera-stream.lovable.app',
  'https://id-preview--5d70728e-9968-4184-9131-d5556d40e3e3.lovable.app',
]);

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.has(origin) || /\.lovable\.app$/.test((() => { try { return new URL(origin).hostname; } catch { return ''; } })())
    ? origin
    : 'null';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma, accept',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Vary': 'Origin',
    'Access-Control-Expose-Headers': 'content-type, content-length'
  };
};

const rateLimits = new Map<string, { count: number; resetTime: number }>();

type ProxyFetchError = Error & {
  code?: string;
  cause?: { code?: string; message?: string };
};

const checkRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const limit = rateLimits.get(userId);
  if (!limit || now > limit.resetTime) {
    rateLimits.set(userId, { count: 1, resetTime: now + 60000 });
    return true;
  }
  if (limit.count >= 30) return false;
  limit.count++;
  return true;
};

const validateCameraURL = async (url: string): Promise<boolean> => {
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) return false;

    const hostname = urlObj.hostname.toLowerCase();
    const port = urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80');

    if (!['80', '443', '8000', '8080', '554', '8554'].includes(port)) {
      console.log(`Camera proxy: Rejecting port ${port}`);
      return false;
    }

    if (['localhost', '127.0.0.1', '::1'].includes(hostname) ||
        hostname.endsWith('.localhost') || hostname.endsWith('.internal') ||
        ['metadata.google.internal', 'metadata.gke.io', 'kubernetes.default', 'kubernetes.default.svc'].includes(hostname)) {
      console.log('Camera proxy: Rejecting localhost/internal hostname');
      return false;
    }

    // Block RFC-1918 private ranges, loopback, link-local, and cloud metadata IPs
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, aStr, bStr] = ipv4Match;
      const a = Number(aStr), b = Number(bStr);
      if (a === 10 || a === 127 || a === 0 ||
          (a === 172 && b >= 16 && b <= 31) ||
          (a === 192 && b === 168) ||
          (a === 169 && b === 254) ||
          (a === 100 && b >= 64 && b <= 127)) {
        console.log(`Camera proxy: Rejecting private/reserved IPv4 ${hostname}`);
        return false;
      }
    }
    // Block IPv6 loopback, link-local (fe80::/10), and unique-local (fc00::/7)
    if (hostname.includes(':')) {
      const h = hostname.replace(/^\[|\]$/g, '').toLowerCase();
      if (h === '::1' || h.startsWith('fe80:') || /^f[cd][0-9a-f]{2}:/.test(h)) {
        console.log(`Camera proxy: Rejecting private IPv6 ${hostname}`);
        return false;
      }
    }

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

const buildUpstreamErrorResponse = (req: Request, error: unknown, upstreamName: string) => {
  const err = error as ProxyFetchError;
  const code = err.code || err.cause?.code || '';
  // Only inspect the cause message — err.message often contains the full URL
  // (e.g. "alepa.duckdns.org") which would false-match substrings like "dns".
  const lower = `${err.cause?.message || ''}`.toLowerCase();

  if (err.name === 'AbortError') {
    return new Response(JSON.stringify({ error: 'Stream timeout - please reconnect', code: 'STREAM_TIMEOUT' }), {
      status: 408,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }

  if (code === 'ETIMEDOUT' || lower.includes('timed out') || lower.includes('timeout')) {
    return new Response(JSON.stringify({ error: `${upstreamName} did not respond in time (port forwarding or device offline?)`, code: 'UPSTREAM_TIMEOUT' }), {
      status: 504,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }

  if (code === 'EHOSTUNREACH' || lower.includes('no route to host')) {
    return new Response(JSON.stringify({ error: `${upstreamName} is unreachable`, code: 'UPSTREAM_UNREACHABLE' }), {
      status: 502,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }

  if (code === 'ECONNREFUSED' || lower.includes('connection refused')) {
    return new Response(JSON.stringify({ error: `${upstreamName} refused the connection`, code: 'UPSTREAM_REFUSED' }), {
      status: 502,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }

  if (code === 'ENOTFOUND' || lower.includes('name or service not known') || lower.includes('dns error') || lower.includes('failed to lookup')) {
    return new Response(JSON.stringify({ error: `${upstreamName} hostname could not be resolved`, code: 'UPSTREAM_DNS_FAILED' }), {
      status: 502,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ error: `${upstreamName} request failed`, code: 'UPSTREAM_REQUEST_FAILED' }), {
    status: 502,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
  });
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

    console.log(`Camera proxy: ${req.method} request received`);

    const jwt = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;

    if (!jwt) {
      console.log('Camera proxy: No auth token provided');
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    let userId: string | null = null;
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      console.log('Camera proxy: Invalid token');
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    userId = user.id;


    if (!checkRateLimit(userId)) {
      console.log('Camera proxy: Rate limit exceeded');
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!targetUrl || !(await validateCameraURL(targetUrl))) {
      console.log('Camera proxy: Invalid or disallowed URL');
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Camera proxy: Proxying stream');

    try {
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
        return new Response(JSON.stringify({ error: `Camera source error: ${response.status}`, code: 'UPSTREAM_HTTP_ERROR' }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
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
    } catch (fetchError) {
      console.error('Camera proxy upstream error:', fetchError);
      return buildUpstreamErrorResponse(req, fetchError, 'Camera source');
    }
  } catch (error) {
    console.error('Camera proxy error:', error);
    return new Response(JSON.stringify({ error: 'Internal proxy error', code: 'PROXY_INTERNAL_ERROR' }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }
});
