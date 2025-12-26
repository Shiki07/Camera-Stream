import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SharedStream {
  id: string;
  user_id: string;
  room_id: string;
  camera_name: string;
  camera_type: string;
  started_at: string;
  last_heartbeat: string;
  is_active: boolean;
}

export function useSharedStreams() {
  const { user } = useAuth();
  const [sharedStreams, setSharedStreams] = useState<SharedStream[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch active shared streams for the current user
  const fetchSharedStreams = useCallback(async () => {
    if (!user) {
      setSharedStreams([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('shared_streams')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('started_at', { ascending: false });

      if (error) throw error;
      setSharedStreams((data as SharedStream[]) || []);
    } catch (err) {
      console.error('Error fetching shared streams:', err);
      setSharedStreams([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Register a new shared stream
  const registerStream = useCallback(async (
    roomId: string, 
    cameraName: string, 
    cameraType: string = 'webcam'
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // First, check if this room already exists
      const { data: existing } = await supabase
        .from('shared_streams')
        .select('id')
        .eq('room_id', roomId)
        .single();

      if (existing) {
        // Update existing stream
        const { error } = await supabase
          .from('shared_streams')
          .update({
            camera_name: cameraName,
            camera_type: cameraType,
            is_active: true,
            last_heartbeat: new Date().toISOString(),
            started_at: new Date().toISOString()
          })
          .eq('room_id', roomId);

        if (error) throw error;
      } else {
        // Insert new stream
        const { error } = await supabase
          .from('shared_streams')
          .insert({
            user_id: user.id,
            room_id: roomId,
            camera_name: cameraName,
            camera_type: cameraType,
            is_active: true
          });

        if (error) throw error;
      }

      await fetchSharedStreams();
      return true;
    } catch (err) {
      console.error('Error registering shared stream:', err);
      return false;
    }
  }, [user, fetchSharedStreams]);

  // Unregister a shared stream
  const unregisterStream = useCallback(async (roomId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('shared_streams')
        .update({ is_active: false })
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchSharedStreams();
      return true;
    } catch (err) {
      console.error('Error unregistering shared stream:', err);
      return false;
    }
  }, [user, fetchSharedStreams]);

  // Update heartbeat for a stream (keeps it marked as active)
  const updateHeartbeat = useCallback(async (roomId: string): Promise<void> => {
    if (!user) return;

    try {
      await supabase
        .from('shared_streams')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error updating heartbeat:', err);
    }
  }, [user]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    fetchSharedStreams();

    if (!user) return;

    // Subscribe to realtime changes
    const channel = supabase
      .channel('shared-streams-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_streams',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchSharedStreams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchSharedStreams]);

  return {
    sharedStreams,
    isLoading,
    registerStream,
    unregisterStream,
    updateHeartbeat,
    refetch: fetchSharedStreams
  };
}
