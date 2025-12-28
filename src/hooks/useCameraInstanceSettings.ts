import { useState, useEffect, useCallback } from 'react';
import { CameraSettings, DEFAULT_CAMERA_SETTINGS } from '@/types/camera';
import { toast } from '@/hooks/use-toast';

const STORAGE_KEY = 'camera_settings';
const SETTINGS_CHANGED_EVENT = 'camera-settings-changed';

// Custom event type for type safety
interface SettingsChangedEventDetail {
  cameraId: string;
  settings: CameraSettings;
}

export const useCameraInstanceSettings = (cameraId: string | undefined) => {
  const [settings, setSettings] = useState<CameraSettings>(DEFAULT_CAMERA_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from localStorage
  const loadSettings = useCallback(() => {
    if (!cameraId) {
      setSettings(DEFAULT_CAMERA_SETTINGS);
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
    }
  }, [cameraId]);

  // Initial load
  useEffect(() => {
    loadSettings();
    setIsLoading(false);
  }, [loadSettings]);

  // Listen for settings changes from other components
  useEffect(() => {
    if (!cameraId) return;

    const handleSettingsChanged = (event: Event) => {
      const customEvent = event as CustomEvent<SettingsChangedEventDetail>;
      if (customEvent.detail.cameraId === cameraId) {
        setSettings(prev => ({ ...prev, ...customEvent.detail.settings }));
      }
    };

    window.addEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChanged);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChanged);
  }, [cameraId]);

  // Save settings to localStorage and emit event
  const saveSettings = useCallback((newSettings: Partial<CameraSettings>) => {
    if (!cameraId) return;
    
    setIsSaving(true);
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const allSettings = stored ? JSON.parse(stored) : {};
      
      const updatedSettings = { ...settings, ...newSettings };
      allSettings[cameraId] = updatedSettings;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allSettings));
      
      setSettings(updatedSettings);

      // Emit custom event to notify other components
      window.dispatchEvent(new CustomEvent<SettingsChangedEventDetail>(SETTINGS_CHANGED_EVENT, {
        detail: { cameraId, settings: updatedSettings }
      }));

      toast({
        title: "Settings saved",
        description: "Camera settings updated successfully.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
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
