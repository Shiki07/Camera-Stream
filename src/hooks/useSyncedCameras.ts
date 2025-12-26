import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { NetworkCameraConfig } from './useNetworkCamera';

export interface SyncedCamera extends NetworkCameraConfig {
  id?: string;
  source: 'webcam' | 'network' | 'homeassistant';
  deviceId?: string;
  haEntityId?: string;
  sourceDeviceId?: string;
  sourceDeviceName?: string;
}

// Generate a unique device ID for this browser/device
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('camera_device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('camera_device_id', deviceId);
  }
  return deviceId;
};

const getDeviceName = (): string => {
  const userAgent = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'iOS Device';
  if (/Android/.test(userAgent)) return 'Android Device';
  if (/Windows/.test(userAgent)) return 'Windows PC';
  if (/Mac/.test(userAgent)) return 'Mac';
  if (/Linux/.test(userAgent)) return 'Linux PC';
  return 'Unknown Device';
};

export function useSyncedCameras() {
  const { user } = useAuth();
  const [cameras, setCameras] = useState<SyncedCamera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceId] = useState(getDeviceId);
  const [deviceName] = useState(getDeviceName);

  // Fetch cameras from Supabase
  const fetchCameras = useCallback(async () => {
    if (!user) {
      setCameras([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('camera_credentials')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform database records to SyncedCamera format
      const syncedCameras: SyncedCamera[] = (data || []).map(cam => ({
        id: cam.id,
        url: cam.camera_url,
        name: cam.camera_name,
        type: (cam.stream_type as 'rtsp' | 'mjpeg' | 'hls') || 'mjpeg',
        quality: (cam.quality as 'high' | 'medium' | 'low') || 'medium',
        source: (cam.camera_type as 'webcam' | 'network' | 'homeassistant') || 'network',
        haEntityId: cam.ha_entity_id || undefined,
        sourceDeviceId: cam.source_device_id || undefined,
        sourceDeviceName: cam.source_device_name || undefined,
        // Decrypt credentials if present (handled by DB function)
        username: cam.encrypted_username ? undefined : undefined, // Will be decrypted on demand
        password: cam.encrypted_password ? undefined : undefined,
      }));

      setCameras(syncedCameras);
    } catch (err) {
      console.error('Error fetching synced cameras:', err);
      setCameras([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Add a camera to Supabase
  const addCamera = useCallback(async (config: Partial<SyncedCamera> & { name: string; url: string }) => {
    if (!user) return null;

    try {
      const isWebcam = config.source === 'webcam' || config.url?.startsWith('webcam://');
      
      const insertData: any = {
        user_id: user.id,
        camera_url: config.url,
        camera_name: config.name,
        stream_type: config.type || 'mjpeg',
        quality: config.quality || 'medium',
        camera_type: config.source || (isWebcam ? 'webcam' : 'network'),
        ha_entity_id: config.haEntityId || null,
        // For webcams, track which device they belong to
        source_device_id: isWebcam ? deviceId : null,
        source_device_name: isWebcam ? deviceName : null,
      };

      // Encrypt credentials if provided
      if (config.username) {
        const { data: encryptedUsername } = await supabase.rpc('encrypt_credential', {
          plaintext: config.username,
          user_id: user.id
        });
        insertData.encrypted_username = encryptedUsername;
      }

      if (config.password) {
        const { data: encryptedPassword } = await supabase.rpc('encrypt_credential', {
          plaintext: config.password,
          user_id: user.id
        });
        insertData.encrypted_password = encryptedPassword;
      }

      const { data, error } = await supabase
        .from('camera_credentials')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      await fetchCameras();
      return data.id;
    } catch (err) {
      console.error('Error adding camera:', err);
      return null;
    }
  }, [user, deviceId, deviceName, fetchCameras]);

  // Remove a camera from Supabase
  const removeCamera = useCallback(async (index: number) => {
    if (!user || !cameras[index]) return false;

    const camera = cameras[index];
    if (!camera.id) {
      // Camera doesn't have an ID, just remove from local state
      setCameras(prev => prev.filter((_, i) => i !== index));
      return true;
    }

    try {
      const { error } = await supabase
        .from('camera_credentials')
        .delete()
        .eq('id', camera.id)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchCameras();
      return true;
    } catch (err) {
      console.error('Error removing camera:', err);
      return false;
    }
  }, [user, cameras, fetchCameras]);

  // Update a camera in Supabase
  const updateCamera = useCallback(async (index: number, config: Partial<SyncedCamera>) => {
    if (!user || !cameras[index]) return false;

    const camera = cameras[index];
    if (!camera.id) return false;

    try {
      const updateData: any = {};

      if (config.name !== undefined) updateData.camera_name = config.name;
      if (config.url !== undefined) updateData.camera_url = config.url;
      if (config.type !== undefined) updateData.stream_type = config.type;
      if (config.quality !== undefined) updateData.quality = config.quality;
      if (config.source !== undefined) updateData.camera_type = config.source;
      if (config.haEntityId !== undefined) updateData.ha_entity_id = config.haEntityId;

      const { error } = await supabase
        .from('camera_credentials')
        .update(updateData)
        .eq('id', camera.id)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchCameras();
      return true;
    } catch (err) {
      console.error('Error updating camera:', err);
      return false;
    }
  }, [user, cameras, fetchCameras]);

  // Check if a webcam belongs to this device
  const isLocalWebcam = useCallback((camera: SyncedCamera): boolean => {
    if (camera.source !== 'webcam') return true; // Network cameras work everywhere
    return camera.sourceDeviceId === deviceId;
  }, [deviceId]);

  // Initial fetch
  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('camera-credentials-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'camera_credentials',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchCameras();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchCameras]);

  return {
    cameras,
    addCamera,
    removeCamera,
    updateCamera,
    isLoading,
    isLocalWebcam,
    deviceId,
    deviceName,
    refetch: fetchCameras,
  };
}
