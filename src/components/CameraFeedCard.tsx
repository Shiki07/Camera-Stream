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
  Download,
  Mail
} from 'lucide-react';
import { NetworkCameraConfig } from '@/hooks/useNetworkCamera';
import { useImageMotionDetection } from '@/hooks/useImageMotionDetection';
import { useEnhancedMotionDetection } from '@/hooks/useEnhancedMotionDetection';
import { useCameraRecording } from '@/hooks/useCameraRecording';
import { useRecording } from '@/hooks/useRecording';
import { useMotionNotification } from '@/hooks/useMotionNotification';
import { useTabVisibility } from '@/hooks/useTabVisibility';
import { useCameraInstanceSettings } from '@/hooks/useCameraInstanceSettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CameraConfig extends NetworkCameraConfig {
  source: 'webcam' | 'network';
  deviceId?: string;
}

interface CameraFeedCardProps {
  cameraId: string;
  config: CameraConfig;
  index: number;
  isFocused: boolean;
  onFocus: (index: number | null) => void;
  onSettings: (index: number) => void;
  onRemove: (index: number) => void;
}

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
  
  // Use persisted settings from hook
  const { settings, updateSetting, isLoading: settingsLoading } = useCameraInstanceSettings(cameraId);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isTabVisible = useTabVisibility();
  const fetchControllerRef = useRef<AbortController | null>(null);
  const isActiveRef = useRef(true);
  const { toast } = useToast();
  
  // Determine if webcam or network camera
  const isWebcam = config.source === 'webcam';
  
  // Per-camera recording hooks
  const piRecording = useCameraRecording();
  const browserRecording = useRecording();
  
  // Motion notification
  const motionNotification = useMotionNotification({
    email: settings.notification_email,
    enabled: settings.email_notifications,
    includeAttachment: true,
  });
  
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
      // Send email notification
      if (settings.email_notifications && videoRef.current) {
        motionNotification.sendMotionAlert(videoRef.current, motionLevel);
      }
      // Auto-record on motion
      if (!browserRecording.isRecording && streamRef.current) {
        browserRecording.startRecording(streamRef.current, {
          storageType: settings.storage_type,
          fileType: 'video',
          quality: settings.quality,
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
      // Send email notification
      if (settings.email_notifications && imgRef.current) {
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

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: config.deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsConnected(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access webcam');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [config.deviceId]);

  // Connect to MJPEG network stream
  const connectToNetworkStream = useCallback(async () => {
    if (!imgRef.current) return;
    
    setIsConnecting(true);
    setError(null);
    isActiveRef.current = true;

    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    fetchControllerRef.current = new AbortController();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

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
      
      // Test Pi service connection
      piRecording.testPiConnection(config.url);

      // Process MJPEG stream
      let buffer = new Uint8Array();
      
      while (isActiveRef.current) {
        const { done, value } = await reader.read();
        if (done) break;

        const newBuffer = new Uint8Array(buffer.length + value.length);
        newBuffer.set(buffer);
        newBuffer.set(value, buffer.length);
        buffer = newBuffer;

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
  }, [config.url, piRecording]);

  // Connect on mount
  useEffect(() => {
    if (isWebcam) {
      connectToWebcam();
    } else {
      connectToNetworkStream();
    }

    return () => {
      isActiveRef.current = false;
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      webcamMotionDetection.stopDetection();
      networkMotionDetection.stopDetection();
    };
  }, [config.url, config.deviceId, isWebcam]);

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
      storageType: settings.storage_type,
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
        storageType: settings.storage_type,
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
            className={cn("w-full h-full object-contain", (isConnecting || error) && "opacity-0")}
          />
        )}
        
        {/* Image element for network camera */}
        {!isWebcam && (
          <img
            ref={imgRef}
            className={cn("w-full h-full object-contain", (isConnecting || error) && "opacity-0")}
            alt={config.name}
          />
        )}

        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
            {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
          
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

        {/* Control Buttons - Top Right */}
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
            disabled={!isConnected || isProcessing || (!isWebcam && !piRecording.piServiceConnected)}
            title={isRecording ? 'Stop recording' : 'Start recording'}
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
          
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 bg-background/50 hover:bg-background/80"
            onClick={handleSnapshot}
            disabled={!isConnected}
            title="Download snapshot"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
