import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWebRTCStream } from '@/hooks/useWebRTCStream';
import { 
  Video, 
  VideoOff, 
  Users, 
  Copy, 
  Check, 
  Radio, 
  Eye,
  X,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { toast } from 'sonner';

interface WebRTCStreamPanelProps {
  localVideoRef?: React.RefObject<HTMLVideoElement>;
  existingStream?: MediaStream | null;
}

export const WebRTCStreamPanel: React.FC<WebRTCStreamPanelProps> = ({
  localVideoRef: externalVideoRef,
  existingStream,
}) => {
  const {
    isHosting,
    isViewing,
    roomId,
    localStream,
    remoteStream,
    connectedPeers,
    availableRooms,
    startHosting,
    joinStream,
    stopStream,
    refreshAvailableRooms,
  } = useWebRTCStream();

  const [joinRoomId, setJoinRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoElement = externalVideoRef || internalVideoRef;

  // Attach local stream to video element
  useEffect(() => {
    const stream = existingStream || localStream;
    if (localVideoElement.current && stream) {
      localVideoElement.current.srcObject = stream;
    }
  }, [localStream, existingStream, localVideoElement]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Refresh available rooms on mount
  useEffect(() => {
    const cleanup = refreshAvailableRooms();
    return cleanup;
  }, [refreshAvailableRooms]);

  const handleStartHosting = async () => {
    setIsStarting(true);
    try {
      let stream = existingStream;
      
      if (!stream) {
        // Request camera access if no existing stream
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });
      }

      await startHosting(stream);
    } catch (error) {
      console.error('Failed to start hosting:', error);
      toast.error('Failed to access camera');
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

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Radio className="h-5 w-5 text-primary" />
          P2P Stream Sharing
          {isHosting && (
            <Badge variant="default" className="ml-auto bg-green-500">
              <Wifi className="h-3 w-3 mr-1" />
              Hosting
            </Badge>
          )}
          {isViewing && (
            <Badge variant="secondary" className="ml-auto">
              <Eye className="h-3 w-3 mr-1" />
              Viewing
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Not streaming - show options */}
        {!isHosting && !isViewing && (
          <>
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
                  <Video className="h-4 w-4 mr-2" />
                )}
                Share My Webcam
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Start streaming your webcam to other devices
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
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
                <p className="text-sm font-medium text-foreground">Available Streams:</p>
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
            {/* Local video preview */}
            {!externalVideoRef && (
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <video
                  ref={internalVideoRef}
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

            {/* Connected viewers */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{connectedPeers.length} viewer(s) connected</span>
              </div>
              <Button variant="destructive" size="sm" onClick={stopStream}>
                <X className="h-4 w-4 mr-1" />
                Stop
              </Button>
            </div>
          </div>
        )}

        {/* Currently viewing */}
        {isViewing && (
          <div className="space-y-4">
            {/* Remote video */}
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <WifiOff className="h-8 w-8 text-muted-foreground mx-auto animate-pulse" />
                    <p className="text-sm text-muted-foreground">Connecting...</p>
                  </div>
                </div>
              )}
              {remoteStream && (
                <div className="absolute top-2 left-2">
                  <Badge className="text-xs bg-primary">
                    LIVE
                  </Badge>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Room: <span className="font-mono text-xs">{roomId?.slice(0, 20)}...</span>
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
