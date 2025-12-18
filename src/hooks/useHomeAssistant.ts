import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface HomeAssistantConfig {
  url: string;
  token: string;
  webhookId: string;
  enabled: boolean;
}

export interface HACamera {
  entity_id: string;
  name: string;
  proxy_url?: string;
}

const STORAGE_KEY = 'homeassistant_config';

// Encrypt token before storage (simple obfuscation - in production use proper encryption)
const encryptToken = (token: string): string => {
  return btoa(token.split('').reverse().join(''));
};

const decryptToken = (encrypted: string): string => {
  try {
    return atob(encrypted).split('').reverse().join('');
  } catch {
    return '';
  }
};

export const useHomeAssistant = () => {
  const [config, setConfig] = useState<HomeAssistantConfig>({
    url: '',
    token: '',
    webhookId: '',
    enabled: false,
  });
  const [cameras, setCameras] = useState<HACamera[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const { toast } = useToast();

  // Load config from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConfig({
          ...parsed,
          token: decryptToken(parsed.token || ''),
        });
      } catch {
        console.error('Failed to parse Home Assistant config');
      }
    }
  }, []);

  // Save config to localStorage
  const saveConfig = useCallback((newConfig: HomeAssistantConfig) => {
    const toStore = {
      ...newConfig,
      token: encryptToken(newConfig.token),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    setConfig(newConfig);
  }, []);

  // Test connection to Home Assistant
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
      const response = await fetch(`${config.url}/api/`, {
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setConnected(true);
        toast({
          title: 'Connected to Home Assistant',
          description: 'Successfully connected to your Home Assistant instance',
        });
        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
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

  // Fetch available cameras from Home Assistant
  const fetchCameras = useCallback(async (): Promise<HACamera[]> => {
    if (!config.url || !config.token) {
      return [];
    }

    setLoading(true);
    try {
      const response = await fetch(`${config.url}/api/states`, {
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const states = await response.json();
      const cameraEntities = states
        .filter((entity: any) => entity.entity_id.startsWith('camera.'))
        .map((entity: any) => ({
          entity_id: entity.entity_id,
          name: entity.attributes.friendly_name || entity.entity_id,
        }));

      setCameras(cameraEntities);
      return cameraEntities;
    } catch (error) {
      console.error('Failed to fetch cameras:', error);
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
    // Use edge function to proxy the stream with auth
    const encodedUrl = encodeURIComponent(`${config.url}/api/camera_proxy_stream/${entityId}`);
    const encodedToken = encodeURIComponent(config.token);
    return `https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/ha-camera-proxy?url=${encodedUrl}&token=${encodedToken}`;
  }, [config.url, config.token]);

  // Send webhook to Home Assistant
  const sendWebhook = useCallback(async (eventData: {
    type: string;
    camera_name?: string;
    motion_level?: number;
    timestamp?: string;
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
        }),
      });

      if (response.ok) {
        console.log('Home Assistant webhook sent successfully');
        return true;
      } else {
        console.error('Home Assistant webhook failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Failed to send Home Assistant webhook:', error);
      return false;
    }
  }, [config.enabled, config.webhookId, config.url]);

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
  };
};
