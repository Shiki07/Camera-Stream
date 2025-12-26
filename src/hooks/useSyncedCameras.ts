import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NetworkCameraConfig } from './useNetworkCamera';
import { getDeviceId, getDeviceName, isLocalDevice } from '@/utils/deviceIdentifier';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

const LOCAL_STORAGE_KEY = 'networkCameras';

export interface SyncedCameraConfig extends NetworkCameraConfig {
  id?: string; // Supabase row ID
  source?: 'webcam' | 'network' | 'homeassistant';
  deviceId?: string; // Webcam device ID
  haEntityId?: string; // Home Assistant entity ID
  sourceDeviceId?: string; // Device that added this camera
  sourceDeviceName?: string; // Human-readable device name
  isRemote?: boolean; // True if webcam from another device
}

interface DatabaseCamera {
  id: string;
  camera_name: string;
  camera_url: string;
  encrypted_username: string | null;
  encrypted_password: string | null;
  camera_type: string | null;
  source_device_id: string | null;
  source_device_name: string | null;
  ha_entity_id: string | null;
  stream_type: string | null;
  quality: string | null;
}

export function useSyncedCameras() {
  const { user } = useAuth();
  const [cameras, setCameras] = useState<SyncedCameraConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Convert database row to camera config
  const dbToConfig = useCallback((row: DatabaseCamera): SyncedCameraConfig => {
    // Detect webcam by URL pattern OR camera_type (handles legacy data with wrong type)
    const isWebcam = row.camera_type === 'webcam' || row.camera_url?.startsWith('webcam://');
    const sourceDeviceId = row.source_device_id;
    
    // Determine source type - prioritize URL pattern detection
    let source: 'webcam' | 'network' | 'homeassistant' = 'network';
    if (isWebcam) {
      source = 'webcam';
    } else if (row.ha_entity_id) {
      source = 'homeassistant';
    } else if (row.camera_type === 'homeassistant') {
      source = 'homeassistant';
    }
    
    return {
      id: row.id,
      name: row.camera_name,
      url: row.camera_url,
      type: (row.stream_type as 'mjpeg' | 'rtsp' | 'hls') || 'mjpeg',
      quality: (row.quality as 'high' | 'medium' | 'low') || 'medium',
      source,
      deviceId: isWebcam ? row.camera_url.replace('webcam://', '') : undefined,
      haEntityId: row.ha_entity_id || undefined,
      sourceDeviceId: sourceDeviceId || undefined,
      sourceDeviceName: row.source_device_name || undefined,
      // Mark webcams from other devices as remote
      isRemote: isWebcam && !isLocalDevice(sourceDeviceId),
    };
  }, []);

  // Convert camera config to database row format
  const configToDbInsert = useCallback((config: SyncedCameraConfig) => {
    const deviceId = getDeviceId();
    const deviceName = getDeviceName();
    
    return {
      camera_name: config.name,
      camera_url: config.url,
      camera_type: config.source || 'network',
      source_device_id: deviceId,
      source_device_name: deviceName,
      ha_entity_id: config.haEntityId || null,
      stream_type: config.type || 'mjpeg',
      quality: config.quality || 'medium',
    };
  }, []);

  // Load cameras from Supabase
  const loadFromSupabase = useCallback(async () => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase
        .from('camera_credentials')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(dbToConfig);
    } catch (err) {
      console.error('Failed to load cameras from Supabase:', err);
      return [];
    }
  }, [user, dbToConfig]);

  // Load cameras from localStorage (fallback/offline)
  const loadFromLocalStorage = useCallback((): SyncedCameraConfig[] => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!saved) return [];
      
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      
      // Mark webcams based on device
      const deviceId = getDeviceId();
      return parsed.map((cam: any) => ({
        ...cam,
        isRemote: cam.source === 'webcam' && cam.sourceDeviceId && cam.sourceDeviceId !== deviceId,
      }));
    } catch {
      return [];
    }
  }, []);

  // Save to localStorage as cache
  const saveToLocalStorage = useCallback((cams: SyncedCameraConfig[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cams));
    } catch {
      // Silent failure
    }
  }, []);

  // Backfill missing source_device_id for webcams that belong to this device
  const backfillCameraData = useCallback(async (cams: SyncedCameraConfig[]) => {
    if (!user) return;
    
    const currentDeviceId = getDeviceId();
    const currentDeviceName = getDeviceName();
    
    for (const cam of cams) {
      // Check if this is a webcam (by URL) that's missing source_device_id
      const isWebcamByUrl = cam.url?.startsWith('webcam://');
      const needsBackfill = isWebcamByUrl && !cam.sourceDeviceId && cam.id;
      
      // Also fix camera_type if it's wrong
      const needsTypefix = isWebcamByUrl && cam.source !== 'webcam' && cam.id;
      
      if (needsBackfill || needsTypefix) {
        // Try to access the webcam to see if it belongs to this device
        const deviceId = cam.url?.replace('webcam://', '') || '';
        
        try {
          // Check if we can access this webcam device
          const devices = await navigator.mediaDevices.enumerateDevices();
          const webcamExists = devices.some(d => d.deviceId === deviceId && d.kind === 'videoinput');
          
          if (webcamExists) {
            console.log(`Backfilling camera data for: ${cam.name}`);
            await supabase.from('camera_credentials')
              .update({
                camera_type: 'webcam',
                source_device_id: currentDeviceId,
                source_device_name: currentDeviceName,
              })
              .eq('id', cam.id);
          }
        } catch (err) {
          // Can't enumerate devices - skip backfill
          console.log('Cannot enumerate devices for backfill:', err);
        }
      }
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      
      if (user) {
        // User is logged in - load from Supabase
        const supabaseCameras = await loadFromSupabase();
        
        if (supabaseCameras.length > 0) {
          setCameras(supabaseCameras);
          saveToLocalStorage(supabaseCameras);
          
          // Backfill missing data for cameras on this device
          await backfillCameraData(supabaseCameras);
          
          // Reload to get updated data
          const updatedCameras = await loadFromSupabase();
          if (JSON.stringify(updatedCameras) !== JSON.stringify(supabaseCameras)) {
            setCameras(updatedCameras);
            saveToLocalStorage(updatedCameras);
          }
        } else {
          // Check if there are local cameras to migrate
          const localCameras = loadFromLocalStorage();
          if (localCameras.length > 0) {
            console.log('Migrating local cameras to Supabase...');
            // Migrate local cameras to Supabase
            for (const cam of localCameras) {
              try {
                await supabase.from('camera_credentials').insert({
                  user_id: user.id,
                  ...configToDbInsert(cam),
                });
              } catch (err) {
                console.error('Failed to migrate camera:', err);
              }
            }
            // Reload from Supabase
            const migrated = await loadFromSupabase();
            setCameras(migrated);
            saveToLocalStorage(migrated);
          }
        }
      } else {
        // Not logged in - use localStorage
        const localCameras = loadFromLocalStorage();
        setCameras(localCameras);
      }
      
      setIsLoading(false);
    };
    
    load();
  }, [user, loadFromSupabase, loadFromLocalStorage, saveToLocalStorage, configToDbInsert, backfillCameraData]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) {
      // Clean up channel if user logs out
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }
    
    // Subscribe to camera_credentials changes
    const channel = supabase
      .channel('camera-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'camera_credentials',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('Camera sync event:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            const newCamera = dbToConfig(payload.new as DatabaseCamera);
            setCameras(prev => {
              // Avoid duplicates
              if (prev.some(c => c.id === newCamera.id)) return prev;
              const updated = [...prev, newCamera];
              saveToLocalStorage(updated);
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setCameras(prev => {
              const updated = prev.filter(c => c.id !== deletedId);
              saveToLocalStorage(updated);
              return updated;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedCamera = dbToConfig(payload.new as DatabaseCamera);
            setCameras(prev => {
              const updated = prev.map(c => c.id === updatedCamera.id ? updatedCamera : c);
              saveToLocalStorage(updated);
              return updated;
            });
          }
        }
      )
      .subscribe();
    
    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, dbToConfig, saveToLocalStorage]);

  // Add a new camera
  const addCamera = useCallback(async (config: SyncedCameraConfig) => {
    if (!user) {
      // Not logged in - just add to local state and localStorage
      const newCam = {
        ...config,
        sourceDeviceId: getDeviceId(),
        sourceDeviceName: getDeviceName(),
        isRemote: false,
      };
      setCameras(prev => {
        const updated = [...prev, newCam];
        saveToLocalStorage(updated);
        return updated;
      });
      return;
    }
    
    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('camera_credentials')
        .insert({
          user_id: user.id,
          ...configToDbInsert(config),
        });
      
      if (error) throw error;
      // Realtime will handle adding to state
    } catch (err) {
      console.error('Failed to add camera:', err);
      // Add locally as fallback
      const newCam = {
        ...config,
        sourceDeviceId: getDeviceId(),
        sourceDeviceName: getDeviceName(),
        isRemote: false,
      };
      setCameras(prev => {
        const updated = [...prev, newCam];
        saveToLocalStorage(updated);
        return updated;
      });
    } finally {
      setIsSyncing(false);
    }
  }, [user, configToDbInsert, saveToLocalStorage]);

  // Remove a camera
  const removeCamera = useCallback(async (index: number) => {
    const camera = cameras[index];
    if (!camera) return;
    
    if (!user || !camera.id) {
      // Not logged in or no DB ID - just remove locally
      setCameras(prev => {
        const updated = prev.filter((_, i) => i !== index);
        saveToLocalStorage(updated);
        return updated;
      });
      return;
    }
    
    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('camera_credentials')
        .delete()
        .eq('id', camera.id);
      
      if (error) throw error;
      // Realtime will handle removing from state
    } catch (err) {
      console.error('Failed to remove camera:', err);
      // Remove locally as fallback
      setCameras(prev => {
        const updated = prev.filter((_, i) => i !== index);
        saveToLocalStorage(updated);
        return updated;
      });
    } finally {
      setIsSyncing(false);
    }
  }, [user, cameras, saveToLocalStorage]);

  // Update a camera
  const updateCamera = useCallback(async (index: number, config: SyncedCameraConfig) => {
    const camera = cameras[index];
    if (!camera) return;
    
    if (!user || !camera.id) {
      // Not logged in or no DB ID - just update locally
      setCameras(prev => {
        const updated = prev.map((cam, i) => i === index ? { ...config, isRemote: cam.isRemote } : cam);
        saveToLocalStorage(updated);
        return updated;
      });
      return;
    }
    
    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('camera_credentials')
        .update({
          camera_name: config.name,
          camera_url: config.url,
          stream_type: config.type,
          quality: config.quality,
          ha_entity_id: config.haEntityId || null,
        })
        .eq('id', camera.id);
      
      if (error) throw error;
      // Realtime will handle updating state
    } catch (err) {
      console.error('Failed to update camera:', err);
      // Update locally as fallback
      setCameras(prev => {
        const updated = prev.map((cam, i) => i === index ? { ...config, isRemote: cam.isRemote } : cam);
        saveToLocalStorage(updated);
        return updated;
      });
    } finally {
      setIsSyncing(false);
    }
  }, [user, cameras, saveToLocalStorage]);

  return {
    cameras,
    setCameras,
    addCamera,
    removeCamera,
    updateCamera,
    isLoading,
    isSyncing,
  };
}
