import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { NetworkCameraConfig } from '@/hooks/useNetworkCamera';
import { useCameraInstanceSettings } from '@/hooks/useCameraInstanceSettings';
import { Camera, Trash2, Video, Bell, Clock, Settings, HardDrive, FolderOpen } from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CameraSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camera: NetworkCameraConfig;
  cameraId: string;
  onRemove: () => void;
}

export const CameraSettingsSheet = ({
  open,
  onOpenChange,
  camera,
  cameraId,
  onRemove,
}: CameraSettingsSheetProps) => {
  const { settings, updateSetting, isLoading, isSaving } = useCameraInstanceSettings(cameraId);

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {camera.name}
          </SheetTitle>
          <SheetDescription>
            Configure settings for this camera
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Quality Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <h3 className="font-medium">Quality</h3>
            </div>
            <Select
              value={settings.quality}
              onValueChange={(v) => updateSetting('quality', v as 'high' | 'medium' | 'low')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High (1080p)</SelectItem>
                <SelectItem value="medium">Medium (720p)</SelectItem>
                <SelectItem value="low">Low (480p)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Storage Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <h3 className="font-medium">Storage</h3>
            </div>
            <Select
              value={settings.storage_type || 'local'}
              onValueChange={(v) => updateSetting('storage_type', v as 'cloud' | 'local')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local (Download)</SelectItem>
                <SelectItem value="cloud">Cloud Storage</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Where to save recordings and snapshots
            </p>
          </div>

          <Separator />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              <h3 className="font-medium">Motion Detection</h3>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="motion-enabled">Enable Motion Detection</Label>
              <Switch
                id="motion-enabled"
                checked={settings.motion_enabled}
                onCheckedChange={(v) => updateSetting('motion_enabled', v)}
              />
            </div>

            {settings.motion_enabled && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Sensitivity</Label>
                    <span className="text-sm text-muted-foreground">{settings.motion_sensitivity}%</span>
                  </div>
                  <Slider
                    value={[settings.motion_sensitivity]}
                    onValueChange={([v]) => updateSetting('motion_sensitivity', v)}
                    min={10}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Threshold</Label>
                    <span className="text-sm text-muted-foreground">{(settings.motion_threshold * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[settings.motion_threshold * 100]}
                    onValueChange={([v]) => updateSetting('motion_threshold', v / 100)}
                    min={5}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="noise-reduction">Noise Reduction</Label>
                  <Switch
                    id="noise-reduction"
                    checked={settings.noise_reduction}
                    onCheckedChange={(v) => updateSetting('noise_reduction', v)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Cooldown Period</Label>
                    <span className="text-sm text-muted-foreground">{settings.cooldown_period}s</span>
                  </div>
                  <Slider
                    value={[settings.cooldown_period]}
                    onValueChange={([v]) => updateSetting('cooldown_period', v)}
                    min={5}
                    max={120}
                    step={5}
                  />
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <h3 className="font-medium">Notifications</h3>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <Switch
                id="email-notifications"
                checked={settings.email_notifications}
                onCheckedChange={(v) => updateSetting('email_notifications', v)}
              />
            </div>

            {settings.email_notifications && (
              <div className="space-y-2">
                <Label htmlFor="notification-email">Email Address</Label>
                <Input
                  id="notification-email"
                  type="email"
                  placeholder="your@email.com"
                  value={settings.notification_email}
                  onChange={(e) => updateSetting('notification_email', e.target.value)}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Schedule */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <h3 className="font-medium">Schedule</h3>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="schedule-enabled">Enable Schedule</Label>
              <Switch
                id="schedule-enabled"
                checked={settings.schedule_enabled}
                onCheckedChange={(v) => updateSetting('schedule_enabled', v)}
              />
            </div>

            {settings.schedule_enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Hour</Label>
                  <Select
                    value={settings.start_hour.toString()}
                    onValueChange={(v) => updateSetting('start_hour', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }).map((_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>End Hour</Label>
                  <Select
                    value={settings.end_hour.toString()}
                    onValueChange={(v) => updateSetting('end_hour', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }).map((_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Recording Storage Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <h3 className="font-medium">Recording Storage</h3>
            </div>
            
            {/* Primary: Host Computer Storage */}
            <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
              <Label className="text-sm font-medium">Host Computer (Primary)</Label>
              <p className="text-xs text-muted-foreground">
                Recordings will be downloaded directly to your computer's default download folder.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="px-2 py-1 bg-primary/20 text-primary rounded text-xs">
                  Recommended for webcams
                </div>
              </div>
            </div>

            {/* Secondary: Raspberry Pi Storage */}
            <div className="space-y-3 p-3 rounded-lg border border-dashed border-muted-foreground/30">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-muted-foreground">Raspberry Pi Storage (Advanced)</Label>
                <span className="text-xs text-muted-foreground">For Pi cameras only</span>
              </div>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <FolderOpen className="h-4 w-4 mt-2.5 text-muted-foreground" />
                  <Input
                    id="video-path"
                    placeholder="/home/pi/Videos"
                    value={settings.video_path || '/home/pi/Videos'}
                    onChange={(e) => updateSetting('video_path', e.target.value)}
                    className="text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Path on the Raspberry Pi where recordings will be saved when using Pi recording service
                </p>
              </div>
            </div>
          </div>

          <Separator />
          <div className="space-y-4">
            <h3 className="font-medium text-destructive">Danger Zone</h3>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Camera
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Camera</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove "{camera.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onRemove}>
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {isSaving && (
          <div className="absolute bottom-4 right-4">
            <span className="text-xs text-muted-foreground">Saving...</span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
