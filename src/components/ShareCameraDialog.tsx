import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Copy, 
  Check, 
  Radio, 
  X, 
  Wifi,
  ExternalLink,
  Smartphone,
  QrCode,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useRelayStream, RelayStreamSource } from '@/hooks/useRelayStream';

interface ShareCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cameraName: string;
  cameraUrl?: string;
  cameraSource: 'webcam' | 'network' | 'homeassistant';
  deviceId?: string;
}

export const ShareCameraDialog: React.FC<ShareCameraDialogProps> = ({
  open,
  onOpenChange,
  cameraName,
  cameraUrl,
  cameraSource,
  deviceId,
}) => {
  const {
    isHosting,
    roomId,
    streamStatus,
    startHosting,
    stopStream,
  } = useRelayStream();

  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const networkImgRef = useRef<HTMLImageElement | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const baseUrl = window.location.origin;
  const viewerUrl = roomId ? `${baseUrl}/view/${roomId}` : '';

  // Clean up on close
  useEffect(() => {
    if (!open) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }
  }, [open]);

  const handleStartSharing = async () => {
    setIsStarting(true);
    try {
      if (cameraSource === 'webcam' && deviceId) {
        const source: RelayStreamSource = {
          type: 'webcam',
          name: cameraName,
          deviceId: deviceId,
        };
        await startHosting(source);
      } else if (cameraUrl) {
        // For network/HA cameras, create an image element to capture from
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        
        // Build the proxy URL for the camera
        const proxyUrl = `https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/camera-proxy?url=${encodeURIComponent(cameraUrl)}`;
        img.src = proxyUrl;
        networkImgRef.current = img;

        // Wait for image to load
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load camera feed'));
          setTimeout(() => reject(new Error('Camera connection timeout')), 10000);
        });

        // Keep refreshing the image for MJPEG
        refreshIntervalRef.current = setInterval(() => {
          if (networkImgRef.current) {
            networkImgRef.current.src = proxyUrl + '&t=' + Date.now();
          }
        }, 150);

        const source: RelayStreamSource = {
          type: 'network-camera',
          name: cameraName,
          imageElement: img,
        };
        await startHosting(source);
      }
    } catch (error) {
      console.error('Failed to start sharing:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start sharing');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopSharing = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    stopStream();
  };

  const copyLink = () => {
    if (viewerUrl) {
      navigator.clipboard.writeText(viewerUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      toast.success('Room ID copied!');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            Share Camera Remotely
          </DialogTitle>
          <DialogDescription>
            Share "{cameraName}" so it can be viewed from anywhere
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isHosting ? (
            <>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Smartphone className="h-5 w-5 text-primary mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">How it works:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Click "Start Sharing" below</li>
                      <li>Scan the QR code or copy the link</li>
                      <li>Open on any device to view the camera</li>
                    </ol>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleStartSharing} 
                disabled={isStarting}
                className="w-full"
                size="lg"
              >
                {isStarting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Radio className="h-4 w-4 mr-2" />
                )}
                Start Sharing
              </Button>
            </>
          ) : (
            <>
              {/* Status */}
              <div className="flex items-center justify-between">
                <Badge 
                  variant="default" 
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Wifi className="h-3 w-3 mr-1" />
                  Live
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Camera is being shared
                </span>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center space-y-3 p-4 bg-background rounded-lg border">
                <div className="bg-white p-3 rounded-lg">
                  <QRCodeSVG 
                    value={viewerUrl} 
                    size={180}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <QrCode className="h-3 w-3" />
                  Scan to view on any device
                </p>
              </div>

              {/* Viewer Link */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Viewer Link
                </label>
                <div className="flex gap-2">
                  <Input
                    value={viewerUrl}
                    readOnly
                    className="text-xs font-mono"
                  />
                  <Button size="icon" variant="outline" onClick={copyLink}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    onClick={() => window.open(viewerUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Room ID (for manual entry) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Room ID (for app)
                </label>
                <div className="flex gap-2">
                  <Input
                    value={roomId || ''}
                    readOnly
                    className="text-xs font-mono"
                  />
                  <Button size="icon" variant="outline" onClick={copyRoomId}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Stop button */}
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={handleStopSharing}
              >
                <X className="h-4 w-4 mr-2" />
                Stop Sharing
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
