/**
 * Device Identifier Utility
 * Creates a unique identifier for this device/browser to track where cameras are connected
 */

const DEVICE_ID_KEY = 'cam_device_id';
const DEVICE_NAME_KEY = 'cam_device_name';

/**
 * Get or create a unique device ID for this browser instance
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

/**
 * Get a human-readable device name based on browser/OS info
 */
export function getDeviceName(): string {
  // Check if user has set a custom name
  const customName = localStorage.getItem(DEVICE_NAME_KEY);
  if (customName) return customName;
  
  // Generate a name from user agent
  const ua = navigator.userAgent;
  let deviceType = 'Device';
  let browser = 'Browser';
  
  // Detect device type
  if (/iPhone/.test(ua)) deviceType = 'iPhone';
  else if (/iPad/.test(ua)) deviceType = 'iPad';
  else if (/Android/.test(ua) && /Mobile/.test(ua)) deviceType = 'Android Phone';
  else if (/Android/.test(ua)) deviceType = 'Android Tablet';
  else if (/Macintosh/.test(ua)) deviceType = 'Mac';
  else if (/Windows/.test(ua)) deviceType = 'Windows PC';
  else if (/Linux/.test(ua)) deviceType = 'Linux PC';
  
  // Detect browser
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) browser = 'Chrome';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/Firefox/.test(ua)) browser = 'Firefox';
  else if (/Edg/.test(ua)) browser = 'Edge';
  
  return `${deviceType} (${browser})`;
}

/**
 * Set a custom device name
 */
export function setDeviceName(name: string): void {
  localStorage.setItem(DEVICE_NAME_KEY, name);
}

/**
 * Check if a camera is from this device
 */
export function isLocalDevice(sourceDeviceId: string | null | undefined): boolean {
  if (!sourceDeviceId) return true; // If no device ID, assume local for backward compat
  return sourceDeviceId === getDeviceId();
}
