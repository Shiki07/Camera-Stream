import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};

type ProxyFetchError = Error & {
  code?: string;
  cause?: { code?: string; message?: string };
};

// ---- Server-side HA token decryption (mirrors ha-token-manager) -----------

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const getTokenEncryptionSecret = (): string => {
  const secret =
    Deno.env.get('TOKEN_ENCRYPTION_SECRET') ??
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) throw new Error('Missing token encryption secret');
  return secret;
};

const fromBase64 = (value: string): ArrayBuffer => {
  const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

const deriveEncryptionKey = async (userId: string): Promise<CryptoKey> => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(getTokenEncryptionSecret()),
    'PBKDF2',
    false,
    ['deriveKey'],
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
    ['decrypt'],
  );
};

const decryptStoredToken = async (
  stored: string,
  userId: string,
): Promise<string | null> => {
  // ha-token-manager stores "<encryptedToken>|||<metadataJson>"
  const [encrypted] = stored.split('|||');
  if (!encrypted) return null;
  const [ivB64, ctB64] = encrypted.split(':');
  if (!ivB64 || !ctB64) return null;
  try {
    const key = await deriveEncryptionKey(userId);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(ivB64) },
      key,
      fromBase64(ctB64),
    );
    return textDecoder.decode(decrypted);
  } catch (err) {
    console.warn('ha-camera-proxy: token decrypt failed', err);
    return null;
  }
};



