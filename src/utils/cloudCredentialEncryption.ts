/**
 * Cloud Storage Credential Encryption Utility
 * Extends the credentialEncryption utility for cloud storage credentials
 */

import { encryptValue, decryptValue } from './credentialEncryption';
import { CloudStorageConfig } from '@/services/cloudStorage/types';

const CLOUD_CONFIG_STORAGE_KEY = 'cloudStorageConfig';
const CLOUD_CONFIG_ENCRYPTED_KEY = 'cloudStorageConfigEncrypted';

interface EncryptedCloudStorageConfig {
  provider: CloudStorageConfig['provider'];
  authMethod: CloudStorageConfig['authMethod'];
  // Non-sensitive data stored in plain
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
  const encryptedConfig: EncryptedCloudStorageConfig = {
    provider: config.provider,
    authMethod: config.authMethod,
    isEncrypted: true,
    // Non-sensitive S3 config
    bucketName: config.credentials?.bucketName,
    region: config.credentials?.region,
    endpoint: config.credentials?.endpoint,
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
