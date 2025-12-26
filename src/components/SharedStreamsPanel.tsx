import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Monitor, 
  Smartphone, 
  Video, 
  ExternalLink, 
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useSharedStreams, SharedStream } from '@/hooks/useSharedStreams';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const getCameraIcon = (type: string) => {
  switch (type) {
    case 'webcam':
      return <Monitor className="h-4 w-4" />;
    case 'network':
      return <Video className="h-4 w-4" />;
    case 'homeassistant':
      return <Smartphone className="h-4 w-4" />;
    default:
      return <Video className="h-4 w-4" />;
  }
};

interface StreamCardProps {
  stream: SharedStream;
  onConnect: (roomId: string) => void;
}

function StreamCard({ stream, onConnect }: StreamCardProps) {
  const lastHeartbeat = new Date(stream.last_heartbeat);
  const isStale = Date.now() - lastHeartbeat.getTime() > 60000; // 1 minute

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
          {getCameraIcon(stream.camera_type)}
        </div>
        <div>
          <p className="font-medium text-sm">{stream.camera_name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="capitalize">{stream.camera_type}</span>
            <span>•</span>
            <span>Started {formatDistanceToNow(new Date(stream.started_at), { addSuffix: true })}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isStale ? (
          <Badge variant="secondary" className="flex items-center gap-1">
            <WifiOff className="h-3 w-3" />
            Stale
          </Badge>
        ) : (
          <Badge variant="default" className="flex items-center gap-1 bg-green-600">
            <Wifi className="h-3 w-3" />
            Live
          </Badge>
        )}
        <Button 
          size="sm" 
          onClick={() => onConnect(stream.room_id)}
          className="gap-1"
        >
          <ExternalLink className="h-3 w-3" />
          View
        </Button>
      </div>
    </div>
  );
}

export function SharedStreamsPanel() {
  const { sharedStreams, isLoading, refetch } = useSharedStreams();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleConnect = (roomId: string) => {
    navigate(`/view/${roomId}`);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Video className="h-5 w-5" />
            My Shared Cameras
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (sharedStreams.length === 0) {
    return null; // Don't show panel if no shared streams
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            My Shared Cameras
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Cameras being shared from your other devices
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {sharedStreams.map((stream) => (
          <StreamCard 
            key={stream.id} 
            stream={stream} 
            onConnect={handleConnect}
          />
        ))}
      </CardContent>
    </Card>
  );
}
