import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { encryptValue, decryptValue } from '@/utils/credentialEncryption';

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
const ENCRYPTED_TOKEN_KEY = 'homeassistant_encrypted_token';

// Check if a token is in legacy base64 format (simple obfuscation)
const isLegacyToken = (token: string): boolean => {
  try {
    // Legacy tokens are simple base64 of reversed string
    // They won't have the IV prefix that proper encrypted tokens have
    const decoded = atob(token);
    // Legacy tokens are just reversed strings, typically short
    // Encrypted tokens have 12-byte IV + encrypted data, making them longer
    return decoded.length < 50 && !token.includes('=') === false;
  } catch {
    return false;
  }
};

// Decrypt legacy token format
const decryptLegacyToken = (encrypted: string): string => {
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
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  // Load config from localStorage with proper decryption
  useEffect(() => {
    const loadConfig = async () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          let decryptedToken = '';
          
          // Check for new encrypted token format first
          const encryptedToken = localStorage.getItem(ENCRYPTED_TOKEN_KEY);
          if (encryptedToken) {
            decryptedToken = await decryptValue(encryptedToken);
          } else if (parsed.token) {
            // Handle legacy base64 obfuscation
            decryptedToken = decryptLegacyToken(parsed.token);
            
            // Migrate to proper encryption if we successfully decoded a legacy token
            if (decryptedToken) {
              const properlyEncrypted = await encryptValue(decryptedToken);
              localStorage.setItem(ENCRYPTED_TOKEN_KEY, properlyEncrypted);
              // Remove legacy token from config
              const newConfig = { ...parsed, token: '' };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
            }
          }
          
          setConfig({
            url: parsed.url || '',
            webhookId: parsed.webhookId || '',
            enabled: parsed.enabled || false,
            token: decryptedToken,
          });
        } catch (error) {
          console.error('Failed to parse Home Assistant config');
        }
      }
      setIsInitialized(true);
    };
    
    loadConfig();
  }, []);

  // Save config to localStorage with proper AES-256-GCM encryption
  const saveConfig = useCallback(async (newConfig: HomeAssistantConfig) => {
    try {
      // Encrypt token separately with proper encryption
      if (newConfig.token) {
        const encryptedToken = await encryptValue(newConfig.token);
        localStorage.setItem(ENCRYPTED_TOKEN_KEY, encryptedToken);
      } else {
        localStorage.removeItem(ENCRYPTED_TOKEN_KEY);
      }
      
      // Store config without the token (token is stored encrypted separately)
      const toStore = {
        url: newConfig.url,
        webhookId: newConfig.webhookId,
        enabled: newConfig.enabled,
        token: '', // Don't store token in main config
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      setConfig(newConfig);
    } catch (error) {
      console.error('Failed to save Home Assistant config:', error);
      toast({
        title: 'Error saving configuration',
        description: 'Failed to securely store your configuration',
        variant: 'destructive',
      });
    }
  }, [toast]);

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
