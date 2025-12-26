import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRelayStream, RelayStreamSource } from '@/hooks/useRelayStream';
import { useEncryptedCameras } from '@/hooks/useEncryptedCameras';
import { 
  Video, 
  Users, 
  Copy, 
  Check, 
  Radio, 
  Eye,
  X,
  RefreshCw,
  Wifi,
  WifiOff,
  Camera,
  MonitorPlay,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export const WebRTCStreamPanel: React.FC = () => {
  const {
    isHosting,
    isViewing,
    roomId,
    localStream,
    remoteFrameUrl,
    availableRooms,
    selectedSource,
    streamStatus,
    startHosting,
    joinStream,
    stopStream,
    refreshAvailableRooms,
    videoRef,
  } = useRelayStream();

  const { cameras, isLoading: camerasLoading } = useEncryptedCameras();

  const [joinRoomId, setJoinRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState<string>('webcam');

  const localPreviewRef = useRef<HTMLVideoElement>(null);

  // Attach local stream to preview video
  useEffect(() => {
    if (localPreviewRef.current && localStream) {
      localPreviewRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleStartHosting = async () => {
    setIsStarting(true);
    try {
      if (selectedCameraIndex === 'webcam') {
        const source: RelayStreamSource = {
          type: 'webcam',
          name: 'Local Webcam',
        };
        await startHosting(source);
      } else {
        const cameraIdx = parseInt(selectedCameraIndex, 10);
        const camera = cameras[cameraIdx];
        
        if (!camera) {
          toast.error('Camera not found');
          return;
        }

        // For network cameras, create an image element to capture from
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        
        // Build the proxy URL for the camera
        const proxyUrl = `https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/camera-proxy?url=${encodeURIComponent(camera.url)}`;
        img.src = proxyUrl;

        // Wait for image to load
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load camera feed'));
          setTimeout(() => reject(new Error('Camera connection timeout')), 10000);
        });

        // Keep refreshing the image for MJPEG
        const refreshImg = () => {
          if (isHosting) {
            img.src = proxyUrl + '&t=' + Date.now();
          }
        };
        setInterval(refreshImg, 200);

        const source: RelayStreamSource = {
          type: 'network-camera',
          name: camera.name || 'Network Camera',
          imageElement: img,
        };

        await startHosting(source);
      }
    } catch (error) {
      console.error('Failed to start hosting:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start stream');
    } finally {
      setIsStarting(false);
    }
  };

  const handleJoinStream = () => {
    if (!joinRoomId.trim()) {
      toast.error('Please enter a Room ID');
      return;
    }
    joinStream(joinRoomId.trim());
  };

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      toast.success('Room ID copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = () => {
    switch (streamStatus) {
      case 'connecting':
        return <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Connecting</Badge>;
      case 'streaming':
        return <Badge variant="default" className="bg-green-500"><Wifi className="h-3 w-3 mr-1" />Live</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Radio className="h-5 w-5 text-primary" />
          Stream Relay
          <span className="ml-auto">{getStatusBadge()}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Not streaming - show options */}
        {!isHosting && !isViewing && (
          <>
            {/* Camera source selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select Camera Source</label>
              <Select value={selectedCameraIndex} onValueChange={setSelectedCameraIndex}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a camera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="webcam">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      <span>Local Webcam</span>
                    </div>
                  </SelectItem>
                  {!camerasLoading && cameras.map((camera, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      <div className="flex items-center gap-2">
                        <MonitorPlay className="h-4 w-4" />
                        <span>{camera.name || `Camera ${index + 1}`}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cameras.length === 0 && !camerasLoading && (
                <p className="text-xs text-muted-foreground">
                  Add network cameras in the Cameras section to share them
                </p>
              )}
            </div>

            {/* Start hosting */}
            <div className="space-y-2">
              <Button
                onClick={handleStartHosting}
                disabled={isStarting}
                className="w-full"
                size="lg"
              >
                {isStarting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 mr-2" />
                )}
                Share Selected Camera
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Stream via server relay (works through firewalls)
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or join a stream</span>
              </div>
            </div>

            {/* Join stream */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter Room ID"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleJoinStream} variant="secondary">
                  <Eye className="h-4 w-4 mr-2" />
                  Join
                </Button>
              </div>
            </div>

            {/* Available rooms */}
            {availableRooms.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Available Streams:</p>
                  <Button size="sm" variant="ghost" onClick={refreshAvailableRooms}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {availableRooms.map((room) => (
                    <div
                      key={room.roomId}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm">{room.hostName}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => joinStream(room.roomId)}
                      >
                        Join
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Currently hosting */}
        {isHosting && (
          <div className="space-y-4">
            {/* Source indicator */}
            {selectedSource && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {selectedSource.type === 'webcam' ? (
                  <Video className="h-4 w-4" />
                ) : (
                  <MonitorPlay className="h-4 w-4" />
                )}
                <span>Streaming: {selectedSource.name}</span>
              </div>
            )}

            {/* Local video preview (for webcam) */}
            {localStream && (
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <video
                  ref={localPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2">
                  <Badge variant="destructive" className="text-xs">
                    LIVE
                  </Badge>
                </div>
              </div>
            )}

            {/* Room ID */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Share this Room ID:</p>
              <div className="flex gap-2">
                <Input
                  value={roomId || ''}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button size="icon" variant="outline" onClick={copyRoomId}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Stop button */}
            <Button variant="destructive" className="w-full" onClick={stopStream}>
              <X className="h-4 w-4 mr-2" />
              Stop Streaming
            </Button>
          </div>
        )}

        {/* Currently viewing */}
        {isViewing && (
          <div className="space-y-4">
            {/* Remote video */}
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {remoteFrameUrl ? (
                <>
                  <img
                    src={remoteFrameUrl}
                    alt="Remote stream"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge className="text-xs bg-primary">
                      LIVE
                    </Badge>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    {streamStatus === 'error' ? (
                      <>
                        <WifiOff className="h-8 w-8 text-destructive mx-auto" />
                        <p className="text-sm text-destructive">Stream ended or unavailable</p>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto animate-spin" />
                        <p className="text-sm text-muted-foreground">Connecting...</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground truncate flex-1">
                Room: <span className="font-mono text-xs">{roomId?.slice(0, 25)}...</span>
              </div>
              <Button variant="destructive" size="sm" onClick={stopStream}>
                <X className="h-4 w-4 mr-1" />
                Leave
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
