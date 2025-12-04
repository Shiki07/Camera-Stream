import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Grid, LayoutGrid } from 'lucide-react';
import { CameraFeedCard } from '@/components/CameraFeedCard';
import { AddCameraDialog, CameraConfig } from '@/components/AddCameraDialog';
import { CameraSettingsSheet } from '@/components/CameraSettingsSheet';
import { useMultiCamera } from '@/hooks/useMultiCamera';
import { GridLayout, GRID_LAYOUTS } from '@/types/camera';
import { cn } from '@/lib/utils';

// Helper to ensure camera has source field
const ensureCameraConfig = (camera: any): CameraConfig => ({
  ...camera,
  source: camera.source || (camera.url?.startsWith('webcam://') ? 'webcam' : 'network'),
});

export const MultiCameraGrid = () => {
  const {
    cameras,
    addCamera,
    removeCamera,
    isLoading,
    layout,
    setLayout,
    focusedCameraIndex,
    focusCamera,
    getGridClass,
    getEmptySlots,
  } = useMultiCamera();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [settingsIndex, setSettingsIndex] = useState<number | null>(null);

  const handleAddCamera = (config: any) => {
    addCamera(config);
    setAddDialogOpen(false);
  };

  const emptySlots = getEmptySlots();

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Cameras</h2>
          <span className="text-sm text-muted-foreground">({cameras.length} connected)</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Layout Selector */}
          <Select value={layout} onValueChange={(v) => setLayout(v as GridLayout)}>
            <SelectTrigger className="w-[140px]">
              <Grid className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GRID_LAYOUTS.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Add Camera Button */}
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Camera
          </Button>
        </div>
      </div>

      {/* Camera Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : cameras.length === 0 && emptySlots === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <LayoutGrid className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">No cameras configured</h3>
              <p className="text-sm text-muted-foreground">
                Add your first camera to start monitoring
              </p>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Camera
            </Button>
          </div>
        </Card>
      ) : (
        <div className={cn("grid gap-4", getGridClass())}>
          {/* Active Camera Feeds */}
          {cameras.map((camera, index) => {
            // Skip if not in active indices and not focused
            if (focusedCameraIndex !== null && focusedCameraIndex !== index) {
              return null;
            }
            
            const cameraConfig = ensureCameraConfig(camera);
            return (
              <CameraFeedCard
                key={camera.url + index}
                cameraId={camera.url}
                config={cameraConfig}
                index={index}
                isFocused={focusedCameraIndex === index}
                onFocus={focusCamera}
                onSettings={setSettingsIndex}
                onRemove={removeCamera}
              />
            );
          })}

          {/* Empty Slots */}
          {focusedCameraIndex === null && Array.from({ length: emptySlots }).map((_, i) => (
            <Card
              key={`empty-${i}`}
              className="aspect-video bg-muted/50 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/70 transition-colors"
              onClick={() => setAddDialogOpen(true)}
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Plus className="h-8 w-8" />
                <span className="text-sm">Add Camera</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Camera Dialog */}
      <AddCameraDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddCamera}
      />

      {/* Camera Settings Sheet */}
      {settingsIndex !== null && cameras[settingsIndex] && (
        <CameraSettingsSheet
          open={settingsIndex !== null}
          onOpenChange={(open) => !open && setSettingsIndex(null)}
          camera={cameras[settingsIndex]}
          cameraId={cameras[settingsIndex].url}
          onRemove={() => {
            removeCamera(settingsIndex);
            setSettingsIndex(null);
          }}
        />
      )}
    </div>
  );
};
