import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Settings, 
  Maximize2, 
  Minimize2,
  Circle,
  Square,
  Camera,
  Wifi,
  WifiOff,
  AlertTriangle,
  HardDrive,
  Mail,
  Trash2,
  RefreshCw,
  Clock,
  Radio
} from 'lucide-react';
import { NetworkCameraConfig } from '@/hooks/useNetworkCamera';
import { useImageMotionDetection } from '@/hooks/useImageMotionDetection';
import { useEnhancedMotionDetection } from '@/hooks/useEnhancedMotionDetection';
import { useCameraRecording } from '@/hooks/useCameraRecording';
import { useRecording } from '@/hooks/useRecording';
import { useMotionNotification } from '@/hooks/useMotionNotification';
import { useTabVisibility } from '@/hooks/useTabVisibility';
import { useCameraInstanceSettings } from '@/hooks/useCameraInstanceSettings';
import { useAutoRelay } from '@/hooks/useAutoRelay';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CameraConfig extends NetworkCameraConfig {
  source: 'webcam' | 'network' | 'homeassistant';
  deviceId?: string;
  haEntityId?: string;
}

interface CameraFeedCardProps {
  cameraId: string;
  config: CameraConfig;
  index: number;
  isFocused: boolean;
  onFocus: (index: number | null) => void;
  onSettings: (index: number) => void;
  onRemove: (index: number) => void;
  isRemoteWebcam?: boolean;
  sourceDeviceName?: string;
  // Relay data for automatic webcam streaming
  relayRoomId?: string | null;
  relayActive?: boolean;
}

