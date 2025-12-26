import { useState, useCallback, useEffect } from 'react';
import { GridLayout, GRID_LAYOUTS } from '@/types/camera';
import { useSyncedCameras, SyncedCamera } from '@/hooks/useSyncedCameras';

export const useMultiCamera = () => {
  const { 
    cameras, 
    addCamera: addSyncedCamera, 
    removeCamera: removeSyncedCamera, 
    updateCamera: updateSyncedCamera, 
    isLoading,
    isLocalWebcam,
    deviceId,
    deviceName,
  } = useSyncedCameras();
  
  const [layout, setLayout] = useState<GridLayout>('2x2');
  const [focusedCameraIndex, setFocusedCameraIndex] = useState<number | null>(null);
  const [activeCameraIndices, setActiveCameraIndices] = useState<number[]>([]);

  // Wrapper to match the expected interface
  const addCamera = useCallback(async (config: any) => {
    return await addSyncedCamera({
      name: config.name,
      url: config.url,
      type: config.type || 'mjpeg',
      quality: config.quality || 'medium',
      source: config.source || 'network',
      deviceId: config.deviceId,
      haEntityId: config.haEntityId,
      username: config.username,
      password: config.password,
    });
  }, [addSyncedCamera]);

  const removeCamera = useCallback(async (index: number) => {
    return await removeSyncedCamera(index);
  }, [removeSyncedCamera]);

  const updateCamera = useCallback(async (index: number, config: any) => {
    return await updateSyncedCamera(index, config);
  }, [updateSyncedCamera]);

  // Determine which cameras should be active based on layout
  useEffect(() => {
    const layoutConfig = GRID_LAYOUTS.find(l => l.value === layout);
    const maxCameras = layoutConfig?.count ?? 4;
    
    // Activate cameras up to the layout limit
    const indices = cameras.slice(0, maxCameras).map((_, i) => i);
    setActiveCameraIndices(indices);
  }, [cameras, layout]);

  // Handle focusing on a single camera
  const focusCamera = useCallback((index: number | null) => {
    setFocusedCameraIndex(index);
    if (index !== null) {
      setActiveCameraIndices([index]);
    } else {
      // Restore based on layout
      const layoutConfig = GRID_LAYOUTS.find(l => l.value === layout);
      const maxCameras = layoutConfig?.count ?? 4;
      const indices = cameras.slice(0, maxCameras).map((_, i) => i);
      setActiveCameraIndices(indices);
    }
  }, [cameras, layout]);

  // Get grid class based on layout and focus state
  const getGridClass = useCallback(() => {
    if (focusedCameraIndex !== null) {
      return 'grid-cols-1';
    }
    
    switch (layout) {
      case '1x1':
        return 'grid-cols-1';
      case '2x2':
        return 'grid-cols-1 md:grid-cols-2';
      case '3x3':
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case '4x4':
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
      default:
        return 'grid-cols-1 md:grid-cols-2';
    }
  }, [layout, focusedCameraIndex]);

  // Calculate the number of empty slots to show
  const getEmptySlots = useCallback(() => {
    if (focusedCameraIndex !== null) return 0;
    
    const layoutConfig = GRID_LAYOUTS.find(l => l.value === layout);
    const maxCameras = layoutConfig?.count ?? 4;
    return Math.max(0, maxCameras - cameras.length);
  }, [cameras.length, layout, focusedCameraIndex]);

  return {
    cameras,
    addCamera,
    removeCamera,
    updateCamera,
    isLoading,
    layout,
    setLayout,
    focusedCameraIndex,
    focusCamera,
    activeCameraIndices,
    getGridClass,
    getEmptySlots,
    isLocalWebcam,
    deviceId,
    deviceName,
  };
};
