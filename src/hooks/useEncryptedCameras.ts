import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NetworkCameraConfig } from './useNetworkCamera';
import { useSyncedCameras, SyncedCamera } from './useSyncedCameras';
import {
  decryptCameraCredentials,
  cleanupLegacyEncryptionKey,
} from '@/utils/credentialEncryption';

const LEGACY_STORAGE_KEY = 'networkCameras';
const LEGACY_DEVICE_ID_KEY = 'cam_user_device_id';
const LEGACY_SALT_KEY = 'cam_encryption_salt';
const MIGRATION_FLAG_KEY = 'networkCameras_migrated_to_supabase';

/**
 * Backwards-compatible facade over `useSyncedCameras` that:
 *  - Surfaces ONLY network-type cameras (matching the old localStorage scope)
 *  - On first run for an authenticated user, migrates any legacy
 *    localStorage-stored `networkCameras` into the encrypted
 *    `camera_credentials` Supabase table, then wipes local copies.
 *
 * Camera credentials are no longer stored in the browser. After migration
 * the localStorage entries, device id, and PBKDF2 salt are removed so an
 * XSS attacker cannot recover them.
 */
export function useEncryptedCameras() {
  const { user } = useAuth();
  const synced = useSyncedCameras();
  const migrationStartedRef = useRef(false);

  // One-time legacy migration: localStorage → Supabase
  useEffect(() => {
    if (!user || migrationStartedRef.current) return;
    if (localStorage.getItem(MIGRATION_FLAG_KEY) === '1') {
      // Already migrated — make sure leftover key material is gone
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.removeItem(LEGACY_DEVICE_ID_KEY);
      localStorage.removeItem(LEGACY_SALT_KEY);
      cleanupLegacyEncryptionKey();
      return;
    }

    migrationStartedRef.current = true;

    const migrate = async () => {
      try {
        const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (!raw) {
          localStorage.setItem(MIGRATION_FLAG_KEY, '1');
          localStorage.removeItem(LEGACY_DEVICE_ID_KEY);
          localStorage.removeItem(LEGACY_SALT_KEY);
          cleanupLegacyEncryptionKey();
          return;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }
        if (!Array.isArray(parsed) || parsed.length === 0) {
          localStorage.removeItem(LEGACY_STORAGE_KEY);
          localStorage.setItem(MIGRATION_FLAG_KEY, '1');
          localStorage.removeItem(LEGACY_DEVICE_ID_KEY);
          localStorage.removeItem(LEGACY_SALT_KEY);
          cleanupLegacyEncryptionKey();
          return;
        }

        // Decrypt each legacy camera (handles both plaintext-legacy and
        // browser-encrypted formats) before uploading to the server.
        const decrypted = await Promise.all(
          parsed.map((c) =>
            decryptCameraCredentials(c as Parameters<typeof decryptCameraCredentials>[0]),
          ),
        );

        // Avoid creating duplicates if a partial migration happened previously.
        const existingUrls = new Set(
          synced.cameras
            .filter((c) => c.source === 'network')
            .map((c) => `${c.name}|${c.url}`),
        );

        let migratedCount = 0;
        for (const cam of decrypted) {
          if (!cam?.url || !cam?.name) continue;
          if (existingUrls.has(`${cam.name}|${cam.url}`)) continue;

          const id = await synced.addCamera({
            name: cam.name,
            url: cam.url,
            type: cam.type ?? 'mjpeg',
            quality: cam.quality ?? 'medium',
            source: 'network',
            username: cam.username,
            password: cam.password,
          });
          if (id) migratedCount++;
        }

        if (migratedCount > 0) {
          console.log(
            `useEncryptedCameras: migrated ${migratedCount} legacy camera(s) to encrypted server storage`,
          );
        }

        // Cleanup all client-side credential material
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        localStorage.removeItem(LEGACY_DEVICE_ID_KEY);
        localStorage.removeItem(LEGACY_SALT_KEY);
        cleanupLegacyEncryptionKey();
        localStorage.setItem(MIGRATION_FLAG_KEY, '1');
      } catch (err) {
        console.error('useEncryptedCameras: legacy migration failed', err);
        // Allow retry on next mount by NOT setting the migration flag.
        migrationStartedRef.current = false;
      }
    };

    migrate();
    // Intentionally only depend on user id — synced.* refs change each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Expose only network cameras, matching the old hook's contract.
  const networkCameras = useMemo<NetworkCameraConfig[]>(
    () =>
      synced.cameras
        .filter((c) => c.source === 'network')
        .map((c) => ({
          url: c.url,
          name: c.name,
          type: c.type,
          quality: c.quality,
          username: c.username,
          password: c.password,
        })),
    [synced.cameras],
  );

  // Map our filtered-list index back to the underlying SyncedCamera index
  const indexMap = useMemo(() => {
    const map: number[] = [];
    synced.cameras.forEach((c, i) => {
      if (c.source === 'network') map.push(i);
    });
    return map;
  }, [synced.cameras]);

  const addCamera = useCallback(
    (config: NetworkCameraConfig) => {
      // Fire-and-forget to preserve the previous sync API shape
      void synced.addCamera({
        name: config.name,
        url: config.url,
        type: config.type,
        quality: config.quality,
        source: 'network',
        username: config.username,
        password: config.password,
      });
    },
    [synced],
  );

  const removeCamera = useCallback(
    (index: number) => {
      const realIndex = indexMap[index];
      if (realIndex === undefined) return;
      void synced.removeCamera(realIndex);
    },
    [synced, indexMap],
  );

  const updateCamera = useCallback(
    (index: number, config: NetworkCameraConfig) => {
      const realIndex = indexMap[index];
      if (realIndex === undefined) return;
      void synced.updateCamera(realIndex, {
        name: config.name,
        url: config.url,
        type: config.type,
        quality: config.quality,
        source: 'network',
        username: config.username,
        password: config.password,
      } as Partial<SyncedCamera>);
    },
    [synced, indexMap],
  );

  return {
    cameras: networkCameras,
    setCameras: () => {
      // No-op: state is owned by Supabase via useSyncedCameras
      console.warn('useEncryptedCameras: setCameras is a no-op after Supabase migration');
    },
    addCamera,
    removeCamera,
    updateCamera,
    isLoading: synced.isLoading,
  };
}
