/**
 * Cloud Storage Credential Encryption Utility
 * Extends the credentialEncryption utility for cloud storage credentials
 */

import { encryptValue, decryptValue } from './credentialEncryption';
import { CloudStorageConfig } from '@/services/cloudStorage/types';

const CLOUD_CONFIG_STORAGE_KEY = 'cloudStorageConfig';
const CLOUD_CONFIG_ENCRYPTED_KEY = 'cloudStorageConfigEncrypted';

// Validation patterns for cloud storage inputs
const VALID_PROVIDERS = ['s3', 'google-drive', 'dropbox', 'onedrive'] as const;
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
  
  // Remove dangerous patterns
  for (const pattern of PATH_DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  // Remove any remaining directory traversal attempts
  sanitized = sanitized.replace(/\.\./g, '');
  
  // Trim leading/trailing slashes and whitespace
  sanitized = sanitized.replace(/^\/+|\/+$/g, '').trim();
  
  // Limit length
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
    // Only allow https (or http for localhost)
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
  // Non-sensitive data stored in plain (validated)
  bucketName?: string;
  region?: string;
  endpoint?: string;
  // Encrypted credentials
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string;
  encryptedApiKey?: string;
  encryptedApiSecret?: string;
  expiresAt?: string;
  // Flag to identify encrypted format
  isEncrypted: true;
}

/**
 * Encrypt and save cloud storage configuration
 */
export async function saveEncryptedCloudConfig(config: CloudStorageConfig): Promise<void> {
  // Validate provider
  if (!validateProvider(config.provider)) {
    throw new Error(`Invalid cloud storage provider: ${config.provider}`);
  }

  // Validate and sanitize bucket name if provided
  const bucketName = config.credentials?.bucketName;
  if (bucketName && config.provider === 's3' && !validateBucketName(bucketName)) {
    throw new Error('Invalid S3 bucket name format');
  }

  // Validate region if provided
  const region = config.credentials?.region;
  if (region && !validateRegion(region)) {
    throw new Error('Invalid AWS region format');
  }

  const encryptedConfig: EncryptedCloudStorageConfig = {
    provider: config.provider,
    authMethod: config.authMethod,
    isEncrypted: true,
    // Non-sensitive S3 config (validated)
    bucketName: bucketName,
    region: region,
    endpoint: config.credentials?.endpoint ? sanitizeEndpoint(config.credentials.endpoint) : undefined,
    expiresAt: config.credentials?.expiresAt,
  };

  // Encrypt sensitive credentials
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

  // Save encrypted config
  localStorage.setItem(CLOUD_CONFIG_ENCRYPTED_KEY, JSON.stringify(encryptedConfig));
  
  // Remove legacy unencrypted config if it exists
  localStorage.removeItem(CLOUD_CONFIG_STORAGE_KEY);
}

/**
 * Load and decrypt cloud storage configuration
 */
export async function loadEncryptedCloudConfig(): Promise<CloudStorageConfig | null> {
  // First try to load encrypted config
  const encryptedConfigStr = localStorage.getItem(CLOUD_CONFIG_ENCRYPTED_KEY);
  
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

        // Decrypt sensitive credentials
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

        return config;
      }
    } catch (error) {
      console.error('Failed to load encrypted cloud config:', error);
    }
  }

  // Try to migrate legacy unencrypted config
  const legacyConfigStr = localStorage.getItem(CLOUD_CONFIG_STORAGE_KEY);
  if (legacyConfigStr) {
    try {
      const legacyConfig: CloudStorageConfig = JSON.parse(legacyConfigStr);
      
      // Migrate to encrypted format
      await saveEncryptedCloudConfig(legacyConfig);
      console.log('Migrated legacy cloud config to encrypted format');
      
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
    localStorage.getItem(CLOUD_CONFIG_ENCRYPTED_KEY) || 
    localStorage.getItem(CLOUD_CONFIG_STORAGE_KEY)
  );
}

/**
 * Clear cloud storage configuration
 */
export function clearCloudConfig(): void {
  localStorage.removeItem(CLOUD_CONFIG_ENCRYPTED_KEY);
  localStorage.removeItem(CLOUD_CONFIG_STORAGE_KEY);
}
