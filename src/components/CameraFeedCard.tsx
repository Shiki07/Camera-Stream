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
  Camera,
  Wifi,
  WifiOff,
  AlertTriangle
} from 'lucide-react';
import { NetworkCameraConfig } from '@/hooks/useNetworkCamera';
import { useImageMotionDetection } from '@/hooks/useImageMotionDetection';
import { useTabVisibility } from '@/hooks/useTabVisibility';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CameraFeedCardProps {
  cameraId: string;
  config: NetworkCameraConfig;
  index: number;
  isFocused: boolean;
  onFocus: (index: number | null) => void;
  onSettings: (index: number) => void;
  onRemove: (index: number) => void;
}

// Default settings for cameras
const DEFAULT_SETTINGS = {
  motion_enabled: false,
  motion_sensitivity: 70,
  motion_threshold: 0.5,
  quality: 'medium' as const,
  schedule_enabled: false,
  start_hour: 22,
  end_hour: 6,
  cooldown_period: 30,
  min_motion_duration: 500,
  noise_reduction: true,
  detection_zones_enabled: false,
};

export const CameraFeedCard = ({
  cameraId,
  config,
  index,
  isFocused,
  onFocus,
  onSettings,
  onRemove,
}: CameraFeedCardProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [motionDetected, setMotionDetected] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const isTabVisible = useTabVisibility();
  const fetchControllerRef = useRef<AbortController | null>(null);
  const isActiveRef = useRef(true);
  
  // Motion detection for this camera
  const imageMotionDetection = useImageMotionDetection({
    sensitivity: settings.motion_sensitivity,
    threshold: settings.motion_threshold,
    enabled: settings.motion_enabled && isConnected && isTabVisible,
    scheduleEnabled: settings.schedule_enabled,
    startHour: settings.start_hour,
    endHour: settings.end_hour,
    detectionZonesEnabled: settings.detection_zones_enabled,
    cooldownPeriod: settings.cooldown_period,
    minMotionDuration: settings.min_motion_duration,
    noiseReduction: settings.noise_reduction,
    onMotionDetected: () => setMotionDetected(true),
    onMotionCleared: () => setMotionDetected(false),
  });

  // Connect to MJPEG stream
  const connectToStream = useCallback(async () => {
    if (!imgRef.current) return;
    
    setIsConnecting(true);
    setError(null);
    isActiveRef.current = true;

    // Cancel previous connection
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    fetchControllerRef.current = new AbortController();

    try {
      // Get auth session for proxy
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      // Build proxy URL
      const proxyUrl = new URL('https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/camera-proxy');
      proxyUrl.searchParams.set('url', config.url);

      const response = await fetch(proxyUrl.toString(), {
        method: 'GET',
        signal: fetchControllerRef.current.signal,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Accept': 'multipart/x-mixed-replace, image/jpeg, */*',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get reader');

      setIsConnected(true);
      setIsConnecting(false);

      // Process MJPEG stream
      let buffer = new Uint8Array();
      
      while (isActiveRef.current) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append new data
        const newBuffer = new Uint8Array(buffer.length + value.length);
        newBuffer.set(buffer);
        newBuffer.set(value, buffer.length);
        buffer = newBuffer;

        // Find JPEG frames
        let startIdx = -1;
        let endIdx = -1;
        
        for (let i = 0; i < buffer.length - 1; i++) {
          if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8) {
            startIdx = i;
          } else if (buffer[i] === 0xFF && buffer[i + 1] === 0xD9 && startIdx !== -1) {
            endIdx = i + 2;
            break;
          }
        }

        if (startIdx !== -1 && endIdx !== -1) {
          const jpegData = buffer.slice(startIdx, endIdx);
          buffer = buffer.slice(endIdx);

          const blob = new Blob([jpegData], { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          
          if (imgRef.current) {
            const oldSrc = imgRef.current.src;
            imgRef.current.src = url;
            if (oldSrc.startsWith('blob:')) {
              URL.revokeObjectURL(oldSrc);
            }
          }
        }

        // Prevent buffer overflow
        if (buffer.length > 5 * 1024 * 1024) {
          buffer = new Uint8Array();
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Connection failed');
        setIsConnected(false);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [config.url]);

  // Connect on mount
  useEffect(() => {
    connectToStream();

    return () => {
      isActiveRef.current = false;
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
      imageMotionDetection.stopDetection();
    };
  }, [config.url]);

  // Start motion detection when connected
  useEffect(() => {
    if (isConnected && settings.motion_enabled && imgRef.current) {
      imageMotionDetection.startDetection(imgRef.current);
    } else {
      imageMotionDetection.stopDetection();
    }
  }, [isConnected, settings.motion_enabled]);

  const toggleMotion = useCallback(() => {
    setSettings(prev => ({ ...prev, motion_enabled: !prev.motion_enabled }));
  }, []);

  return (
    <Card className={cn(
      "relative overflow-hidden bg-card border-border transition-all duration-300",
      isFocused ? "col-span-full row-span-full" : "",
      motionDetected && "ring-2 ring-destructive"
    )}>
      {/* Camera Feed */}
      <div className="relative aspect-video bg-muted">
        {isConnecting ? (
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
              <Button size="sm" variant="outline" onClick={connectToStream}>
                Retry
              </Button>
            </div>
          </div>
        ) : null}
        
        <img
          ref={imgRef}
          className={cn(
            "w-full h-full object-contain",
            (isConnecting || error) && "opacity-0"
          )}
          alt={config.name}
        />

        {/* Overlays */}
        <div className="absolute top-2 left-2 flex gap-2">
          <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
            {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
          
          {settings.motion_enabled && (
            <Badge variant={motionDetected ? "destructive" : "secondary"} className="text-xs">
              {motionDetected ? <AlertTriangle className="h-3 w-3 mr-1" /> : <Video className="h-3 w-3 mr-1" />}
              {motionDetected ? 'Motion!' : 'Watching'}
            </Badge>
          )}
        </div>

        {/* Camera Name */}
        <div className="absolute bottom-2 left-2">
          <Badge variant="outline" className="bg-background/80 text-xs">
            {config.name}
          </Badge>
        </div>

        {/* Control Buttons */}
        <div className="absolute top-2 right-2 flex gap-1">
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

        {/* Quick Actions */}
        <div className="absolute bottom-2 right-2 flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 bg-background/50 hover:bg-background/80"
            onClick={toggleMotion}
          >
            {settings.motion_enabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 bg-background/50 hover:bg-background/80"
            disabled={!isConnected}
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
