import { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NetworkCameraConfig } from '@/hooks/useNetworkCamera';
import { Camera, AlertTriangle, Webcam, Wifi } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface CameraConfig extends NetworkCameraConfig {
  source: 'webcam' | 'network';
  deviceId?: string;
}

interface AddCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (config: CameraConfig) => void;
}

export const AddCameraDialog = ({ open, onOpenChange, onAdd }: AddCameraDialogProps) => {
  const [tab, setTab] = useState<'webcam' | 'network'>('webcam');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'mjpeg' | 'rtsp' | 'hls'>('mjpeg');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [webcamDevices, setWebcamDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [webcamLoading, setWebcamLoading] = useState(false);
  const [hasLoadedWebcams, setHasLoadedWebcams] = useState(false);

  // Enumerate webcam devices
  const loadWebcamDevices = async () => {
    if (hasLoadedWebcams) return;
    setWebcamLoading(true);
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setWebcamDevices(videoDevices);
      setHasLoadedWebcams(true);
      if (videoDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
    } catch (err) {
      setError('Could not access camera. Please grant permission.');
    } finally {
      setWebcamLoading(false);
    }
  };

  // Auto-load webcam devices when dialog opens (webcam is default tab)
  useEffect(() => {
    if (open && tab === 'webcam' && !hasLoadedWebcams) {
      loadWebcamDevices();
    }
  }, [open]);

  // Load devices when tab changes to webcam
  const handleTabChange = (value: string) => {
    setTab(value as 'webcam' | 'network');
    if (value === 'webcam' && !hasLoadedWebcams) {
      loadWebcamDevices();
    }
  };

  const handleSubmit = () => {
    setError(null);
    
    if (!name.trim()) {
      setError('Camera name is required');
      return;
    }

    if (tab === 'network') {
      if (!url.trim()) {
        setError('Camera URL is required');
        return;
      }
      
      try {
        new URL(url);
      } catch {
        setError('Please enter a valid URL');
        return;
      }

      const config: CameraConfig = {
        source: 'network',
        name: name.trim(),
        url: url.trim(),
        type,
        ...(username && { username }),
        ...(password && { password }),
      };

      onAdd(config);
    } else {
      // Webcam
      if (!selectedDevice) {
        setError('Please select a webcam');
        return;
      }

      const config: CameraConfig = {
        source: 'webcam',
        name: name.trim(),
        url: `webcam://${selectedDevice}`,
        type: 'mjpeg', // Not used for webcam but required by type
        deviceId: selectedDevice,
      };

      onAdd(config);
    }
    
    // Reset form
    setName('');
    setUrl('');
    setType('mjpeg');
    setUsername('');
    setPassword('');
    setSelectedDevice('');
  };

  const handleClose = () => {
    setError(null);
    setHasLoadedWebcams(false);
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
            Add a webcam or network camera to your monitoring grid.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="webcam" className="flex items-center gap-2">
              <Webcam className="h-4 w-4" />
              Webcam
            </TabsTrigger>
            <TabsTrigger value="network" className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Network Camera
            </TabsTrigger>
          </TabsList>

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
                placeholder={tab === 'webcam' ? 'My Webcam' : 'Front Door'}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <TabsContent value="network" className="space-y-4 mt-0">
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
            </TabsContent>

            <TabsContent value="webcam" className="space-y-4 mt-0">
              {webcamLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : webcamDevices.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">No webcams detected</p>
                  <Button variant="outline" size="sm" onClick={loadWebcamDevices}>
                    Refresh Devices
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="device">Select Webcam</Label>
                  <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a webcam" />
                    </SelectTrigger>
                    <SelectContent>
                      {webcamDevices.map((device, i) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

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
