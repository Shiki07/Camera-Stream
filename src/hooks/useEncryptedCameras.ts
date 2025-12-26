import { useState, useEffect, useCallback } from 'react';
import { NetworkCameraConfig } from './useNetworkCamera';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const STORAGE_KEY = 'networkCameras';

interface CloudCamera {
  id: string;
  camera_name: string;
  camera_url: string;
  encrypted_username: string | null;
  encrypted_password: string | null;
}

export function useEncryptedCameras() {
  const { user } = useAuth();
  const [cameras, setCameras] = useState<NetworkCameraConfig[]>([]);
  const [cameraDbIds, setCameraDbIds] = useState<Map<number, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cameras from Supabase on mount/auth change
  useEffect(() => {
    const loadCameras = async () => {
      setIsLoading(true);
      
      if (!user) {
        // Not logged in - try localStorage as fallback for migration
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setCameras(parsed as NetworkCameraConfig[]);
            }
          }
        } catch {
          setCameras([]);
        }
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      try {
        // Fetch cameras from Supabase
        const { data, error } = await supabase
          .from('camera_credentials')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error loading cameras:', error);
          setCameras([]);
          setIsLoading(false);
          setIsInitialized(true);
          return;
        }

        if (!data || data.length === 0) {
          // Check localStorage for migration
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                // Migrate localStorage cameras to Supabase
                await migrateLocalCamerasToCloud(parsed, user.id);
                // Clear localStorage after migration
                localStorage.removeItem(STORAGE_KEY);
              }
            } catch {
              // Ignore migration errors
            }
          }
          setCameras([]);
          setIsLoading(false);
          setIsInitialized(true);
          return;
        }

        // Decrypt and map cameras
        const decryptedCameras = await Promise.all(
          data.map(async (cam: CloudCamera, index: number) => {
            const decrypted = await decryptCloudCamera(cam, user.id);
            return decrypted;
          })
        );

        // Store DB IDs for updates/deletes
        const idMap = new Map<number, string>();
        data.forEach((cam: CloudCamera, index: number) => {
          idMap.set(index, cam.id);
        });
        setCameraDbIds(idMap);

        setCameras(decryptedCameras.filter(Boolean) as NetworkCameraConfig[]);
      } catch (err) {
        console.error('Error loading cameras:', err);
        setCameras([]);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    loadCameras();
  }, [user]);

  // Decrypt a camera from Supabase
  const decryptCloudCamera = async (cam: CloudCamera, userId: string): Promise<NetworkCameraConfig | null> => {
    try {
      let username: string | undefined;
      let password: string | undefined;

      if (cam.encrypted_username) {
        const { data } = await supabase.rpc('decrypt_credential', {
          ciphertext: cam.encrypted_username,
          user_id: userId,
        });
        username = data || undefined;
      }

      if (cam.encrypted_password) {
        const { data } = await supabase.rpc('decrypt_credential', {
          ciphertext: cam.encrypted_password,
          user_id: userId,
        });
        password = data || undefined;
      }

      return {
        url: cam.camera_url,
        name: cam.camera_name,
        username,
        password,
        type: 'mjpeg' as const,
      };
    } catch (err) {
      console.error('Error decrypting camera:', err);
      return null;
    }
  };

  // Migrate localStorage cameras to Supabase
  const migrateLocalCamerasToCloud = async (localCameras: NetworkCameraConfig[], userId: string) => {
    for (const cam of localCameras) {
      try {
        let encryptedUsername: string | null = null;
        let encryptedPassword: string | null = null;

        if (cam.username) {
          const { data } = await supabase.rpc('encrypt_credential', {
            plaintext: cam.username,
            user_id: userId,
          });
          encryptedUsername = data;
        }

        if (cam.password) {
          const { data } = await supabase.rpc('encrypt_credential', {
            plaintext: cam.password,
            user_id: userId,
          });
          encryptedPassword = data;
        }

        await supabase.from('camera_credentials').insert({
          user_id: userId,
          camera_name: cam.name || 'Camera',
          camera_url: cam.url,
          encrypted_username: encryptedUsername,
          encrypted_password: encryptedPassword,
        });
      } catch (err) {
        console.error('Error migrating camera:', err);
      }
    }

    // Reload cameras after migration
    const { data } = await supabase
      .from('camera_credentials')
      .select('*')
      .eq('user_id', userId);

    if (data && data.length > 0) {
      const decryptedCameras = await Promise.all(
        data.map((cam: CloudCamera) => decryptCloudCamera(cam, userId))
      );

      const idMap = new Map<number, string>();
      data.forEach((cam: CloudCamera, index: number) => {
        idMap.set(index, cam.id);
      });
      setCameraDbIds(idMap);

      setCameras(decryptedCameras.filter(Boolean) as NetworkCameraConfig[]);
      toast.success('Cameras synced to cloud');
    }
  };

  const addCamera = useCallback(async (config: NetworkCameraConfig) => {
    if (!user) {
      // Fallback to local-only if not logged in
      setCameras(prev => [...prev, config]);
      return;
    }

    try {
      let encryptedUsername: string | null = null;
      let encryptedPassword: string | null = null;

      if (config.username) {
        const { data } = await supabase.rpc('encrypt_credential', {
          plaintext: config.username,
          user_id: user.id,
        });
        encryptedUsername = data;
      }

      if (config.password) {
        const { data } = await supabase.rpc('encrypt_credential', {
          plaintext: config.password,
          user_id: user.id,
        });
        encryptedPassword = data;
      }

      const { data, error } = await supabase.from('camera_credentials').insert({
        user_id: user.id,
        camera_name: config.name || 'Camera',
        camera_url: config.url,
        encrypted_username: encryptedUsername,
        encrypted_password: encryptedPassword,
      }).select().single();

      if (error) throw error;

      // Update local state
      setCameras(prev => [...prev, config]);
      setCameraDbIds(prev => {
        const newMap = new Map(prev);
        newMap.set(cameras.length, data.id);
        return newMap;
      });
    } catch (err) {
      console.error('Error adding camera:', err);
      toast.error('Failed to save camera');
      // Still add locally
      setCameras(prev => [...prev, config]);
    }
  }, [user, cameras.length]);

  const removeCamera = useCallback(async (index: number) => {
    const dbId = cameraDbIds.get(index);
    
    if (user && dbId) {
      try {
        const { error } = await supabase
          .from('camera_credentials')
          .delete()
          .eq('id', dbId)
          .eq('user_id', user.id);

        if (error) throw error;
      } catch (err) {
        console.error('Error removing camera:', err);
        toast.error('Failed to remove camera from cloud');
      }
    }

    // Update local state and reindex DB IDs
    setCameras(prev => prev.filter((_, i) => i !== index));
    setCameraDbIds(prev => {
      const newMap = new Map<number, string>();
      let newIndex = 0;
      prev.forEach((id, oldIndex) => {
        if (oldIndex !== index) {
          newMap.set(newIndex, id);
          newIndex++;
        }
      });
      return newMap;
    });
  }, [user, cameraDbIds]);

  const updateCamera = useCallback(async (index: number, config: NetworkCameraConfig) => {
    const dbId = cameraDbIds.get(index);

    if (user && dbId) {
      try {
        let encryptedUsername: string | null = null;
        let encryptedPassword: string | null = null;

        if (config.username) {
          const { data } = await supabase.rpc('encrypt_credential', {
            plaintext: config.username,
            user_id: user.id,
          });
          encryptedUsername = data;
        }

        if (config.password) {
          const { data } = await supabase.rpc('encrypt_credential', {
            plaintext: config.password,
            user_id: user.id,
          });
          encryptedPassword = data;
        }

        const { error } = await supabase
          .from('camera_credentials')
          .update({
            camera_name: config.name || 'Camera',
            camera_url: config.url,
            encrypted_username: encryptedUsername,
            encrypted_password: encryptedPassword,
          })
          .eq('id', dbId)
          .eq('user_id', user.id);

        if (error) throw error;
      } catch (err) {
        console.error('Error updating camera:', err);
        toast.error('Failed to update camera');
      }
    }

    setCameras(prev => prev.map((cam, i) => i === index ? config : cam));
  }, [user, cameraDbIds]);

  return {
    cameras,
    setCameras,
    addCamera,
    removeCamera,
    updateCamera,
    isLoading,
  };
}
