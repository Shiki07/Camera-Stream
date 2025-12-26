/**
 * Cloud Storage Credential Management Utility
 * Uses server-side storage for authenticated users with localStorage fallback
 */

import { encryptValue, decryptValue } from './credentialEncryption';
import { CloudStorageConfig } from '@/services/cloudStorage/types';
import { supabase } from '@/integrations/supabase/client';

// Legacy localStorage keys for migration
const LEGACY_CONFIG_STORAGE_KEY = 'cloudStorageConfig';
const LEGACY_ENCRYPTED_KEY = 'cloudStorageConfigEncrypted';

// Validation patterns for cloud storage inputs
const VALID_PROVIDERS = ['s3', 'google-drive', 'dropbox', 'onedrive', 'none'] as const;
const BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
const REGION_PATTERN = /^[a-z]{2}-[a-z]+-\d+$/;
const PATH_DANGEROUS_PATTERNS = [/\.\./, /^\//, /\/$/];

/**
 * Validate provider name against whitelist
 */
export function validateProvider(provider: string): boolean {
  return VALID_PROVIDERS.includes(provider as typeof VALID_PROVIDERS[number]);
}

/**
 * Validate S3 bucket name format
 */
export function validateBucketName(bucketName: string): boolean {
  if (!bucketName || bucketName.length < 3 || bucketName.length > 63) {
    return false;
  }
  return BUCKET_NAME_PATTERN.test(bucketName);
}

/**
 * Validate AWS region format
 */
export function validateRegion(region: string): boolean {
  if (!region) return true; // Optional field
  return REGION_PATTERN.test(region);
}

/**
 * Sanitize storage path to prevent directory traversal
 */
export function sanitizePath(path: string): string {
  if (!path) return '';
  
  let sanitized = path;
  
  for (const pattern of PATH_DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  sanitized = sanitized.replace(/\.\./g, '');
  sanitized = sanitized.replace(/^\/+|\/+$/g, '').trim();
  
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500);
  }
  
  return sanitized;
}

/**
 * Sanitize endpoint URL
 */
export function sanitizeEndpoint(endpoint: string): string {
  if (!endpoint) return '';
  
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' && !url.hostname.includes('localhost')) {
      return '';
    }
    return url.toString();
  } catch {
    return '';
  }
}

interface EncryptedCloudStorageConfig {
  provider: CloudStorageConfig['provider'];
  authMethod: CloudStorageConfig['authMethod'];
  bucketName?: string;
  region?: string;
  endpoint?: string;
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string;
  encryptedApiKey?: string;
  encryptedApiSecret?: string;
  expiresAt?: string;
  isEncrypted: true;
}

/**
 * Get auth token for server-side requests
 */
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Save cloud storage configuration to server-side storage
 */
export async function saveEncryptedCloudConfig(config: CloudStorageConfig): Promise<void> {
  // Validate provider
  if (!validateProvider(config.provider)) {
    throw new Error(`Invalid cloud storage provider: ${config.provider}`);
  }

  // Validate bucket name if provided for S3
  const bucketName = config.credentials?.bucketName;
  if (bucketName && config.provider === 's3' && !validateBucketName(bucketName)) {
    throw new Error('Invalid S3 bucket name format');
  }

  // Validate region if provided
  const region = config.credentials?.region;
  if (region && !validateRegion(region)) {
    throw new Error('Invalid AWS region format');
  }

  // Try server-side storage first
  const authToken = await getAuthToken();
  if (authToken) {
    try {
      const response = await fetch(
        'https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/save-user-token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            action: 'save',
            token_type: 'cloud_storage',
            data: {
              provider: config.provider,
              authMethod: config.authMethod,
              credentials: config.credentials,
            },
          }),
        }
      );

      const result = await response.json();
      if (response.ok && result.success) {
        // Clean up legacy localStorage
        localStorage.removeItem(LEGACY_CONFIG_STORAGE_KEY);
        localStorage.removeItem(LEGACY_ENCRYPTED_KEY);
        return;
      }
    } catch (error) {
      console.error('Failed to save to server-side storage:', error);
    }
  }

  // Fallback to localStorage for unauthenticated users
  const encryptedConfig: EncryptedCloudStorageConfig = {
    provider: config.provider,
    authMethod: config.authMethod,
    isEncrypted: true,
    bucketName: bucketName,
    region: region,
    endpoint: config.credentials?.endpoint ? sanitizeEndpoint(config.credentials.endpoint) : undefined,
    expiresAt: config.credentials?.expiresAt,
  };

  if (config.credentials?.accessToken) {
    encryptedConfig.encryptedAccessToken = await encryptValue(config.credentials.accessToken);
  }
  if (config.credentials?.refreshToken) {
    encryptedConfig.encryptedRefreshToken = await encryptValue(config.credentials.refreshToken);
  }
  if (config.credentials?.apiKey) {
    encryptedConfig.encryptedApiKey = await encryptValue(config.credentials.apiKey);
  }
  if (config.credentials?.apiSecret) {
    encryptedConfig.encryptedApiSecret = await encryptValue(config.credentials.apiSecret);
  }

  localStorage.setItem(LEGACY_ENCRYPTED_KEY, JSON.stringify(encryptedConfig));
  localStorage.removeItem(LEGACY_CONFIG_STORAGE_KEY);
}

