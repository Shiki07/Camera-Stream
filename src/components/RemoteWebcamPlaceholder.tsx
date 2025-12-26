import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Laptop, 
  Wifi, 
  ExternalLink,
  Trash2,
  Cloud
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RemoteWebcamPlaceholderProps {
  name: string;
  sourceDeviceName?: string;
  index: number;
  isFocused: boolean;
  onFocus: (index: number | null) => void;
  onRemove: (index: number) => void;
  onStartRelay?: () => void;
}

export const RemoteWebcamPlaceholder = ({
  name,
  sourceDeviceName,
  index,
  isFocused,
  onFocus,
  onRemove,
  onStartRelay,
}: RemoteWebcamPlaceholderProps) => {
  return (
    <Card 
      className={cn(
        "overflow-hidden relative",
        isFocused && "col-span-full row-span-full"
      )}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-2 bg-gradient-to-b from-background/90 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-xs">
              <Cloud className="h-3 w-3" />
              Synced
            </Badge>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Laptop className="h-3 w-3" />
              Remote
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
            {name}
          </span>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="aspect-video bg-muted flex flex-col items-center justify-center gap-4 p-6">
        <div className="relative">
          <Video className="h-16 w-16 text-muted-foreground" />
          <div className="absolute -top-1 -right-1 bg-destructive rounded-full p-1">
            <VideoOff className="h-4 w-4 text-destructive-foreground" />
          </div>
        </div>
        
        <div className="text-center space-y-1">
          <h3 className="font-medium">Remote Webcam</h3>
          <p className="text-sm text-muted-foreground">
            This webcam is connected to{' '}
            <span className="font-medium text-foreground">
              {sourceDeviceName || 'another device'}
            </span>
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 mt-2">
          <p className="text-xs text-muted-foreground text-center max-w-[250px]">
            Webcams can only be accessed from the device they're physically connected to.
            Use P2P streaming to view this camera remotely.
          </p>
          
          {onStartRelay && (
            <Button 
              variant="default" 
              size="sm"
              onClick={onStartRelay}
              className="gap-2"
            >
              <Wifi className="h-4 w-4" />
              Start P2P Stream
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-2 bg-gradient-to-t from-background/90 to-transparent">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Laptop className="h-3 w-3" />
            {sourceDeviceName || 'Unknown Device'}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onRemove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
