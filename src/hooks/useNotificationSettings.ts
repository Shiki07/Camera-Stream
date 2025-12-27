import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';

// Validation schema for notification settings
const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
  useCustomEmail: z.boolean(),
  customEmail: z.string().email().optional().or(z.literal('')),
  alertSensitivity: z.enum(['low', 'medium', 'high']),
  includeSnapshot: z.boolean(),
  cooldownMinutes: z.number().min(1).max(60),
});

export type AlertSensitivity = 'low' | 'medium' | 'high';

export interface NotificationSettings {
  enabled: boolean;
  useCustomEmail: boolean;
  customEmail: string;
  alertSensitivity: AlertSensitivity;
  includeSnapshot: boolean;
  cooldownMinutes: number;
}

// Sensitivity thresholds for motion detection
export const SENSITIVITY_THRESHOLDS: Record<AlertSensitivity, { motionThreshold: number; minDuration: number }> = {
  low: { motionThreshold: 15, minDuration: 2000 },    // 15% motion, sustained for 2 seconds
  medium: { motionThreshold: 8, minDuration: 1000 },  // 8% motion, sustained for 1 second
  high: { motionThreshold: 3, minDuration: 500 },     // 3% motion, sustained for 0.5 seconds
};

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  useCustomEmail: false,
  customEmail: '',
  alertSensitivity: 'medium',
  includeSnapshot: true,
  cooldownMinutes: 5,
};

const STORAGE_KEY = 'motion_notification_settings';

export const useNotificationSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate and merge with defaults
        const validated = {
          ...DEFAULT_SETTINGS,
          ...parsed,
        };
        setSettings(validated);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save settings to localStorage whenever they change
  const saveSettings = useCallback((newSettings: NotificationSettings) => {
    try {
      // Validate before saving
      const result = notificationSettingsSchema.safeParse(newSettings);
      if (!result.success) {
        console.error('Invalid notification settings:', result.error);
        return false;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
      return true;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      return false;
    }
  }, []);

  // Update individual setting
  const updateSetting = useCallback(<K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      } catch (error) {
        console.error('Error saving notification settings:', error);
      }
      return newSettings;
    });
  }, []);

  // Get the effective email address (user email or custom)
  const getEffectiveEmail = useCallback((): string => {
    if (settings.useCustomEmail && settings.customEmail) {
      return settings.customEmail;
    }
    return user?.email || '';
  }, [settings.useCustomEmail, settings.customEmail, user?.email]);

  // Check if notifications can be sent
  const canSendNotifications = useCallback((): boolean => {
    if (!settings.enabled) return false;
    const email = getEffectiveEmail();
    return !!email && email.includes('@');
  }, [settings.enabled, getEffectiveEmail]);

  // Get motion detection thresholds based on sensitivity
  const getMotionThresholds = useCallback(() => {
    return SENSITIVITY_THRESHOLDS[settings.alertSensitivity];
  }, [settings.alertSensitivity]);

  return {
    settings,
    isLoaded,
    userEmail: user?.email || '',
    saveSettings,
    updateSetting,
    getEffectiveEmail,
    canSendNotifications,
    getMotionThresholds,
  };
};
