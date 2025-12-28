import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface HomeAssistantConfig {
  url: string;
  token: string;
  webhookId: string;
  enabled: boolean;
  recordingLocation: 'sd_card' | 'nas' | 'local_media';
}

export interface HACamera {
  entity_id: string;
  name: string;
  proxy_url?: string;
}

const LEGACY_STORAGE_KEY = 'homeassistant_config';
const LEGACY_ENCRYPTED_TOKEN_KEY = 'homeassistant_encrypted_token';

export const useHomeAssistant = () => {
  const [config, setConfig] = useState<HomeAssistantConfig>({
    url: '',
    token: '',
    webhookId: '',
    enabled: false,
    recordingLocation: 'sd_card',
  });
  const [cameras, setCameras] = useState<HACamera[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();

  // Load config from server-side storage
  useEffect(() => {
    const loadConfig = async () => {
      if (!session?.access_token) {
        // Not logged in - check for legacy localStorage data to migrate later
        setIsInitialized(true);
        return;
      }

      try {
        const response = await fetch(
          'https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/ha-token-manager',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ action: 'load' }),
          }
        );

        const data = await response.json();

        if (response.ok && data.success && data.config) {
          setConfig(data.config);
          
          // Clean up legacy localStorage if server has data
          localStorage.removeItem(LEGACY_STORAGE_KEY);
          localStorage.removeItem(LEGACY_ENCRYPTED_TOKEN_KEY);
        } else if (!data.config) {
          // No server config - check for legacy localStorage to migrate
          await migrateLegacyConfig();
        }
      } catch (error) {
        console.error('Failed to load Home Assistant config');
        // Fallback to legacy localStorage if server fails
        await loadLegacyConfig();
      } finally {
        setIsInitialized(true);
      }
    };

    loadConfig();
  }, [session?.access_token]);

  // Migrate legacy localStorage config to server
  const migrateLegacyConfig = async () => {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
    const encryptedToken = localStorage.getItem(LEGACY_ENCRYPTED_TOKEN_KEY);
    
    if (!stored && !encryptedToken) return;

    try {
      const parsed = stored ? JSON.parse(stored) : {};
      
      // We can't decrypt client-side encrypted token on server
      // User will need to re-enter their token
      if (parsed.url || parsed.webhookId) {
        setConfig({
          url: parsed.url || '',
          webhookId: parsed.webhookId || '',
          enabled: false, // Disable until user re-enters token
          token: '', // Token needs to be re-entered
          recordingLocation: parsed.recordingLocation || 'sd_card',
        });
        
        // Clean up legacy storage
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        localStorage.removeItem(LEGACY_ENCRYPTED_TOKEN_KEY);
        
        toast({
          title: 'Security Update',
          description: 'Please re-enter your Home Assistant token. Your credentials are now stored more securely on the server.',
        });
      }
    } catch {
      // Silent failure
    }
  };

  // Load from legacy localStorage (fallback when server unavailable)
  const loadLegacyConfig = async () => {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConfig({
          url: parsed.url || '',
          webhookId: parsed.webhookId || '',
          enabled: false,
          token: '', // Don't load legacy tokens
          recordingLocation: parsed.recordingLocation || 'sd_card',
        });
      } catch {
        // Silent failure
      }
    }
  };

  // Save config to server-side storage
  const saveConfig = useCallback(async (newConfig: HomeAssistantConfig) => {
    if (!session?.access_token) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to save your configuration',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(
        'https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/ha-token-manager',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'save',
            token: newConfig.token,
            url: newConfig.url,
            webhookId: newConfig.webhookId,
            enabled: newConfig.enabled,
            recordingLocation: newConfig.recordingLocation,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save configuration');
      }

      setConfig(newConfig);
      
      // Clean up any legacy localStorage
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.removeItem(LEGACY_ENCRYPTED_TOKEN_KEY);
      
      toast({
        title: 'Configuration saved',
        description: 'Your Home Assistant configuration has been saved securely',
      });
    } catch (error) {
      console.error('Failed to save Home Assistant config');
      toast({
        title: 'Error saving configuration',
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: 'destructive',
      });
    }
  }, [session?.access_token, toast]);

  // Test connection to Home Assistant via edge function (avoids CORS)
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!config.url || !config.token) {
      toast({
        title: 'Missing configuration',
        description: 'Please enter Home Assistant URL and token',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);
    try {
      const response = await fetch(
        'https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/ha-test-connection',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: config.url,
            token: config.token,
            action: 'test',
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setConnected(true);
        toast({
          title: 'Connected to Home Assistant',
          description: data.message || 'Successfully connected to your Home Assistant instance',
        });
        return true;
      } else {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      setConnected(false);
      toast({
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Could not connect to Home Assistant',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [config.url, config.token, toast]);

  // Fetch available cameras from Home Assistant via edge function
  const fetchCameras = useCallback(async (): Promise<HACamera[]> => {
    if (!config.url || !config.token) {
      return [];
    }

    setLoading(true);
    try {
      const response = await fetch(
        'https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/ha-test-connection',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: config.url,
            token: config.token,
            action: 'fetch_cameras',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setCameras(data.cameras || []);
      return data.cameras || [];
    } catch (error) {
      console.error('Failed to fetch cameras');
      toast({
        title: 'Failed to fetch cameras',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [config.url, config.token, toast]);

  // Generate proxy URL for a camera
  const getCameraProxyUrl = useCallback((entityId: string): string => {
    // Normalize HA base URL to origin
    let haOrigin = config.url;
    try {
      haOrigin = new URL(config.url).origin;
    } catch {
      // fall back to raw config.url
    }

    const encodedUrl = encodeURIComponent(`${haOrigin}/api/camera_proxy_stream/${entityId}`);
    const encodedToken = encodeURIComponent(config.token);
    return `https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/ha-camera-proxy?url=${encodedUrl}&token=${encodedToken}`;
  }, [config.url, config.token]);

  // Send webhook to Home Assistant
  const sendWebhook = useCallback(async (eventData: {
    type: string;
    camera_name?: string;
    motion_level?: number;
    timestamp?: string;
    entity_id?: string;
    recording_location?: string;
  }): Promise<boolean> => {
    if (!config.enabled || !config.webhookId || !config.url) {
      return false;
    }

    try {
      const webhookUrl = `${config.url}/api/webhook/${config.webhookId}`;
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...eventData,
          source: 'camera_stream',
          timestamp: eventData.timestamp || new Date().toISOString(),
          recording_location: config.recordingLocation,
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }, [config.enabled, config.webhookId, config.url, config.recordingLocation]);

  // Send motion detected event
  const sendMotionEvent = useCallback(async (cameraName: string, motionLevel: number): Promise<boolean> => {
    return sendWebhook({
      type: 'motion_detected',
      camera_name: cameraName,
      motion_level: motionLevel,
    });
  }, [sendWebhook]);

  // Send motion cleared event
  const sendMotionClearedEvent = useCallback(async (cameraName: string): Promise<boolean> => {
    return sendWebhook({
      type: 'motion_cleared',
      camera_name: cameraName,
    });
  }, [sendWebhook]);

  // Send start recording command (triggers HA automation to record to SD card)
  const sendStartRecording = useCallback(async (cameraName: string, entityId?: string): Promise<boolean> => {
    return sendWebhook({
      type: 'start_recording',
      camera_name: cameraName,
      entity_id: entityId,
    });
  }, [sendWebhook]);

  // Send stop recording command (triggers HA automation to stop SD card recording)
  const sendStopRecording = useCallback(async (cameraName: string, entityId?: string): Promise<boolean> => {
    return sendWebhook({
      type: 'stop_recording',
      camera_name: cameraName,
      entity_id: entityId,
    });
  }, [sendWebhook]);

  return {
    config,
    saveConfig,
    cameras,
    loading,
    connected,
    testConnection,
    fetchCameras,
    getCameraProxyUrl,
    sendMotionEvent,
    sendMotionClearedEvent,
    sendStartRecording,
    sendStopRecording,
  };
};