export const CameraFeedCard = ({
  cameraId,
  config,
  index,
  isFocused,
  onFocus,
  onSettings,
  onRemove,
  isRemoteWebcam = false,
  sourceDeviceName,
  relayRoomId,
  relayActive,
}: CameraFeedCardProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [motionDetected, setMotionDetected] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Live clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Use persisted settings from hook
  const { settings, updateSetting, isLoading: settingsLoading } = useCameraInstanceSettings(cameraId);
  
  // Keep a ref to settings so callbacks always have the latest values
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isTabVisible = useTabVisibility();
  const fetchControllerRef = useRef<AbortController | null>(null);
  const isActiveRef = useRef(true);
  const lastFrameTimeRef = useRef<number>(Date.now());
  const stallCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Anti-freeze improvements: track connection age and frame count for natural vs error detection
  const connectionAgeRef = useRef<number>(Date.now());
  const frameCountRef = useRef<number>(0);
  // Memory leak prevention: track and limit blob URLs
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const MAX_BLOB_URLS = 5;
  const { toast } = useToast();
  
  // Determine if webcam or network camera
  const isWebcam = config.source === 'webcam';
  
  // Auto-relay for webcams (local: push frames, remote: pull frames)
  const autoRelay = useAutoRelay({
    cameraId,
    isLocalWebcam: isWebcam && !isRemoteWebcam,
    relayRoomId,
    relayActive,
  });
  
  // Per-camera recording hooks
  const piRecording = useCameraRecording();
  const browserRecording = useRecording();
  
  // Motion notification
  const motionNotification = useMotionNotification({
    email: settings.notification_email,
    enabled: settings.email_notifications,
    includeAttachment: true,
  });
  
  // Helper to save motion thumbnail
  const saveMotionThumbnail = useCallback((eventId: string, element: HTMLVideoElement | HTMLImageElement) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(element, 0, 0, 160, 120);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        localStorage.setItem(`motion_thumbnail_${eventId}`, thumbnail);
      }
    } catch (e) {
      console.error('Failed to save thumbnail:', e);
    }
  }, []);

  // Motion detection for webcam (video element)
  const webcamMotionDetection = useEnhancedMotionDetection({
    sensitivity: settings.motion_sensitivity,
    threshold: settings.motion_threshold,
    enabled: settings.motion_enabled && isConnected && isTabVisible && isWebcam,
    scheduleEnabled: settings.schedule_enabled,
    startHour: settings.start_hour,
    endHour: settings.end_hour,
    detectionZonesEnabled: settings.detection_zones_enabled,
    cooldownPeriod: settings.cooldown_period,
    minMotionDuration: settings.min_motion_duration,
    noiseReduction: settings.noise_reduction,
    onMotionDetected: (motionLevel) => {
      setMotionDetected(true);
      // Generate event ID for thumbnail storage
      const eventId = `${cameraId}_${Date.now()}`;
      // Save thumbnail
      if (videoRef.current) {
        saveMotionThumbnail(eventId, videoRef.current);
      }
      // Send email notification - use ref for latest settings
      const currentSettings = settingsRef.current;
      if (currentSettings.email_notifications && videoRef.current) {
        console.log('Webcam motion detected, sending email notification');
        motionNotification.sendMotionAlert(videoRef.current, motionLevel);
      }
      // Auto-record on motion
      if (!browserRecording.isRecording && streamRef.current) {
        browserRecording.startRecording(streamRef.current, {
          storageType: 'local',
          fileType: 'video',
          quality: currentSettings.quality,
          motionDetected: true,
        });
      }
    },
    onMotionCleared: () => setMotionDetected(false),
  });
  
  // Motion detection for network camera (img element)
  const networkMotionDetection = useImageMotionDetection({
    sensitivity: settings.motion_sensitivity,
    threshold: settings.motion_threshold,
    enabled: settings.motion_enabled && isConnected && isTabVisible && !isWebcam,
    scheduleEnabled: settings.schedule_enabled,
    startHour: settings.start_hour,
    endHour: settings.end_hour,
    detectionZonesEnabled: settings.detection_zones_enabled,
    cooldownPeriod: settings.cooldown_period,
    minMotionDuration: settings.min_motion_duration,
    noiseReduction: settings.noise_reduction,
    onMotionDetected: (motionLevel) => {
      setMotionDetected(true);
      // Generate event ID for thumbnail storage
      const eventId = `${cameraId}_${Date.now()}`;
      // Save thumbnail
      if (imgRef.current) {
        saveMotionThumbnail(eventId, imgRef.current);
      }
      // Send email notification - use ref for latest settings
      const currentSettings = settingsRef.current;
      if (currentSettings.email_notifications && imgRef.current) {
        console.log('Network camera motion detected, sending email notification');
        motionNotification.sendMotionAlert(undefined, motionLevel, imgRef.current);
      }
      // Auto-record on motion (Pi-based)
      if (piRecording.piServiceConnected && !piRecording.isRecording) {
        handleStartPiRecording(true);
      }
    },
    onMotionCleared: () => setMotionDetected(false),
  });

  // Connect to webcam
  const connectToWebcam = useCallback(async () => {
    if (!config.deviceId) return;
    
    setIsConnecting(true);
    setError(null);
    isActiveRef.current = true;

    // Clean up any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    try {
      // First try with exact deviceId
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: config.deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: true,
        });
      } catch (exactErr) {
        // If exact deviceId fails (stale after browser restart), try with ideal preference
        console.log('Exact deviceId failed, trying with ideal preference:', exactErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { ideal: config.deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: true,
        });
      }

      if (!isActiveRef.current) {
        // Component unmounted during async operation
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Listen for track ended events (e.g., user revokes permission)
        stream.getVideoTracks().forEach(track => {
          track.onended = () => {
            console.log('Webcam track ended, attempting reconnect...');
            if (isActiveRef.current) {
              setIsConnected(false);
              setError('Webcam disconnected');
            }
          };
        });
        
        setIsConnected(true);
        console.log(`Webcam connected: ${config.name}`);
        
        // Auto-start relay for local webcam
        if (videoRef.current && !isRemoteWebcam) {
          autoRelay.startRelay(videoRef.current);
        }
      }
    } catch (err) {
      console.error('Webcam connection failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to access webcam');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [config.deviceId, config.name]);

  // Connect to MJPEG network stream
  const connectToNetworkStream = useCallback(async () => {
    if (!imgRef.current) return;
    
    const STALL_TIMEOUT_MS = 8000;
    const STALL_CHECK_INTERVAL_MS = 2000;
    
    setIsConnecting(true);
    setError(null);
    isActiveRef.current = true;
    lastFrameTimeRef.current = Date.now();
    connectionAgeRef.current = Date.now();
    frameCountRef.current = 0;

    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    if (stallCheckIntervalRef.current) {
      clearInterval(stallCheckIntervalRef.current);
      stallCheckIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    fetchControllerRef.current = new AbortController();

    try {
      const safeDecode = (value: string) => {
        let out = value;
        for (let i = 0; i < 3; i++) {
          try {
            const next = decodeURIComponent(out);
            if (next === out) return out;
            out = next;
          } catch {
            return out;
          }
        }
        return out;
      };

      // Decide how to route the request:
      // - ha-camera-proxy is public (verify_jwt=false) and already contains the HA token in query params
      // - camera-proxy requires a valid Supabase JWT (Authorization header)
      // - Some legacy saved configs may have ha-camera-proxy wrapped inside camera-proxy; unwrap it.
      let streamUrl: string;
      let headers: HeadersInit;
      let shouldTestPi = true;
      let requiresSupabaseJwt = false;
      let isHomeAssistant = false;

      let parsedUrl: URL | null = null;
      try {
        parsedUrl = new URL(config.url);
      } catch {
        parsedUrl = null;
      }

      const isSupabaseEdgeFunctionUrl =
        !!parsedUrl && parsedUrl.hostname.endsWith('supabase.co') && parsedUrl.pathname.includes('/functions/v1/');
      const functionName = isSupabaseEdgeFunctionUrl
        ? parsedUrl!.pathname.split('/functions/v1/')[1]?.split('/')[0]
        : null;

      if (functionName === 'ha-camera-proxy') {
        streamUrl = config.url;
        headers = {
          Accept: 'multipart/x-mixed-replace, image/jpeg, */*',
        };
        shouldTestPi = false;
        isHomeAssistant = true;
        console.log('CameraFeedCard: Using ha-camera-proxy with fetch-based MJPEG parsing');
      } else if (functionName === 'camera-proxy') {
        const inner = parsedUrl?.searchParams.get('url') || '';
        const decodedInner = inner ? safeDecode(inner) : '';

        if (decodedInner.includes('/functions/v1/ha-camera-proxy')) {
          streamUrl = decodedInner;
          headers = {
            Accept: 'multipart/x-mixed-replace, image/jpeg, */*',
          };
          shouldTestPi = false;
          isHomeAssistant = true;
          console.log('CameraFeedCard: Unwrapped ha-camera-proxy from camera-proxy');
        } else {
          streamUrl = config.url;
          headers = {
            Accept: 'multipart/x-mixed-replace, image/jpeg, */*',
          };
          requiresSupabaseJwt = true;
          console.log('CameraFeedCard: Using camera-proxy directly');
        }
      } else {
        const proxyUrl = new URL('https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/camera-proxy');
        proxyUrl.searchParams.set('url', config.url);
        streamUrl = proxyUrl.toString();
        headers = {
          Accept: 'multipart/x-mixed-replace, image/jpeg, */*',
        };
        requiresSupabaseJwt = true;
      }

      // Auto-reconnect ALL network cameras when stream ends (proxy timeout, server restart, etc.)
      const shouldAutoReconnect = true;

      // Only fetch session if we truly need a Supabase JWT (camera-proxy)
      if (requiresSupabaseJwt) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Authentication required');
        }
        headers = {
          ...headers,
          Authorization: `Bearer ${session.access_token}`,
        };
      }

      const response = await fetch(streamUrl, {
        method: 'GET',
        signal: fetchControllerRef.current.signal,
        headers,
      });

      if (!response.ok) {
        let details = '';
        try {
          details = await response.clone().text();
        } catch {
          // ignore
        }
        throw new Error(`HTTP ${response.status}${details ? `: ${details}` : ''}`);
      }

      const contentType = response.headers.get('content-type') ?? '';

      // Some HA camera integrations only provide a JPEG snapshot (not MJPEG).
      // In that case, render the snapshot and poll to simulate a "live" feed.
      if (contentType.includes('image/jpeg') && !contentType.includes('multipart')) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);

        if (imgRef.current) {
          const oldSrc = imgRef.current.src;
          imgRef.current.src = url;
          if (oldSrc.startsWith('blob:')) {
            URL.revokeObjectURL(oldSrc);
          }
        }

        setIsConnected(true);
        setIsConnecting(false);

        // Test Pi service connection (only for non-HA cameras)
        if (shouldTestPi) {
          piRecording.testPiConnection(config.url);
        }

        if (shouldAutoReconnect && isActiveRef.current) {
          setTimeout(() => {
            if (isActiveRef.current) {
              connectToNetworkStream();
            }
          }, 2000);
        }

        return;
      }

      if (!contentType.includes('multipart') && !contentType.includes('image/jpeg')) {
        throw new Error(`Unsupported stream content-type: ${contentType || 'unknown'}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get reader');

      setIsConnected(true);
      setIsConnecting(false);

      // Test Pi service connection (only for non-HA cameras)
      if (shouldTestPi) {
        piRecording.testPiConnection(config.url);
      }

      // Process MJPEG stream
      let buffer = new Uint8Array();
      let frameCount = 0;
      let streamEnded = false;
      
      // Initialize frame time tracking
      lastFrameTimeRef.current = Date.now();
      
      // Start stall detection interval
      stallCheckIntervalRef.current = setInterval(() => {
        const timeSinceLastFrame = Date.now() - lastFrameTimeRef.current;
        if (timeSinceLastFrame > STALL_TIMEOUT_MS && isActiveRef.current) {
          console.log(`CameraFeedCard: Stream stalled for ${config.name} (${Math.round(timeSinceLastFrame / 1000)}s since last frame), restarting...`);
          
          // Abort the frozen connection
          try { fetchControllerRef.current?.abort(); } catch {}
          
          // Clear the interval to prevent multiple reconnects
          if (stallCheckIntervalRef.current) {
            clearInterval(stallCheckIntervalRef.current);
            stallCheckIntervalRef.current = null;
          }
          
          // Start a new connection immediately
          setIsConnected(false);
          setIsConnecting(true);
          setTimeout(() => {
            if (isActiveRef.current) {
              connectToNetworkStream();
            }
          }, 100);
        }
      }, STALL_CHECK_INTERVAL_MS);

      while (isActiveRef.current) {
        const { done, value } = await reader.read();
        if (done) {
          streamEnded = true;
          console.log(`CameraFeedCard: Stream ended gracefully for ${config.name}`);
          break;
        }

        const newBuffer = new Uint8Array(buffer.length + value.length);
        newBuffer.set(buffer);
        newBuffer.set(value, buffer.length);
        buffer = newBuffer;

        // Extract all complete JPEG frames from buffer
        let framesExtracted = 0;
        while (framesExtracted < 10) {
          let startIdx = -1;
          let endIdx = -1;

          // Find JPEG start marker (0xFF 0xD8)
          for (let i = 0; i < buffer.length - 1; i++) {
            if (buffer[i] === 0xff && buffer[i + 1] === 0xd8) {
              startIdx = i;
              break;
            }
          }

          if (startIdx === -1) break;

          // Find JPEG end marker (0xFF 0xD9) after start
          for (let i = startIdx + 2; i < buffer.length - 1; i++) {
            if (buffer[i] === 0xff && buffer[i + 1] === 0xd9) {
              endIdx = i + 2;
              break;
            }
          }

          if (endIdx === -1) break;

          // Extract and display the frame
          const jpegData = buffer.slice(startIdx, endIdx);
          buffer = buffer.slice(endIdx);
          framesExtracted++;
          frameCount++;
          frameCountRef.current = frameCount;

          const blob = new Blob([jpegData], { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);

          if (imgRef.current) {
            const oldSrc = imgRef.current.src;
            imgRef.current.src = url;
            // Revoke old blob URL and remove from tracking set
            if (oldSrc.startsWith('blob:')) {
              URL.revokeObjectURL(oldSrc);
              blobUrlsRef.current.delete(oldSrc);
            }
          }
          
          // Track blob URL and limit memory usage
          blobUrlsRef.current.add(url);
          if (blobUrlsRef.current.size > MAX_BLOB_URLS) {
            const oldestUrl = blobUrlsRef.current.values().next().value;
            if (oldestUrl) {
              URL.revokeObjectURL(oldestUrl);
              blobUrlsRef.current.delete(oldestUrl);
            }
          }

          // Update last frame time for stall detection
          lastFrameTimeRef.current = Date.now();

          // Log first frame to confirm stream is working
          if (frameCount === 1) {
            console.log(
              `CameraFeedCard: First frame received for ${config.name}, size: ${jpegData.length} bytes`
            );
          }
        }

        // Prevent buffer from growing too large
        if (buffer.length > 5 * 1024 * 1024) {
          console.warn(`CameraFeedCard: Buffer overflow for ${config.name}, resetting`);
          buffer = new Uint8Array();
        }
      }
      
      // Clean up stall detection interval
      if (stallCheckIntervalRef.current) {
        clearInterval(stallCheckIntervalRef.current);
        stallCheckIntervalRef.current = null;
      }

      // Distinguish natural MJPEG cycles from actual connection errors
      if (streamEnded && isActiveRef.current && shouldAutoReconnect) {
        const connectionAge = Date.now() - connectionAgeRef.current;
        const framesProcessed = frameCountRef.current;
        
        if (connectionAge < 10000 && framesProcessed < 5) {
          // Short-lived connection with few frames = actual error, use exponential backoff
          console.log(`CameraFeedCard: Connection error detected for ${config.name} (age: ${connectionAge}ms, frames: ${framesProcessed}), reconnecting with delay...`);
          setIsConnected(false);
          setIsConnecting(true);
          const delay = Math.min(3000 * Math.max(1, Math.floor(connectionAge / 1000)), 10000);
          setTimeout(() => {
            if (isActiveRef.current) {
              connectToNetworkStream();
            }
          }, delay);
        } else {
          // Natural stream cycle (long-running, many frames) = immediate seamless restart
          console.log(`CameraFeedCard: Natural stream cycle for ${config.name} (age: ${connectionAge}ms, frames: ${framesProcessed}), immediate restart...`);
          setIsConnected(false);
          setIsConnecting(true);
          setTimeout(() => {
            if (isActiveRef.current) {
              connectToNetworkStream();
            }
          }, 100);
        }
      }
    } catch (err) {
      const e = err as Error;

      // Clean up stall detection on error
      if (stallCheckIntervalRef.current) {
        clearInterval(stallCheckIntervalRef.current);
        stallCheckIntervalRef.current = null;
      }

      // Abort errors are expected (we abort to restart on stall / on unmount)
      // Don't set isConnecting=false here - the stall detection or unmount will handle state
      if (e?.name === 'AbortError') {
        setIsConnected(false);
        // Don't set isConnecting(false) - let the reconnect logic handle it
        return;
      }

      console.error(`CameraFeedCard: Connection error for ${config.name}:`, e.message);
      setError(e instanceof Error ? e.message : 'Connection failed');
      setIsConnected(false);

      // Ensure we only have one pending reconnect timer
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (isActiveRef.current) {
        setIsConnecting(true);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isActiveRef.current) {
            connectToNetworkStream();
          }
        }, 300);
      } else {
        setIsConnecting(false);
      }
    } finally {
      // keep existing state handling (connectToNetworkStream sets isConnecting=false on success)
      if (!isActiveRef.current) setIsConnecting(false);
    }
  }, [config.url, config.name, piRecording]);

  // Track connection state with refs for auth callback
  const isConnectedRef = useRef(isConnected);
  const isConnectingRef = useRef(isConnecting);
  
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);
  
  useEffect(() => {
    isConnectingRef.current = isConnecting;
  }, [isConnecting]);

  // Connect on mount and when auth state changes
  useEffect(() => {
    let authSubscription: { unsubscribe: () => void } | null = null;
    
    // Don't try to connect to remote webcams - they're on another device
    if (isRemoteWebcam) {
      setIsConnecting(false);
      setIsConnected(false);
      return;
    }
    
    const connect = () => {
      if (isWebcam) {
        connectToWebcam();
      } else {
        connectToNetworkStream();
      }
    };

    // Initial connection
    connect();
    
     // Listen for auth state changes to reconnect after login / stop on logout
     const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
       // IMPORTANT: keep this callback synchronous (no Supabase calls) to avoid auth deadlocks
       if (event === 'SIGNED_OUT') {
         console.log('Auth state changed to SIGNED_OUT, stopping camera stream');
         isActiveRef.current = false;
         isConnectedRef.current = false;
         isConnectingRef.current = false;

         try {
           fetchControllerRef.current?.abort();
         } catch {
           // ignore
         }

         setIsConnected(false);
         setIsConnecting(false);
         setError(null);
         return;
       }

       // Use refs to get current state values, not stale closure values
       if (event === 'SIGNED_IN' && session && !isConnectedRef.current && !isConnectingRef.current) {
         console.log('Auth state changed to SIGNED_IN, reconnecting camera...');
         // Delay to ensure session is fully propagated
         setTimeout(() => {
           if (!isConnectedRef.current && !isConnectingRef.current) {
             connect();
           }
         }, 500);
       }
     });
    authSubscription = subscription;

    return () => {
      isActiveRef.current = false;
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (stallCheckIntervalRef.current) {
        clearInterval(stallCheckIntervalRef.current);
        stallCheckIntervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      // Clean up all tracked blob URLs to prevent memory leaks
      blobUrlsRef.current.forEach(url => {
        try { URL.revokeObjectURL(url); } catch {}
      });
      blobUrlsRef.current.clear();
      frameCountRef.current = 0;
      connectionAgeRef.current = Date.now();
      
      webcamMotionDetection.stopDetection();
      networkMotionDetection.stopDetection();
      authSubscription?.unsubscribe();
    };
  }, [config.url, config.deviceId, isWebcam, isRemoteWebcam]);

  // Auto-reconnect when disconnected
  useEffect(() => {
    if (isConnected || isConnecting) return;
    
    // Only auto-reconnect if there was an error (not initial state)
    if (!error) return;
    
    const reconnectInterval = setInterval(() => {
      if (!isConnected && !isConnecting && isTabVisible) {
        console.log(`Auto-reconnecting camera: ${config.name}`);
        if (isWebcam) {
          connectToWebcam();
        } else {
          connectToNetworkStream();
        }
      }
    }, 15000); // Try every 15 seconds

    return () => clearInterval(reconnectInterval);
  }, [isConnected, isConnecting, error, isTabVisible, isWebcam, config.name, connectToWebcam, connectToNetworkStream]);

  // Start motion detection when connected
  useEffect(() => {
    if (isConnected && settings.motion_enabled) {
      if (isWebcam && videoRef.current) {
        webcamMotionDetection.startDetection(videoRef.current);
      } else if (!isWebcam && imgRef.current) {
        networkMotionDetection.startDetection(imgRef.current);
      }
    } else {
      webcamMotionDetection.stopDetection();
      networkMotionDetection.stopDetection();
    }
  }, [isConnected, settings.motion_enabled, isWebcam]);

  const toggleMotion = useCallback(() => {
    updateSetting('motion_enabled', !settings.motion_enabled);
  }, [settings.motion_enabled, updateSetting]);

  // Pi Recording handlers
  const handleStartPiRecording = useCallback(async (motionTriggered = false) => {
    const result = await piRecording.startRecording({
      cameraUrl: config.url,
      cameraName: config.name,
      quality: settings.quality,
      motionTriggered,
      videoPath: settings.video_path,
    });

    if (result) {
      toast({ title: "Recording started", description: `Recording ${config.name} to Pi` });
    } else if (piRecording.error) {
      toast({ title: "Recording failed", description: piRecording.error, variant: "destructive" });
    }
  }, [config, settings, piRecording, toast]);

  const handleStopPiRecording = useCallback(async () => {
    const result = await piRecording.stopRecording(config.url);
    if (result) {
      toast({ title: "Recording saved", description: `Saved ${result.filename}` });
    }
  }, [config.url, piRecording, toast]);

  // Browser recording handlers
  const handleStartBrowserRecording = useCallback(() => {
    if (!streamRef.current) return;
    browserRecording.startRecording(streamRef.current, {
      storageType: 'local',
      fileType: 'video',
      quality: settings.quality,
      motionDetected: false,
    });
  }, [browserRecording, settings]);

  const handleStopBrowserRecording = useCallback(() => {
    browserRecording.stopRecording();
  }, [browserRecording]);

  // Recording toggle
  const handleRecordingToggle = useCallback(() => {
    if (isWebcam) {
      if (browserRecording.isRecording) {
        handleStopBrowserRecording();
      } else {
        handleStartBrowserRecording();
      }
    } else {
      if (piRecording.isRecording) {
        handleStopPiRecording();
      } else {
        handleStartPiRecording(false);
      }
    }
  }, [isWebcam, browserRecording.isRecording, piRecording.isRecording]);

  // Snapshot handler
  const handleSnapshot = useCallback(async () => {
    const element = isWebcam ? videoRef.current : imgRef.current;
    if (!element) return;

    try {
    await browserRecording.takeSnapshot(element, {
      storageType: 'local',
      fileType: 'image',
      quality: settings.quality,
      motionDetected: false,
    });
      toast({ title: "Snapshot saved", description: "Image downloaded successfully" });
    } catch {
      toast({ title: "Snapshot failed", description: "Could not capture image", variant: "destructive" });
    }
  }, [isWebcam, browserRecording, settings, toast]);

  const isRecording = isWebcam ? browserRecording.isRecording : piRecording.isRecording;
  const isProcessing = isWebcam ? browserRecording.isProcessing : piRecording.isProcessing;
  const recordingDuration = isWebcam ? browserRecording.recordingDuration : piRecording.recordingDuration;
  const formatDuration = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <Card className={cn(
      "relative overflow-hidden bg-card border-border transition-all duration-300",
      isFocused ? "col-span-full row-span-full" : "",
      motionDetected && "ring-2 ring-destructive",
      isRecording && "ring-2 ring-red-500"
    )}>
      <div className="relative aspect-video bg-muted">
        {/* Remote webcam - show relay feed if available, otherwise show message */}
        {isRemoteWebcam ? (
          relayActive && autoRelay.remoteFrameUrl ? (
            // Show relay feed from remote device
            <img
              src={autoRelay.remoteFrameUrl}
              className="w-full h-full object-cover"
              alt={config.name}
            />
          ) : (
            // No active relay - show waiting message
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-center p-4">
                <div className="p-3 bg-muted-foreground/10 rounded-full">
                  <Camera className="h-10 w-10 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Webcam on {sourceDeviceName || 'another device'}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Waiting for device to come online...
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  <Radio className="h-3 w-3 mr-1" />
                  Auto-sync enabled
                </Badge>
              </div>
            </div>
          )
        ) : isConnecting ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              <span className="text-sm text-muted-foreground">Connecting...</span>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center p-4">
              <WifiOff className="h-8 w-8 text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
              <Button size="sm" variant="outline" onClick={isWebcam ? connectToWebcam : connectToNetworkStream}>
                Retry
              </Button>
            </div>
          </div>
        ) : null}
        
        {/* Video element for webcam */}
        {isWebcam && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn("absolute inset-0 w-full h-full object-cover", (isConnecting || error) && "opacity-0")}
          />
        )}
        
        {/* Image element for network camera */}
        {!isWebcam && (
          <img
            ref={imgRef}
            className={cn("w-full h-full object-cover", (isConnecting || error) && "opacity-0")}
            alt={config.name}
          />
        )}

        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {/* For remote webcams, show relay status instead of connection status */}
          {isRemoteWebcam ? (
            <Badge 
              variant={autoRelay.remoteFrameUrl ? "default" : "secondary"} 
              className={cn("text-xs", autoRelay.remoteFrameUrl && "bg-green-500/80")}
            >
              <Radio className={cn("h-3 w-3 mr-1", autoRelay.remoteFrameUrl && "animate-pulse")} />
              {autoRelay.remoteFrameUrl ? 'Relay Live' : 'Relay'}
            </Badge>
          ) : (
            <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
              {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {isConnected ? 'Live' : 'Offline'}
            </Badge>
          )}
          
          {/* Auto-reconnect indicator - only for non-remote cameras */}
          {!isRemoteWebcam && !isConnected && !isConnecting && error && isTabVisible && (
            <Badge variant="outline" className="text-xs bg-amber-500/20 border-amber-500/50 text-amber-200">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Auto-retry
            </Badge>
          )}
          
          {!isWebcam && piRecording.piServiceConnected !== null && (
            <Badge variant={piRecording.piServiceConnected ? "secondary" : "outline"} className="text-xs">
              <HardDrive className="h-3 w-3 mr-1" />
              {piRecording.piServiceConnected ? 'Pi Ready' : 'Pi Offline'}
            </Badge>
          )}
          
          {settings.motion_enabled && (
            <Badge variant={motionDetected ? "destructive" : "secondary"} className="text-xs">
              {motionDetected ? <AlertTriangle className="h-3 w-3 mr-1" /> : <Video className="h-3 w-3 mr-1" />}
              {motionDetected ? 'Motion!' : 'Watching'}
            </Badge>
          )}
          
          {settings.email_notifications && (
            <Badge variant="outline" className="text-xs">
              <Mail className="h-3 w-3 mr-1" />
              Alerts On
            </Badge>
          )}
          
          {/* Auto-relay status for local webcams */}
          {isWebcam && !isRemoteWebcam && autoRelay.isRelaying && (
            <Badge variant="secondary" className="text-xs bg-green-500/20 border-green-500/50 text-green-200">
              <Radio className="h-3 w-3 mr-1 animate-pulse" />
              Syncing
            </Badge>
          )}
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2">
            <Badge variant="destructive" className="text-xs animate-pulse">
              <Circle className="h-3 w-3 mr-1 fill-current" />
              REC {formatDuration(recordingDuration)}
            </Badge>
          </div>
        )}

        {/* Camera Name & Source */}
        <div className="absolute bottom-2 left-2 flex gap-1">
          <Badge variant="outline" className="bg-background/80 text-xs">
            {config.name}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {isWebcam ? 'Webcam' : 'Network'}
          </Badge>
        </div>

        {/* Live Clock */}
        {isConnected && (
          <div className="absolute bottom-12 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-mono flex items-center gap-1.5 backdrop-blur-sm">
            <Clock className="w-3 h-3" />
            <span>{currentTime.toLocaleDateString()}</span>
            <span className="text-green-400">{currentTime.toLocaleTimeString()}</span>
          </div>
        )}

        {/* Control Buttons - Top Right */}
        <div className="absolute top-2 right-2 flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 bg-background/50 hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => onRemove(index)}
            title="Remove camera"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 bg-background/50 hover:bg-background/80"
            onClick={() => onFocus(isFocused ? null : index)}
          >
            {isFocused ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 bg-background/50 hover:bg-background/80"
            onClick={() => onSettings(index)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Actions - Bottom Right */}
        <div className="absolute bottom-2 right-2 flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 bg-background/50 hover:bg-background/80"
            onClick={toggleMotion}
            title={settings.motion_enabled ? 'Disable motion detection' : 'Enable motion detection'}
          >
            {settings.motion_enabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>
          
          <Button
            size="icon"
            variant={isRecording ? "destructive" : "ghost"}
            className={cn("h-7 w-7", !isRecording && "bg-background/50 hover:bg-background/80")}
            onClick={handleRecordingToggle}
            disabled={!isConnected || isProcessing}
            title={isRecording ? 'Stop recording' : (piRecording.piServiceConnected === false ? 'Pi service offline - click to retry' : 'Start recording')}
          >
            {isProcessing ? (
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            ) : isRecording ? (
              <Square className="h-4 w-4 fill-current" />
            ) : (
              <Circle className="h-4 w-4 fill-red-500 text-red-500" />
            )}
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 bg-background/50 hover:bg-background/80"
            onClick={handleSnapshot}
            disabled={!isConnected || browserRecording.isProcessing}
            title="Take snapshot"
          >
            <Camera className="h-4 w-4" />
          </Button>
          
        </div>
      </div>
    </Card>
  );
};
