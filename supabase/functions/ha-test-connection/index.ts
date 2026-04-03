import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Strip invisible characters, BOM, zero-width spaces, trailing newlines
const sanitizeToken = (token: string): string => {
  return token
    .replace(/^\uFEFF/, '') // BOM
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '') // zero-width & nbsp
    .replace(/[\r\n\t]/g, '') // newlines/tabs
    .trim();
};

serve(async (req) => {
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

    // Sanitize the token
    const cleanToken = sanitizeToken(token);
    console.log(`Token sanitized: original length=${token.length}, clean length=${cleanToken.length}`);

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

    // Always test basic API connectivity first
    const baseApiUrl = `${haUrl.origin}/api/`;
    console.log(`Testing basic API connectivity: ${baseApiUrl}`);

    const testResponse = await fetch(baseApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
      },
    });

    const testBody = await testResponse.text();
    console.log(`Basic API test: status=${testResponse.status}, body=${testBody.substring(0, 200)}`);

    if (!testResponse.ok) {
      console.error(`Home Assistant basic API auth failed: ${testResponse.status} - ${testBody}`);
      
      let errorMessage = `Home Assistant returned ${testResponse.status}`;
      if (testResponse.status === 401) {
        errorMessage = 'Home Assistant rejected the token (401 Unauthorized). Please verify: ' +
          '1) The token is a Long-Lived Access Token from Profile → Security, ' +
          '2) The token was not revoked, ' +
          '3) Copy the full token without extra spaces';
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          status: testResponse.status,
          details: testBody.substring(0, 200),
          tokenInfo: { length: cleanToken.length, prefix: cleanToken.substring(0, 15) }
        }),
        { status: testResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic auth works! Now handle the actual action
    if (action === 'fetch_cameras') {
      const statesUrl = `${haUrl.origin}/api/states`;
      console.log(`Fetching camera states from: ${statesUrl}`);

      const statesResponse = await fetch(statesUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
        },
      });

      if (!statesResponse.ok) {
        const errorText = await statesResponse.text();
        console.error(`Home Assistant states API error: ${statesResponse.status} - ${errorText}`);
        return new Response(
          JSON.stringify({ 
            error: `Home Assistant returned ${statesResponse.status}`,
            details: errorText.substring(0, 200)
          }),
          { status: statesResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await statesResponse.json();
      const cameras = data
        .filter((entity: any) => entity.entity_id?.startsWith('camera.'))
        .map((entity: any) => ({
          entity_id: entity.entity_id,
          name: entity.attributes?.friendly_name || entity.entity_id,
        }));
      
      console.log(`Found ${cameras.length} cameras out of ${data.length} entities`);
      
      return new Response(
        JSON.stringify({ success: true, cameras }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: test connection result
    let apiMessage = 'Connected to Home Assistant';
    try {
      const parsed = JSON.parse(testBody);
      apiMessage = parsed.message || apiMessage;
    } catch {
      // use default
    }

    return new Response(
      JSON.stringify({ success: true, message: apiMessage }),
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