const validateHomeAssistantUrl = (urlString: string): { valid: boolean; error?: string } => {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    const privatePatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
      /^0\./,
      /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./,
    ];

    const blockedHostnames = [
      'metadata.google.internal',
      'metadata.gke.io',
      'kubernetes.default',
      'kubernetes.default.svc',
    ];

    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);

    if (ipMatch) {
      for (const pattern of privatePatterns) {
        if (pattern.test(hostname)) {
          return { valid: false, error: 'Private IP addresses are not allowed' };
        }
      }
    }

    if (hostname === 'localhost' || hostname === '::1' || hostname.endsWith('.localhost')) {
      return { valid: false, error: 'Localhost is not allowed' };
    }

    if (blockedHostnames.includes(hostname)) {
      return { valid: false, error: 'Blocked hostname' };
    }

    if (hostname.startsWith('[')) {
      const ipv6Prefixes = ['fc', 'fd', 'fe80:', '::1', 'ff'];
      const cleanHostname = hostname.replace(/[\[\]]/g, '').toLowerCase();
      for (const prefix of ipv6Prefixes) {
        if (cleanHostname.startsWith(prefix)) {
          return { valid: false, error: 'Private IPv6 addresses are not allowed' };
        }
      }
    }

    const localDomainPatterns = ['.local', '.home', '.lan', '.internal'];
    const isLocalDomain = localDomainPatterns.some((p) => hostname.endsWith(p));

    if (url.protocol !== 'https:' && !isLocalDomain) {
      return { valid: false, error: 'HTTPS required for non-local domains' };
    }

    const pathname = url.pathname.toLowerCase();
    if (!pathname.includes('/api/camera_proxy')) {
      return { valid: false, error: 'Invalid camera endpoint path' };
    }

    if (pathname.includes('..') || pathname.includes('//')) {
      return { valid: false, error: 'Path traversal detected' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
};

const buildUpstreamErrorResponse = (error: unknown, upstreamName: string) => {
  const err = error as ProxyFetchError;
  const code = err.code || err.cause?.code || '';
  // Only inspect the cause message — err.message often contains the full URL
  // (e.g. "alepa.duckdns.org") which would false-match substrings like "dns".
  const lower = `${err.cause?.message || ''}`.toLowerCase();

  if (err.name === 'AbortError') {
    return new Response(
      JSON.stringify({ error: 'Stream timeout - please reconnect', code: 'STREAM_TIMEOUT' }),
      {
        status: 408,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  if (code === 'ETIMEDOUT' || lower.includes('timed out') || lower.includes('timeout')) {
    return new Response(
      JSON.stringify({ error: `${upstreamName} did not respond in time (port forwarding or device offline?)`, code: 'UPSTREAM_TIMEOUT' }),
      {
        status: 504,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  if (code === 'EHOSTUNREACH' || lower.includes('no route to host')) {
    return new Response(
      JSON.stringify({ error: `${upstreamName} is unreachable`, code: 'UPSTREAM_UNREACHABLE' }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  if (code === 'ECONNREFUSED' || lower.includes('connection refused')) {
    return new Response(
      JSON.stringify({ error: `${upstreamName} refused the connection`, code: 'UPSTREAM_REFUSED' }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  if (code === 'ENOTFOUND' || lower.includes('name or service not known') || lower.includes('dns error') || lower.includes('failed to lookup')) {
    return new Response(
      JSON.stringify({ error: `${upstreamName} hostname could not be resolved`, code: 'UPSTREAM_DNS_FAILED' }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(
    JSON.stringify({ error: `${upstreamName} request failed`, code: 'UPSTREAM_REQUEST_FAILED' }),
    {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.warn('HA camera proxy: Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid authorization' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    let userId: string | null = null;
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      console.warn('HA camera proxy: Invalid JWT token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    userId = userData.user.id;

    console.log('HA camera proxy: Authenticated user request', userId);

    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      console.warn('Missing url parameter');
      return new Response(
        JSON.stringify({ error: 'Missing url parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const decodedUrl = decodeURIComponent(targetUrl);
    const validation = validateHomeAssistantUrl(decodedUrl);

    if (!validation.valid) {
      console.warn('URL validation failed:', validation.error);
      return new Response(
        JSON.stringify({ error: validation.error || 'Invalid camera URL' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Look up the user's HA token from user_tokens (service-role bypasses RLS)
    // — this keeps the long-lived token out of URLs, browser history, and logs.
    const admin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: tokenRow, error: tokenErr } = await admin
      .from('user_tokens')
      .select('encrypted_token')
      .eq('user_id', userId)
      .eq('token_type', 'homeassistant')
      .maybeSingle();

    if (tokenErr || !tokenRow?.encrypted_token) {
      console.warn('HA camera proxy: no HA token found for user');
      return new Response(
        JSON.stringify({ error: 'No Home Assistant token configured', code: 'HA_TOKEN_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const haToken = await decryptStoredToken(tokenRow.encrypted_token, userId);
    if (!haToken) {
      return new Response(
        JSON.stringify({ error: 'Stored Home Assistant token could not be decrypted; please save it again', code: 'HA_TOKEN_DECRYPT_FAILED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Proxying Home Assistant camera stream');

    const controller = new AbortController();
    const streamTimeoutMs = 300000;
    const timeoutId = setTimeout(() => {
      console.log('HA camera proxy: Stream timeout after 5 minutes, aborting');
      controller.abort();
    }, streamTimeoutMs);

    try {
      const response = await fetch(decodedUrl, {
        headers: {
          'Authorization': `Bearer ${haToken}`,
          'Accept': 'multipart/x-mixed-replace, image/jpeg, */*',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=300, max=1000',
        },
        signal: controller.signal,
        keepalive: true,
      });


      if (!response.ok) {
        clearTimeout(timeoutId);
        console.error('Home Assistant returned error:', response.status);
        return new Response(
          JSON.stringify({ error: `Home Assistant error: ${response.status}`, code: 'UPSTREAM_HTTP_ERROR' }),
          {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      console.log('HA camera proxy: Content-Type:', contentType);

      const responseHeaders: Record<string, string> = {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      };

      if (contentType.includes('multipart')) {
        console.log('HA camera proxy: Streaming multipart MJPEG response');
        return new Response(response.body, {
          status: 200,
          headers: responseHeaders,
        });
      }

      clearTimeout(timeoutId);
      const imageData = await response.arrayBuffer();

      return new Response(imageData, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
        },
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      console.error('HA camera proxy upstream error:', fetchError);
      return buildUpstreamErrorResponse(fetchError, 'Home Assistant');
    }
  } catch (error) {
    console.error('HA camera proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal proxy error', code: 'PROXY_INTERNAL_ERROR' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
