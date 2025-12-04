import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NetworkCameraConfig } from '@/hooks/useNetworkCamera';
import { Camera, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (config: NetworkCameraConfig) => void;
}

export const AddCameraDialog = ({ open, onOpenChange, onAdd }: AddCameraDialogProps) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'mjpeg' | 'rtsp' | 'hls'>('mjpeg');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    
    if (!name.trim()) {
      setError('Camera name is required');
      return;
    }
    
    if (!url.trim()) {
      setError('Camera URL is required');
      return;
    }
    
    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    const config: NetworkCameraConfig = {
      name: name.trim(),
      url: url.trim(),
      type,
      ...(username && { username }),
      ...(password && { password }),
    };

    onAdd(config);
    
    // Reset form
    setName('');
    setUrl('');
    setType('mjpeg');
    setUsername('');
    setPassword('');
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Add Camera
          </DialogTitle>
          <DialogDescription>
            Configure a new network camera to add to your monitoring grid.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Camera Name</Label>
            <Input
              id="name"
              placeholder="Front Door"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Stream URL</Label>
            <Input
              id="url"
              placeholder="http://192.168.1.100:8000/stream.mjpg"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              For Raspberry Pi cameras, use: http://[pi-ip]:8000/stream.mjpg
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Stream Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'mjpeg' | 'rtsp' | 'hls')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mjpeg">MJPEG Stream</SelectItem>
                <SelectItem value="rtsp" disabled>RTSP (Coming Soon)</SelectItem>
                <SelectItem value="hls" disabled>HLS (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username (Optional)</Label>
              <Input
                id="username"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password (Optional)</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Add Camera
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
