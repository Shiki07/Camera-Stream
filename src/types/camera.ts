import { NetworkCameraConfig } from '@/hooks/useNetworkCamera';

export interface CameraInstance {
  id: string;
  config: NetworkCameraConfig;
  settings: CameraSettings;
}

export interface CameraSettings {
  id?: string;
  user_id?: string;
  camera_id?: string;
  motion_enabled: boolean;
  motion_sensitivity: number;
  motion_threshold: number;
  quality: 'high' | 'medium' | 'low';
  recording_enabled: boolean;
  email_notifications: boolean;
  notification_email: string;
  schedule_enabled: boolean;
  start_hour: number;
  end_hour: number;
  cooldown_period: number;
  min_motion_duration: number;
  noise_reduction: boolean;
  detection_zones_enabled: boolean;
  video_path: string;
  storage_type: 'cloud' | 'local';
  direct_connection: boolean; // Bypass proxy for local network access
}

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  motion_enabled: false,
  motion_sensitivity: 70,
  motion_threshold: 0.5,
  quality: 'medium',
  recording_enabled: false,
  email_notifications: false,
  notification_email: '',
  schedule_enabled: false,
  start_hour: 22,
  end_hour: 6,
  cooldown_period: 30,
  min_motion_duration: 500,
  noise_reduction: true,
  detection_zones_enabled: false,
  video_path: '/home/pi/Videos',
  storage_type: 'local',
  direct_connection: false,
};

export type GridLayout = '1x1' | '2x2' | '3x3' | '4x4';

export const GRID_LAYOUTS: { value: GridLayout; label: string; count: number }[] = [
  { value: '1x1', label: '1 Camera', count: 1 },
  { value: '2x2', label: '4 Cameras', count: 4 },
  { value: '3x3', label: '9 Cameras', count: 9 },
  { value: '4x4', label: '16 Cameras', count: 16 },
];
