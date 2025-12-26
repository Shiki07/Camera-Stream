import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory frame storage (per stream room)
// Key: roomId, Value: { frame: base64, timestamp: number, hostId: string }
const streamFrames = new Map<string, { 
  frame: string; 
  timestamp: number; 
  hostId: string;
  hostName: string;
}>();

// Room metadata for discovery
const activeRooms = new Map<string, {
  roomId: string;
  hostId: string;
  hostName: string;
  createdAt: string;
  lastUpdate: number;
}>();

// Cleanup old streams (older than 30 seconds)
const cleanupOldStreams = () => {
  const now = Date.now();
  const maxAge = 30000; // 30 seconds
  
  for (const [roomId, data] of streamFrames.entries()) {
    if (now - data.timestamp > maxAge) {
      console.log(`Cleaning up stale stream: ${roomId}`);
      streamFrames.delete(roomId);
      activeRooms.delete(roomId);
    }
  }
};

// Run cleanup every 10 seconds
setInterval(cleanupOldStreams, 10000);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const roomId = url.searchParams.get('roomId');

  console.log(`Stream relay action: ${action}, roomId: ${roomId}`);

  try {
    // List active rooms
    if (action === 'list-rooms') {
      cleanupOldStreams();
      const rooms = Array.from(activeRooms.values());
      console.log(`Active rooms: ${rooms.length}`);
      return new Response(JSON.stringify({ rooms }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Push a frame (host)
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

      const now = Date.now();

      // Store the frame
      streamFrames.set(roomId, {
        frame,
        timestamp: now,
        hostId: hostId || 'anonymous',
        hostName: hostName || 'Anonymous',
      });

      // Update room metadata
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, {
          roomId,
          hostId: hostId || 'anonymous',
          hostName: hostName || 'Anonymous',
          createdAt: new Date().toISOString(),
          lastUpdate: now,
        });
        console.log(`New stream started: ${roomId}`);
      } else {
        const room = activeRooms.get(roomId)!;
        room.lastUpdate = now;
      }

      return new Response(JSON.stringify({ success: true, viewers: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get latest frame (viewer)
    if (action === 'pull') {
      if (!roomId) {
        return new Response(JSON.stringify({ error: 'roomId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = streamFrames.get(roomId);
      
      if (!data) {
        return new Response(JSON.stringify({ error: 'Stream not found or ended' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if stream is stale (older than 5 seconds)
      const age = Date.now() - data.timestamp;
      if (age > 5000) {
        return new Response(JSON.stringify({ 
          error: 'Stream stale', 
          lastUpdate: data.timestamp,
          age 
        }), {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        frame: data.frame, 
        timestamp: data.timestamp,
        hostName: data.hostName,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Stop a stream (host)
    if (action === 'stop') {
      if (!roomId) {
        return new Response(JSON.stringify({ error: 'roomId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      streamFrames.delete(roomId);
      activeRooms.delete(roomId);
      console.log(`Stream stopped: ${roomId}`);

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
