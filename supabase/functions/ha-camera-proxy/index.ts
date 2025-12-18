import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validate that a URL is a legitimate Home Assistant camera URL
// Prevents SSRF attacks by blocking internal/private networks
const validateHomeAssistantUrl = (urlString: string): { valid: boolean; error?: string } => {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Block private IP ranges (RFC 1918 + loopback + link-local)
    const privatePatterns = [
      /^10\./,                          // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
      /^192\.168\./,                    // 192.168.0.0/16
      /^127\./,                         // 127.0.0.0/8 (loopback)
      /^169\.254\./,                    // 169.254.0.0/16 (link-local, AWS metadata)
      /^0\./,                           // 0.0.0.0/8
      /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // 100.64.0.0/10 (CGN)
    ];

    // Block cloud metadata endpoints
    const blockedHostnames = [
      'metadata.google.internal',
      'metadata.gke.io',
      'kubernetes.default',
      'kubernetes.default.svc',
    ];

    // Check for IP-based hostname
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    
    if (ipMatch) {
      // It's an IP address - check against private ranges
      for (const pattern of privatePatterns) {
        if (pattern.test(hostname)) {
          return { valid: false, error: 'Private IP addresses are not allowed' };
        }
      }
    }

    // Block localhost variants
    if (hostname === 'localhost' || hostname === '::1' || hostname.endsWith('.localhost')) {
      return { valid: false, error: 'Localhost is not allowed' };
    }

    // Block known metadata endpoints
    if (blockedHostnames.includes(hostname)) {
      return { valid: false, error: 'Blocked hostname' };
    }

    // Block IPv6 private ranges
    if (hostname.startsWith('[')) {
      const ipv6Prefixes = ['fc', 'fd', 'fe80:', '::1', 'ff'];
      const cleanHostname = hostname.replace(/[\[\]]/g, '').toLowerCase();
      for (const prefix of ipv6Prefixes) {
        if (cleanHostname.startsWith(prefix)) {
          return { valid: false, error: 'Private IPv6 addresses are not allowed' };
        }
      }
    }

    // Require HTTPS for non-local domains (security best practice)
    // Exception: Allow HTTP for *.local, *.home, *.lan (common HA setups)
    const localDomainPatterns = ['.local', '.home', '.lan', '.internal'];
    const isLocalDomain = localDomainPatterns.some(p => hostname.endsWith(p));
    
    if (url.protocol !== 'https:' && !isLocalDomain) {
      // Allow HTTP only for local domains commonly used with Home Assistant
      return { valid: false, error: 'HTTPS required for non-local domains' };
    }

    // Validate path contains camera_proxy endpoint
    const pathname = url.pathname.toLowerCase();
    if (!pathname.includes('/api/camera_proxy')) {
      return { valid: false, error: 'Invalid camera endpoint path' };
    }

    // Block path traversal attempts
    if (pathname.includes('..') || pathname.includes('//')) {
      return { valid: false, error: 'Path traversal detected' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');
    const token = url.searchParams.get('token');

    if (!targetUrl || !token) {
      console.warn('Missing url or token parameter');
      return new Response(
        JSON.stringify({ error: 'Missing url or token parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Decode and validate the target URL
    const decodedUrl = decodeURIComponent(targetUrl);
    const validation = validateHomeAssistantUrl(decodedUrl);
    
    if (!validation.valid) {
      console.warn('URL validation failed:', validation.error, 'URL:', decodedUrl.substring(0, 100));
      return new Response(
        JSON.stringify({ error: validation.error || 'Invalid camera URL' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Proxying Home Assistant camera stream:', decodedUrl.substring(0, 50) + '...');

    // Fetch from Home Assistant with auth
    const response = await fetch(decodedUrl, {
      headers: {
        'Authorization': `Bearer ${decodeURIComponent(token)}`,
      },
    });

    if (!response.ok) {
      console.error('Home Assistant returned error:', response.status);
      return new Response(
        JSON.stringify({ error: `Home Assistant error: ${response.status}` }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get content type from response
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // For MJPEG streams, we need to stream the response
    if (contentType.includes('multipart')) {
      // Stream the MJPEG response
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // For single images (snapshot), return the image data
    const imageData = await response.arrayBuffer();
    
    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('HA camera proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Proxy error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
