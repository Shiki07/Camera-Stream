/**
 * Credential Encryption Utility
 * Uses Web Crypto API to encrypt sensitive camera credentials in localStorage
 */

const ENCRYPTION_KEY_NAME = 'cam_encryption_key';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

// Generate a random encryption key and store it
async function generateAndStoreKey(): Promise<CryptoKey> {
  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // extractable for storage
    ['encrypt', 'decrypt']
  );
  
  // Export and store the key
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
  localStorage.setItem(ENCRYPTION_KEY_NAME, keyBase64);
  
  return key;
}

// Get or create the encryption key
async function getEncryptionKey(): Promise<CryptoKey> {
  const storedKey = localStorage.getItem(ENCRYPTION_KEY_NAME);
  
  if (storedKey) {
    try {
      const keyBytes = Uint8Array.from(atob(storedKey), c => c.charCodeAt(0));
      return await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
      );
    } catch {
      // Key import failed, generate new one
    }
  }
  
  return generateAndStoreKey();
}

// Encrypt a string value
export async function encryptValue(value: string): Promise<string> {
  if (!value) return '';
  
  try {
    const key = await getEncryptionKey();
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
    const key = await getEncryptionKey();
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
