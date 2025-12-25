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
import { Camera, AlertTriangle, Webcam, Wifi, Home, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useHomeAssistant } from '@/hooks/useHomeAssistant';

export interface CameraConfig extends NetworkCameraConfig {
  source: 'webcam' | 'network' | 'homeassistant';
  deviceId?: string;
  haEntityId?: string;
}

interface AddCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (config: CameraConfig) => void;
}

export const AddCameraDialog = ({ open, onOpenChange, onAdd }: AddCameraDialogProps) => {
  const [tab, setTab] = useState<'webcam' | 'network' | 'homeassistant'>('webcam');
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
  const [hasLoadedHACameras, setHasLoadedHACameras] = useState(false);
  const [selectedHACamera, setSelectedHACamera] = useState<string>('');
  
  const { config: haConfig, cameras: haCameras, fetchCameras, loading: haLoading, getCameraProxyUrl } = useHomeAssistant();

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

  // Load Home Assistant cameras
  const loadHACameras = async () => {
    if (hasLoadedHACameras || !haConfig.url || !haConfig.token) return;
    await fetchCameras();
    setHasLoadedHACameras(true);
  };

  // Auto-load webcam devices when dialog opens (webcam is default tab)
  useEffect(() => {
    if (open && tab === 'webcam' && !hasLoadedWebcams) {
      loadWebcamDevices();
    }
  }, [open]);

  // Load devices when tab changes
  const handleTabChange = (value: string) => {
    setTab(value as 'webcam' | 'network' | 'homeassistant');
    if (value === 'webcam' && !hasLoadedWebcams) {
      loadWebcamDevices();
    }
    if (value === 'homeassistant' && !hasLoadedHACameras) {
      loadHACameras();
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
      
      // Normalize URL to HTTP - cameras don't serve HTTPS
      let normalizedUrl = url.trim();
      if (normalizedUrl.startsWith('https://')) {
        normalizedUrl = normalizedUrl.replace('https://', 'http://');
      }
      
      try {
        new URL(normalizedUrl);
      } catch {
        setError('Please enter a valid URL');
        return;
      }

      const config: CameraConfig = {
        source: 'network',
        name: name.trim(),
        url: normalizedUrl,
        type,
        ...(username && { username }),
        ...(password && { password }),
      };

      onAdd(config);
    } else if (tab === 'homeassistant') {
      // Home Assistant camera
      if (!selectedHACamera) {
        setError('Please select a Home Assistant camera');
        return;
      }

      const proxyUrl = getCameraProxyUrl(selectedHACamera);
      
      const config: CameraConfig = {
        source: 'homeassistant',
        name: name.trim(),
        url: proxyUrl,
        type: 'mjpeg',
        haEntityId: selectedHACamera,
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
    setSelectedHACamera('');
  };

  const handleClose = () => {
    setError(null);
    setHasLoadedWebcams(false);
    setHasLoadedHACameras(false);
    onOpenChange(false);
  };

  const haConfigured = haConfig.url && haConfig.token;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Add Camera
          </DialogTitle>
          <DialogDescription>
            Add a webcam, network camera, or Home Assistant camera.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="webcam" className="flex items-center gap-1 text-xs">
              <Webcam className="h-3 w-3" />
              Webcam
            </TabsTrigger>
            <TabsTrigger value="network" className="flex items-center gap-1 text-xs">
              <Wifi className="h-3 w-3" />
              Network
            </TabsTrigger>
            <TabsTrigger value="homeassistant" className="flex items-center gap-1 text-xs">
              <Home className="h-3 w-3" />
              Home Assistant
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
                placeholder={tab === 'webcam' ? 'My Webcam' : tab === 'homeassistant' ? 'Front Door (HA)' : 'Front Door'}
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

            <TabsContent value="homeassistant" className="space-y-4 mt-0">
              {!haConfigured ? (
                <div className="text-center py-4">
                  <Home className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Home Assistant not configured
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Configure your Home Assistant URL and token in Settings → Home Assistant
                  </p>
                </div>
              ) : haLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : haCameras.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">No cameras found in Home Assistant</p>
                  <Button variant="outline" size="sm" onClick={loadHACameras}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Cameras
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="ha-camera">Select Camera</Label>
                  <Select value={selectedHACamera} onValueChange={setSelectedHACamera}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a Home Assistant camera" />
                    </SelectTrigger>
                    <SelectContent>
                      {haCameras.map((camera) => (
                        <SelectItem key={camera.entity_id} value={camera.entity_id}>
                          {camera.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Camera stream will be proxied through Home Assistant
                  </p>
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