/**
 * Load cloud storage configuration from server-side or localStorage
 */
export async function loadEncryptedCloudConfig(): Promise<CloudStorageConfig | null> {
  // Try server-side storage first
  const authToken = await getAuthToken();
  if (authToken) {
    try {
      const response = await fetch(
        'https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/save-user-token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            action: 'load',
            token_type: 'cloud_storage',
          }),
        }
      );

      const result = await response.json();
      if (response.ok && result.success && result.data) {
        // Clean up legacy localStorage after successful server load
        localStorage.removeItem(LEGACY_CONFIG_STORAGE_KEY);
        localStorage.removeItem(LEGACY_ENCRYPTED_KEY);
        return result.data as CloudStorageConfig;
      }
    } catch (error) {
      console.error('Failed to load from server-side storage:', error);
    }
  }

  // Try to load encrypted config from localStorage
  const encryptedConfigStr = localStorage.getItem(LEGACY_ENCRYPTED_KEY);
  
  if (encryptedConfigStr) {
    try {
      const encryptedConfig: EncryptedCloudStorageConfig = JSON.parse(encryptedConfigStr);
      
      if (encryptedConfig.isEncrypted) {
        const config: CloudStorageConfig = {
          provider: encryptedConfig.provider,
          authMethod: encryptedConfig.authMethod,
          credentials: {
            bucketName: encryptedConfig.bucketName,
            region: encryptedConfig.region,
            endpoint: encryptedConfig.endpoint,
            expiresAt: encryptedConfig.expiresAt,
          },
        };

        if (encryptedConfig.encryptedAccessToken) {
          config.credentials!.accessToken = await decryptValue(encryptedConfig.encryptedAccessToken);
        }
        if (encryptedConfig.encryptedRefreshToken) {
          config.credentials!.refreshToken = await decryptValue(encryptedConfig.encryptedRefreshToken);
        }
        if (encryptedConfig.encryptedApiKey) {
          config.credentials!.apiKey = await decryptValue(encryptedConfig.encryptedApiKey);
        }
        if (encryptedConfig.encryptedApiSecret) {
          config.credentials!.apiSecret = await decryptValue(encryptedConfig.encryptedApiSecret);
        }

        // Migrate to server-side if authenticated
        if (authToken) {
          await saveEncryptedCloudConfig(config);
        }

        return config;
      }
    } catch (error) {
      console.error('Failed to load encrypted cloud config:', error);
    }
  }

  // Try to migrate legacy unencrypted config
  const legacyConfigStr = localStorage.getItem(LEGACY_CONFIG_STORAGE_KEY);
  if (legacyConfigStr) {
    try {
      const legacyConfig: CloudStorageConfig = JSON.parse(legacyConfigStr);
      await saveEncryptedCloudConfig(legacyConfig);
      return legacyConfig;
    } catch (error) {
      console.error('Failed to migrate legacy cloud config:', error);
    }
  }

  return null;
}

/**
 * Check if cloud storage is configured (without decrypting)
 */
export function hasCloudConfig(): boolean {
  return !!(
    localStorage.getItem(LEGACY_ENCRYPTED_KEY) || 
    localStorage.getItem(LEGACY_CONFIG_STORAGE_KEY)
  );
}

/**
 * Clear cloud storage configuration
 */
export async function clearCloudConfig(): Promise<void> {
  // Clear server-side storage
  const authToken = await getAuthToken();
  if (authToken) {
    try {
      await fetch(
        'https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/save-user-token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            action: 'delete',
            token_type: 'cloud_storage',
          }),
        }
      );
    } catch (error) {
      console.error('Failed to clear server-side storage:', error);
    }
  }

  // Clear localStorage
  localStorage.removeItem(LEGACY_ENCRYPTED_KEY);
  localStorage.removeItem(LEGACY_CONFIG_STORAGE_KEY);
}
