import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory snapshot store (for demo - in production use Supabase Storage)
const snapshotStore = new Map<string, { data: string; contentType: string; timestamp: number }>();

// Generate a secure share token
function generateShareToken(cameraId: string, userId: string): string {
  const data = `${cameraId}:${userId}:${Date.now()}`;
  // Simple hash for demo - in production use proper HMAC
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + Date.now().toString(36);
}

// Verify share token (simplified for demo)
function verifyShareToken(token: string | null): boolean {
  // In production, verify against stored tokens in database
  return token !== null && token.length > 10;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  try {
    // GET: Retrieve snapshot for Home Assistant
    if (req.method === 'GET' && action === 'get') {
      const cameraId = url.searchParams.get('camera_id');
      const token = url.searchParams.get('token');

      if (!cameraId || !token) {
        return new Response(JSON.stringify({ error: 'Missing camera_id or token' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!verifyShareToken(token)) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const snapshot = snapshotStore.get(cameraId);
      if (!snapshot) {
        // Return a placeholder image if no snapshot available
        return new Response(JSON.stringify({ error: 'No snapshot available' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Return the image
      const imageData = Uint8Array.from(atob(snapshot.data), c => c.charCodeAt(0));
      return new Response(imageData, {
        headers: {
          ...corsHeaders,
          'Content-Type': snapshot.contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Snapshot-Timestamp': snapshot.timestamp.toString(),
        },
      });
    }

    // POST: Upload new snapshot
    if (req.method === 'POST' && action === 'upload') {
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Authorization required' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Initialize Supabase client to verify user
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { camera_id, image_data, content_type } = body;

      if (!camera_id || !image_data) {
        return new Response(JSON.stringify({ error: 'Missing camera_id or image_data' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Store snapshot
      snapshotStore.set(camera_id, {
        data: image_data,
        contentType: content_type || 'image/jpeg',
        timestamp: Date.now(),
      });

      console.log(`Snapshot stored for camera ${camera_id} by user ${user.id}`);

      return new Response(JSON.stringify({ 
        success: true, 
        timestamp: Date.now(),
        message: 'Snapshot uploaded successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST: Generate share configuration
    if (req.method === 'POST' && action === 'generate-share') {
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Authorization required' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { camera_id, camera_name } = body;

      if (!camera_id || !camera_name) {
        return new Response(JSON.stringify({ error: 'Missing camera_id or camera_name' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate share token
      const shareToken = generateShareToken(camera_id, user.id);
      
      // Build the snapshot URL
      const snapshotUrl = `${supabaseUrl}/functions/v1/camera-snapshot?action=get&camera_id=${encodeURIComponent(camera_id)}&token=${shareToken}`;

      // Generate Home Assistant YAML configuration
      const haConfig = `# Add this to your configuration.yaml
camera:
  - platform: generic
    name: "${camera_name}"
    still_image_url: "${snapshotUrl}"
    scan_interval: 10  # Update every 10 seconds`;

      console.log(`Share config generated for camera ${camera_id} by user ${user.id}`);

      return new Response(JSON.stringify({
        success: true,
        share_token: shareToken,
        snapshot_url: snapshotUrl,
        ha_config: haConfig,
        camera_id,
        camera_name,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Camera snapshot error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
