/**
 * Pi Service API Key Encryption Utility
 * Encrypts the Pi service API key stored in localStorage using Web Crypto API
 */

import { encryptValue, decryptValue } from './credentialEncryption';

const PI_KEY_STORAGE_KEY = 'PI_SERVICE_API_KEY_ENCRYPTED';
const LEGACY_PI_KEY_STORAGE_KEY = 'PI_SERVICE_API_KEY';

/**
 * Encrypt and save Pi service API key
 */
export async function savePiServiceApiKey(apiKey: string): Promise<void> {
  if (!apiKey || !apiKey.trim()) {
    return;
  }
  
  const encryptedKey = await encryptValue(apiKey.trim());
  localStorage.setItem(PI_KEY_STORAGE_KEY, encryptedKey);
  
  // Remove legacy unencrypted key if it exists
  localStorage.removeItem(LEGACY_PI_KEY_STORAGE_KEY);
}

/**
 * Load and decrypt Pi service API key
 */
export async function loadPiServiceApiKey(): Promise<string> {
  // First try to load encrypted key
  const encryptedKey = localStorage.getItem(PI_KEY_STORAGE_KEY);
  
  if (encryptedKey) {
    try {
      const decryptedKey = await decryptValue(encryptedKey);
      if (decryptedKey) {
        return decryptedKey;
      }
    } catch (error) {
      console.error('Failed to decrypt Pi service API key:', error);
    }
  }
  
  // Try to migrate legacy unencrypted key
  const legacyKey = localStorage.getItem(LEGACY_PI_KEY_STORAGE_KEY);
  if (legacyKey) {
    try {
      await savePiServiceApiKey(legacyKey);
      console.log('Migrated Pi service API key to encrypted format');
      return legacyKey;
    } catch (error) {
      console.error('Failed to migrate Pi service API key:', error);
    }
  }
  
  return '';
}

/**
 * Check if Pi service API key is configured (without decrypting)
 */
export function hasPiServiceApiKey(): boolean {
  return !!(
    localStorage.getItem(PI_KEY_STORAGE_KEY) || 
    localStorage.getItem(LEGACY_PI_KEY_STORAGE_KEY)
  );
}

/**
 * Clear Pi service API key
 */
export function clearPiServiceApiKey(): void {
  localStorage.removeItem(PI_KEY_STORAGE_KEY);
  localStorage.removeItem(LEGACY_PI_KEY_STORAGE_KEY);
}
