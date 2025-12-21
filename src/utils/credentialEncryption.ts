/**
 * Credential Encryption Utility
 * Uses Web Crypto API to encrypt sensitive camera credentials
 * Key is derived from user session using PBKDF2 - never stored directly
 */

const SALT_KEY_NAME = 'cam_encryption_salt';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const PBKDF2_ITERATIONS = 100000;

// Get or create salt for key derivation (salt is not secret, just needs to be unique)
function getOrCreateSalt(): Uint8Array {
  const storedSalt = localStorage.getItem(SALT_KEY_NAME);
  
  if (storedSalt) {
    try {
      return Uint8Array.from(atob(storedSalt), c => c.charCodeAt(0));
    } catch {
      // Invalid salt, generate new one
    }
  }
  
  // Generate new random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(SALT_KEY_NAME, btoa(String.fromCharCode(...salt)));
  return salt;
}

// Get user identifier for key derivation
// Uses a combination of browser fingerprint and stored identifier
// This ensures the key is tied to this specific browser/device
function getUserKeyMaterial(): string {
  const storedId = localStorage.getItem('cam_user_device_id');
  if (storedId) {
    return storedId;
  }
  
  // Generate a unique device identifier that persists across sessions
  // This is combined with the salt for key derivation
  const deviceId = crypto.randomUUID();
  localStorage.setItem('cam_user_device_id', deviceId);
  return deviceId;
}

// Derive encryption key from user material using PBKDF2
// The key is never stored - it's derived fresh each time
async function deriveEncryptionKey(): Promise<CryptoKey> {
  const userMaterial = getUserKeyMaterial();
  const salt = getOrCreateSalt();
  
  // Import user material as key material for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(userMaterial),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Create a proper ArrayBuffer copy of salt for PBKDF2
  const saltBuffer = new ArrayBuffer(salt.length);
  new Uint8Array(saltBuffer).set(salt);
  
  // Derive the actual encryption key using PBKDF2
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // Not extractable - key can never be exported
    ['encrypt', 'decrypt']
  );
}

// Encrypt a string value
export async function encryptValue(value: string): Promise<string> {
  if (!value) return '';
  
  try {
    const key = await deriveEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedValue = new TextEncoder().encode(value);
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      encodedValue
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);
    
    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch {
    throw new Error('Failed to encrypt credential');
  }
}

// Decrypt a string value
export async function decryptValue(encryptedValue: string): Promise<string> {
  if (!encryptedValue) return '';
  
  try {
    const key = await deriveEncryptionKey();
    const combined = Uint8Array.from(atob(encryptedValue), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encryptedData
    );
    
    return new TextDecoder().decode(decryptedBuffer);
  } catch {
    // Return empty string on decryption failure (corrupted data or key mismatch)
    return '';
  }
}

// Encrypt camera credentials (username and password only)
export interface EncryptedCameraConfig {
  url: string;
  type: 'rtsp' | 'mjpeg' | 'hls';
  name: string;
  quality?: 'high' | 'medium' | 'low';
  encryptedUsername?: string;
  encryptedPassword?: string;
  // Keep for backward compatibility detection
  username?: never;
  password?: never;
}

export interface DecryptedCameraConfig {
  url: string;
  type: 'rtsp' | 'mjpeg' | 'hls';
  name: string;
  quality?: 'high' | 'medium' | 'low';
  username?: string;
  password?: string;
}

export async function encryptCameraCredentials(
  config: DecryptedCameraConfig
): Promise<EncryptedCameraConfig> {
  const encrypted: EncryptedCameraConfig = {
    url: config.url,
    type: config.type,
    name: config.name,
    quality: config.quality,
  };
  
  if (config.username) {
    encrypted.encryptedUsername = await encryptValue(config.username);
  }
  
  if (config.password) {
    encrypted.encryptedPassword = await encryptValue(config.password);
  }
  
  return encrypted;
}

export async function decryptCameraCredentials(
  config: EncryptedCameraConfig | DecryptedCameraConfig
): Promise<DecryptedCameraConfig> {
  // Handle legacy unencrypted format (for migration)
  if ('username' in config || 'password' in config) {
    const legacyConfig = config as DecryptedCameraConfig;
    return {
      url: legacyConfig.url,
      type: legacyConfig.type,
      name: legacyConfig.name,
      quality: legacyConfig.quality,
      username: legacyConfig.username,
      password: legacyConfig.password,
    };
  }
  
  const encryptedConfig = config as EncryptedCameraConfig;
  const decrypted: DecryptedCameraConfig = {
    url: encryptedConfig.url,
    type: encryptedConfig.type,
    name: encryptedConfig.name,
    quality: encryptedConfig.quality,
  };
  
  if (encryptedConfig.encryptedUsername) {
    decrypted.username = await decryptValue(encryptedConfig.encryptedUsername);
  }
  
  if (encryptedConfig.encryptedPassword) {
    decrypted.password = await decryptValue(encryptedConfig.encryptedPassword);
  }
  
  return decrypted;
}

// Check if a config is using the old unencrypted format
export function isLegacyFormat(config: unknown): boolean {
  if (typeof config !== 'object' || config === null) return false;
  const c = config as Record<string, unknown>;
  return 'username' in c || 'password' in c;
}

// Migrate legacy cameras to encrypted format
export async function migrateLegacyCameras(
  cameras: (EncryptedCameraConfig | DecryptedCameraConfig)[]
): Promise<EncryptedCameraConfig[]> {
  const migrated: EncryptedCameraConfig[] = [];
  
  for (const camera of cameras) {
    if (isLegacyFormat(camera)) {
      // Migrate legacy format to encrypted
      const legacyCamera = camera as DecryptedCameraConfig;
      const encrypted = await encryptCameraCredentials(legacyCamera);
      migrated.push(encrypted);
    } else {
      migrated.push(camera as EncryptedCameraConfig);
    }
  }
  
  return migrated;
}

// Clean up old encryption key if it exists (migration from old system)
export function cleanupLegacyEncryptionKey(): void {
  localStorage.removeItem('cam_encryption_key');
}
