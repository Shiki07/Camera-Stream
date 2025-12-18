import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
      return new Response(
        JSON.stringify({ error: 'Missing url or token parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate URL is a Home Assistant camera proxy URL
    const decodedUrl = decodeURIComponent(targetUrl);
    if (!decodedUrl.includes('/api/camera_proxy') && !decodedUrl.includes('/api/camera_proxy_stream')) {
      return new Response(
        JSON.stringify({ error: 'Invalid camera URL' }),
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Proxy error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
