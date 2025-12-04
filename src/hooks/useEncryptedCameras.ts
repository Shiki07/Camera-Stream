import { useState, useEffect, useCallback } from 'react';
import { NetworkCameraConfig } from './useNetworkCamera';
import {
  encryptCameraCredentials,
  decryptCameraCredentials,
  migrateLegacyCameras,
  isLegacyFormat,
  EncryptedCameraConfig,
} from '@/utils/credentialEncryption';

const STORAGE_KEY = 'networkCameras';

export function useEncryptedCameras() {
  const [cameras, setCameras] = useState<NetworkCameraConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load and decrypt cameras on mount
  useEffect(() => {
    const loadCameras = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
          setCameras([]);
          setIsLoading(false);
          setIsInitialized(true);
          return;
        }

        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) {
          setCameras([]);
          setIsLoading(false);
          setIsInitialized(true);
          return;
        }

        // Check if migration is needed
        const needsMigration = parsed.some(isLegacyFormat);
        
        if (needsMigration) {
          console.log('Migrating legacy camera credentials to encrypted format...');
          const migrated = await migrateLegacyCameras(parsed);
          // Save migrated cameras immediately
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
          // Decrypt for use
          const decrypted = await Promise.all(migrated.map(decryptCameraCredentials));
          setCameras(decrypted as NetworkCameraConfig[]);
        } else {
          // Decrypt existing encrypted cameras
          const decrypted = await Promise.all(parsed.map(decryptCameraCredentials));
          setCameras(decrypted as NetworkCameraConfig[]);
        }
      } catch (error) {
        console.error('Failed to load cameras:', error);
        setCameras([]);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    loadCameras();
  }, []);

  // Save encrypted cameras whenever they change (after initial load)
  useEffect(() => {
    if (!isInitialized) return;

    const saveCameras = async () => {
      try {
        const encrypted = await Promise.all(
          cameras.map(encryptCameraCredentials)
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
      } catch (error) {
        console.error('Failed to save cameras:', error);
      }
    };

    saveCameras();
  }, [cameras, isInitialized]);

  const addCamera = useCallback((config: NetworkCameraConfig) => {
    setCameras(prev => [...prev, config]);
  }, []);

  const removeCamera = useCallback((index: number) => {
    setCameras(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateCamera = useCallback((index: number, config: NetworkCameraConfig) => {
    setCameras(prev => prev.map((cam, i) => i === index ? config : cam));
  }, []);

  return {
    cameras,
    setCameras,
    addCamera,
    removeCamera,
    updateCamera,
    isLoading,
  };
}
