import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Home, 
  Maximize2, 
  Minimize2,
  Camera
} from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

const EDGE_FUNCTION_URL = 'https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/stream-relay';
const PULL_INTERVAL = 100; // ~10 fps for smoother mobile performance

type StreamStatus = 'connecting' | 'streaming' | 'error' | 'ended';

const RemoteViewer: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const [hostName, setHostName] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastFrameTime, setLastFrameTime] = useState<number>(Date.now());

  const pullFrame = useCallback(async () => {
    if (!roomId) return;

    try {
      const response = await fetch(
        `${EDGE_FUNCTION_URL}?action=pull&roomId=${encodeURIComponent(roomId)}`
      );
      
      if (response.status === 404) {
        setStatus('ended');
        return;
      }
      
      if (response.status === 410) {
        // Stale stream, but might come back
        setStatus('error');
        return;
      }

      if (!response.ok) {
        console.error('Failed to pull frame');
        return;
      }

      const data = await response.json();
      if (data.frame) {
        setFrameUrl(data.frame);
        setHostName(data.hostName || '');
        setStatus('streaming');
        setLastFrameTime(Date.now());
      }
    } catch (error) {
      console.error('Pull frame error:', error);
      setStatus('error');
    }
  }, [roomId]);

  // Start pulling frames
  useEffect(() => {
    if (!roomId) return;

    // Initial pull
    pullFrame();

    // Set up interval
    const interval = setInterval(pullFrame, PULL_INTERVAL);

    return () => clearInterval(interval);
  }, [roomId, pullFrame]);

  // Check for stale stream
  useEffect(() => {
    const staleCheck = setInterval(() => {
      if (status === 'streaming' && Date.now() - lastFrameTime > 5000) {
        setStatus('error');
      }
    }, 1000);

    return () => clearInterval(staleCheck);
  }, [status, lastFrameTime]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const getStatusBadge = () => {
    switch (status) {
      case 'connecting':
        return (
          <Badge variant="secondary" className="animate-pulse">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Connecting...
          </Badge>
        );
      case 'streaming':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <Wifi className="h-3 w-3 mr-1" />
            Live
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <WifiOff className="h-3 w-3 mr-1" />
            Reconnecting...
          </Badge>
        );
      case 'ended':
        return (
          <Badge variant="outline">
            <Camera className="h-3 w-3 mr-1" />
            Stream Ended
          </Badge>
        );
    }
  };

  return (
    <>
      <SEOHead 
        title="Remote Camera Viewer | Camera Stream"
        description="View your camera stream remotely from anywhere"
      />
      
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-3 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </Link>
            {hostName && (
              <span className="text-sm text-muted-foreground">
                {hostName}'s camera
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </header>

        {/* Main video area */}
        <main className="flex-1 flex items-center justify-center p-2 sm:p-4 bg-black">
          <div className="relative w-full max-w-5xl aspect-video bg-muted rounded-lg overflow-hidden">
            {frameUrl && status !== 'ended' ? (
              <img
                src={frameUrl}
                alt="Live camera stream"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  {status === 'ended' ? (
                    <>
                      <Camera className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                      <div className="space-y-2">
                        <p className="text-lg text-muted-foreground">
                          Stream has ended
                        </p>
                        <p className="text-sm text-muted-foreground/70">
                          The host stopped sharing this camera
                        </p>
                        <Link to="/dashboard">
                          <Button variant="outline" className="mt-4">
                            <Home className="h-4 w-4 mr-2" />
                            Go to Dashboard
                          </Button>
                        </Link>
                      </div>
                    </>
                  ) : status === 'error' ? (
                    <>
                      <WifiOff className="h-16 w-16 text-destructive mx-auto opacity-50" />
                      <div className="space-y-2">
                        <p className="text-lg text-muted-foreground">
                          Connection lost
                        </p>
                        <p className="text-sm text-muted-foreground/70">
                          Trying to reconnect...
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-16 w-16 text-primary mx-auto animate-spin" />
                      <p className="text-lg text-muted-foreground">
                        Connecting to stream...
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Live indicator overlay */}
            {status === 'streaming' && (
              <div className="absolute top-3 left-3">
                <Badge variant="destructive" className="shadow-lg">
                  <span className="h-2 w-2 rounded-full bg-white mr-1.5 animate-pulse" />
                  LIVE
                </Badge>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="p-3 border-t border-border bg-card/50 backdrop-blur-sm">
          <p className="text-xs text-center text-muted-foreground">
            Room: <span className="font-mono">{roomId?.slice(0, 30)}...</span>
          </p>
        </footer>
      </div>
    </>
  );
};

export default RemoteViewer;
