import { useState, useEffect, useCallback } from 'react';
import { CameraSettings, DEFAULT_CAMERA_SETTINGS } from '@/types/camera';

const STORAGE_KEY = 'camera_settings';

export const useCameraInstanceSettings = (cameraId: string | undefined) => {
  const [settings, setSettings] = useState<CameraSettings>(DEFAULT_CAMERA_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    if (!cameraId) {
      setSettings(DEFAULT_CAMERA_SETTINGS);
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allSettings = JSON.parse(stored);
        if (allSettings[cameraId]) {
          setSettings({ ...DEFAULT_CAMERA_SETTINGS, ...allSettings[cameraId] });
        }
      }
    } catch {
      // Use defaults on error
    } finally {
      setIsLoading(false);
    }
  }, [cameraId]);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: Partial<CameraSettings>) => {
    if (!cameraId) return;
    
    setIsSaving(true);
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const allSettings = stored ? JSON.parse(stored) : {};
      
      allSettings[cameraId] = { ...settings, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allSettings));
      
      setSettings(prev => ({ ...prev, ...newSettings }));
    } catch {
      // Silent fail
    } finally {
      setIsSaving(false);
    }
  }, [cameraId, settings]);

  // Individual setting updater
  const updateSetting = useCallback(<K extends keyof CameraSettings>(
    key: K,
    value: CameraSettings[K]
  ) => {
    saveSettings({ [key]: value });
  }, [saveSettings]);

  return {
    settings,
    isLoading,
    isSaving,
    updateSetting,
    saveSettings,
    setSettings,
  };
};
