import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const roomId = url.searchParams.get('roomId');

  console.log(`Stream relay action: ${action}, roomId: ${roomId}`);

  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // List active rooms (rooms with frames updated in last 30 seconds)
    if (action === 'list-rooms') {
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      
      const { data: rooms, error } = await supabase
        .from('relay_frames')
        .select('room_id, host_id, host_name, updated_at')
        .gte('updated_at', thirtySecondsAgo);

      if (error) throw error;

      const formattedRooms = (rooms || []).map(r => ({
        roomId: r.room_id,
        hostId: r.host_id,
        hostName: r.host_name,
        createdAt: r.updated_at,
      }));

      console.log(`Active rooms: ${formattedRooms.length}`);
      return new Response(JSON.stringify({ rooms: formattedRooms }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Push a frame (host) - upsert to database
    if (action === 'push' && req.method === 'POST') {
      if (!roomId) {
        return new Response(JSON.stringify({ error: 'roomId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { frame, hostId, hostName } = body;

      if (!frame) {
        return new Response(JSON.stringify({ error: 'frame required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Upsert frame to database
      const { error } = await supabase
        .from('relay_frames')
        .upsert({
          room_id: roomId,
          frame: frame,
          host_id: hostId || 'anonymous',
          host_name: hostName || 'Anonymous',
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'room_id' 
        });

      if (error) {
        console.error('Push frame error:', error);
        throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get latest frame (viewer) - read from database
    if (action === 'pull') {
      if (!roomId) {
        return new Response(JSON.stringify({ error: 'roomId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase
        .from('relay_frames')
        .select('frame, host_name, updated_at')
        .eq('room_id', roomId)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ error: 'Stream not found or ended' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if stream is stale (older than 10 seconds)
      const age = Date.now() - new Date(data.updated_at).getTime();
      if (age > 10000) {
        return new Response(JSON.stringify({ 
          error: 'Stream stale', 
          lastUpdate: data.updated_at,
          age 
        }), {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        frame: data.frame, 
        timestamp: new Date(data.updated_at).getTime(),
        hostName: data.host_name,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Stop a stream (host) - delete from database
    if (action === 'stop') {
      if (!roomId) {
        return new Response(JSON.stringify({ error: 'roomId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('relay_frames')
        .delete()
        .eq('room_id', roomId);

      if (error) {
        console.error('Stop stream error:', error);
      }

      console.log(`Stream stopped: ${roomId}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cleanup old frames (older than 60 seconds) - can be called periodically
    if (action === 'cleanup') {
      const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
      
      const { error } = await supabase
        .from('relay_frames')
        .delete()
        .lt('updated_at', sixtySecondsAgo);

      if (error) {
        console.error('Cleanup error:', error);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Stream relay error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
