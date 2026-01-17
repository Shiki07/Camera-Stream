import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory snapshot store (for demo - in production use Supabase Storage)
const snapshotStore = new Map<string, { data: string; contentType: string; timestamp: number }>();

// Token expiration time: 24 hours
const TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000;

// Generate a cryptographically secure share token
function generateSecureToken(): string {
  return crypto.randomUUID();
}

// Create Supabase admin client for token operations
function createAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Verify share token against database
async function verifyShareToken(token: string | null, cameraId: string): Promise<boolean> {
  if (!token || token.length < 10) {
    return false;
  }

  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('camera_share_tokens')
      .select('id, expires_at, revoked_at, camera_id')
      .eq('token', token)
      .eq('camera_id', cameraId)
      .single();

    if (error || !data) {
      console.log('Token not found in database');
      return false;
    }

    // Check if token is revoked
    if (data.revoked_at) {
      console.log('Token has been revoked');
      return false;
    }

    // Check if token is expired
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      console.log('Token has expired');
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error verifying token:', err);
    return false;
  }
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

      // Verify token against database with proper validation
      const isValid = await verifyShareToken(token, cameraId);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
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

      console.log(`Snapshot stored for camera ${camera_id}`);

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

      // Generate cryptographically secure token
      const shareToken = generateSecureToken();
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);
      
      // Store token in database for validation
      const { error: insertError } = await supabase
        .from('camera_share_tokens')
        .insert({
          user_id: user.id,
          camera_id: camera_id,
          token: shareToken,
          expires_at: expiresAt.toISOString()
        });

      if (insertError) {
        console.error('Error storing share token:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to generate share token' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Build the snapshot URL
      const snapshotUrl = `${supabaseUrl}/functions/v1/camera-snapshot?action=get&camera_id=${encodeURIComponent(camera_id)}&token=${shareToken}`;

      // Generate Home Assistant YAML configuration
      const haConfig = `# Add this to your configuration.yaml
camera:
  - platform: generic
    name: "${camera_name}"
    still_image_url: "${snapshotUrl}"
    scan_interval: 10  # Update every 10 seconds`;

      console.log(`Share config generated for camera ${camera_id}`);

      return new Response(JSON.stringify({
        success: true,
        share_token: shareToken,
        snapshot_url: snapshotUrl,
        ha_config: haConfig,
        camera_id,
        camera_name,
        expires_at: expiresAt.toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST: Revoke a share token
    if (req.method === 'POST' && action === 'revoke-token') {
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
      const { token } = body;

      if (!token) {
        return new Response(JSON.stringify({ error: 'Missing token' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Revoke the token (only if owned by user due to RLS)
      const { error: updateError } = await supabase
        .from('camera_share_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('token', token)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error revoking token:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to revoke token' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Token revoked for user ${user.id}`);

      return new Response(JSON.stringify({
        success: true,
        message: 'Token revoked successfully'
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
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
