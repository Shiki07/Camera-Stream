import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, token, action } = await req.json();

    if (!url || !token) {
      return new Response(
        JSON.stringify({ error: 'Missing url or token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format
    let haUrl: URL;
    try {
      haUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid Home Assistant URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine the endpoint based on action
    let endpoint = '/api/';
    if (action === 'fetch_cameras') {
      endpoint = '/api/states';
    }

    const targetUrl = `${haUrl.origin}${endpoint}`;
    console.log(`Proxying request to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Home Assistant API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: `Home Assistant returned ${response.status}`,
          details: errorText.substring(0, 200)
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    // Filter for cameras if fetching states
    if (action === 'fetch_cameras') {
      const cameras = data
        .filter((entity: any) => entity.entity_id?.startsWith('camera.'))
        .map((entity: any) => ({
          entity_id: entity.entity_id,
          name: entity.attributes?.friendly_name || entity.entity_id,
        }));
      
      return new Response(
        JSON.stringify({ success: true, cameras }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: data.message || 'Connected to Home Assistant' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('HA test connection error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to connect to Home Assistant',
        hint: 'Ensure your Home Assistant instance is accessible from the internet'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
