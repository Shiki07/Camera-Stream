import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useConnectionStabilizer } from './useConnectionStabilizer';

export interface NetworkCameraConfig {
  url: string;
  type: 'rtsp' | 'mjpeg' | 'hls';
  username?: string;
  password?: string;
  name: string;
  quality?: 'high' | 'medium' | 'low';
}

export const useNetworkCamera = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<NetworkCameraConfig | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('disconnected');
  const videoRef = useRef<HTMLVideoElement | HTMLImageElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const stallCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const isActiveRef = useRef(false);
  const isConnectingRef = useRef(false);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const lastFrameTimeRef = useRef<number>(Date.now());
  const frameCountRef = useRef<number>(0);
  const configRef = useRef<NetworkCameraConfig | null>(null);

  const connectionStabilizer = useConnectionStabilizer({
    enabled: false,
    checkInterval: 30000,
    onConnectionLost: () => console.log('ConnectionStabilizer: Connection issues detected'),
    onConnectionRestored: () => {
      console.log('ConnectionStabilizer: Connection restored');
      setConnectionError(null);
    }
  });

  const isLocalNetwork = (url: string) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
      if (hostname.startsWith('192.168.')) return true;
      if (hostname.startsWith('10.')) return true;
      if (hostname.startsWith('172.')) {
        const parts = hostname.split('.');
        const second = parseInt(parts[1]);
        if (second >= 16 && second <= 31) return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const getProxiedUrl = useCallback(async (originalUrl: string) => {
    // Normalize to HTTP - Pi cameras only serve HTTP
    let normalizedUrl = originalUrl;
    if (normalizedUrl.startsWith('https://')) {
      normalizedUrl = normalizedUrl.replace('https://', 'http://');
    }
    
    const shouldUseProxy = normalizedUrl.startsWith('http://') && window.location.protocol === 'https:';
    
    if (shouldUseProxy) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required');
      
      const proxyUrl = new URL('https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/camera-proxy');
      proxyUrl.searchParams.set('url', normalizedUrl);
      return { url: proxyUrl.toString(), headers: {} };
    }
    return { url: normalizedUrl, headers: {} };
  }, []);

  const cleanupStream = useCallback(() => {
    console.log('useNetworkCamera: Cleaning up stream resources');
    isActiveRef.current = false;
    isConnectingRef.current = false;
    
    if (fetchControllerRef.current) {
      try { fetchControllerRef.current.abort(); } catch {}
      fetchControllerRef.current = null;
    }
    if (readerRef.current) {
      try { readerRef.current.cancel(); } catch {}
      readerRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatRef.current) {
      clearTimeout(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (stallCheckIntervalRef.current) {
      clearInterval(stallCheckIntervalRef.current);
      stallCheckIntervalRef.current = null;
    }
    
    if (videoRef.current && videoRef.current instanceof HTMLImageElement) {
      if (videoRef.current.src?.startsWith('blob:')) URL.revokeObjectURL(videoRef.current.src);
      videoRef.current.src = '';
    }
    
    frameCountRef.current = 0;
    lastFrameTimeRef.current = Date.now();
  }, []);

  // Seamless restart on stall - starts new connection without showing loading state
  const startOverlappingConnection = useCallback(async (imgElement: HTMLImageElement, config: NetworkCameraConfig) => {
    console.log('useNetworkCamera: Starting overlapping connection for seamless restart');
    
    let streamUrl = config.url;
    if (streamUrl.startsWith('https://')) {
      streamUrl = streamUrl.replace('https://', 'http://');
    }
    
    try {
      const { url: proxiedUrl } = await getProxiedUrl(streamUrl);
      
      // Abort old connection
      if (fetchControllerRef.current) {
        try { fetchControllerRef.current.abort(); } catch {}
      }
      if (readerRef.current) {
        try { readerRef.current.cancel(); } catch {}
        readerRef.current = null;
      }
      
      const controller = new AbortController();
      fetchControllerRef.current = controller;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication session required');
      
      const response = await fetch(proxiedUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Accept': 'multipart/x-mixed-replace, image/jpeg, */*',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        credentials: 'omit'
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get response reader');

      let buffer = new Uint8Array();
      const BASE_THROTTLE_MS = config.quality === 'low' ? 90 : config.quality === 'medium' ? 75 : 60;

      const processStream = async () => {
        while (isActiveRef.current) {
          const { done, value } = await reader.read();
          if (done) break;

          const newBuffer = new Uint8Array(buffer.length + value.length);
          newBuffer.set(buffer);
          newBuffer.set(value, buffer.length);
          buffer = newBuffer;

          let startIdx = -1, endIdx = -1;
          for (let i = 0; i < buffer.length - 1; i++) {
            if (buffer[i] === 0xff && buffer[i + 1] === 0xd8) { startIdx = i; break; }
          }
          if (startIdx !== -1) {
            for (let i = startIdx + 2; i < buffer.length - 1; i++) {
              if (buffer[i] === 0xff && buffer[i + 1] === 0xd9) { endIdx = i + 2; break; }
            }
          }

          if (startIdx !== -1 && endIdx !== -1) {
            const frameData = buffer.slice(startIdx, endIdx);
            const blob = new Blob([frameData], { type: 'image/jpeg' });

            if (imgElement.src?.startsWith('blob:')) URL.revokeObjectURL(imgElement.src);
            imgElement.src = URL.createObjectURL(blob);

            lastFrameTimeRef.current = Date.now();
            frameCountRef.current++;
            buffer = buffer.slice(endIdx);
          }

          if (buffer.length > 2 * 1024 * 1024) buffer = buffer.slice(-1024 * 1024);
        }
      };

      readerRef.current = reader;
      processStream().catch(console.error);
    } catch (error) {
      console.error('Overlapping connection failed:', error);
    }
  }, [getProxiedUrl]);

  const connectToMJPEGStream = useCallback(async (imgElement: HTMLImageElement, config: NetworkCameraConfig) => {
    const STALL_TIMEOUT_MS = 8000;
    const STALL_CHECK_INTERVAL_MS = 2000;
    
    try {
      let streamUrl = config.url;
      if (streamUrl.startsWith('https://')) {
        streamUrl = streamUrl.replace('https://', 'http://');
      }
      
      const { url: proxiedUrl } = await getProxiedUrl(streamUrl);
      
      if (stallCheckIntervalRef.current) {
        clearInterval(stallCheckIntervalRef.current);
        stallCheckIntervalRef.current = null;
      }
      if (fetchControllerRef.current) {
        try { fetchControllerRef.current.abort(); } catch {}
      }

      const controller = new AbortController();
      fetchControllerRef.current = controller;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication session required');
      
      const response = await fetch(proxiedUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Accept': 'multipart/x-mixed-replace, image/jpeg, */*',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        credentials: 'omit'
      });

      if (!response.ok) {
        let details = '';
        try { const data = await response.clone().json(); details = data?.error || JSON.stringify(data); } catch {}
        throw new Error(`HTTP ${response.status}: ${details || response.statusText}`);
      }

      const contentType = response.headers.get('content-type');

      if (contentType?.includes('multipart/x-mixed-replace')) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Failed to get response reader');

        let buffer = new Uint8Array();
        const BASE_THROTTLE_MS = config.quality === 'low' ? 90 : config.quality === 'medium' ? 75 : 60;
        
        // Initialize frame time tracking
        lastFrameTimeRef.current = Date.now();
        frameCountRef.current = 0;

        // Start stall detection interval
        stallCheckIntervalRef.current = setInterval(() => {
          const timeSinceLastFrame = Date.now() - lastFrameTimeRef.current;
          if (timeSinceLastFrame > STALL_TIMEOUT_MS && isActiveRef.current) {
            console.log(`useNetworkCamera: Stream stalled (${Math.round(timeSinceLastFrame / 1000)}s since last frame), restarting...`);
            
            // Abort the frozen connection
            try { fetchControllerRef.current?.abort(); } catch {}
            
            // Start a new overlapping connection immediately
            setTimeout(() => {
              if (isActiveRef.current && configRef.current) {
                startOverlappingConnection(imgElement, configRef.current);
              }
            }, 100);
          }
        }, STALL_CHECK_INTERVAL_MS);

        const processStream = async () => {
          let streamEnded = false;
          
          while (isActiveRef.current) {
            const { done, value } = await reader.read();
            if (done) {
              streamEnded = true;
              console.log('useNetworkCamera: Stream ended (done=true), will auto-reconnect');
              break;
            }

            const newBuffer = new Uint8Array(buffer.length + value.length);
            newBuffer.set(buffer);
            newBuffer.set(value, buffer.length);
            buffer = newBuffer;

            let startIdx = -1, endIdx = -1;
            for (let i = 0; i < buffer.length - 1; i++) {
              if (buffer[i] === 0xff && buffer[i + 1] === 0xd8) { startIdx = i; break; }
            }
            if (startIdx !== -1) {
              for (let i = startIdx + 2; i < buffer.length - 1; i++) {
                if (buffer[i] === 0xff && buffer[i + 1] === 0xd9) { endIdx = i + 2; break; }
              }
            }

            if (startIdx !== -1 && endIdx !== -1) {
              const now = Date.now();
              const frameData = buffer.slice(startIdx, endIdx);
              const blob = new Blob([frameData], { type: 'image/jpeg' });

              if (imgElement.src?.startsWith('blob:')) URL.revokeObjectURL(imgElement.src);
              imgElement.src = URL.createObjectURL(blob);

              frameCountRef.current++;
              lastFrameTimeRef.current = now;

              if (!isConnected) {
                setIsConnected(true);
                setConnectionError(null);
                setIsConnecting(false);
                setReconnectAttempts(0);
                setConnectionQuality('good');
              }
              
              buffer = buffer.slice(endIdx);
            }

            if (buffer.length > 2 * 1024 * 1024) buffer = buffer.slice(-1024 * 1024);
          }
          
          // Clean up stall detection
          if (stallCheckIntervalRef.current) {
            clearInterval(stallCheckIntervalRef.current);
            stallCheckIntervalRef.current = null;
          }
          
          // Auto-reconnect when stream ends gracefully
          if (streamEnded && isActiveRef.current && configRef.current) {
            console.log('useNetworkCamera: Auto-reconnecting after stream end...');
            setTimeout(() => {
              if (isActiveRef.current && configRef.current) {
                startOverlappingConnection(imgElement, configRef.current);
              }
            }, 500);
          }
        };

        readerRef.current = reader;
        processStream().catch(err => {
          console.error('Stream processing error:', err);
          // Clean up stall detection on error
          if (stallCheckIntervalRef.current) {
            clearInterval(stallCheckIntervalRef.current);
            stallCheckIntervalRef.current = null;
          }
          // Auto-reconnect on error too
          if (isActiveRef.current && configRef.current) {
            console.log('useNetworkCamera: Reconnecting after stream error...');
            setTimeout(() => {
              if (isActiveRef.current && configRef.current) {
                startOverlappingConnection(imgElement, configRef.current);
              }
            }, 1000);
          }
        });
      }
    } catch (error) {
      console.error('MJPEG connection failed:', error);
      setConnectionError('Camera connection failed');
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionQuality('disconnected');
    }
  }, [getProxiedUrl, isConnected, startOverlappingConnection]);

  const connectToCamera = useCallback(async (config: NetworkCameraConfig) => {
    cleanupStream();
    isActiveRef.current = true;
    isConnectingRef.current = true;
    setIsConnecting(true);
    setConnectionError(null);
    setCurrentConfig(config);
    configRef.current = config;

    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!videoRef.current) throw new Error('Video element not available');
    
    if (config.type === 'mjpeg' && videoRef.current instanceof HTMLImageElement) {
      connectToMJPEGStream(videoRef.current, config);
    }
  }, [cleanupStream, connectToMJPEGStream]);

  const disconnect = useCallback(() => {
    cleanupStream();
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionError(null);
    setCurrentConfig(null);
    setReconnectAttempts(0);
    setConnectionQuality('disconnected');
  }, [cleanupStream]);

  const forceReconnect = useCallback(() => {
    if (currentConfig) {
      disconnect();
      setTimeout(() => connectToCamera(currentConfig), 1000);
    }
  }, [currentConfig, disconnect, connectToCamera]);

  const testConnection = useCallback(async (config: NetworkCameraConfig): Promise<boolean> => {
    try {
      let testUrl = config.url;
      if (testUrl.startsWith('https://')) {
        testUrl = testUrl.replace('https://', 'http://');
      }
      
      const { url: proxiedUrl } = await getProxiedUrl(testUrl);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(proxiedUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }, [getProxiedUrl]);

  return {
    isConnecting, isConnected, connectionError, connectionQuality, currentConfig, reconnectAttempts,
    videoRef, streamRef,
    connectToCamera, disconnect, forceReconnect, testConnection
  };
};
