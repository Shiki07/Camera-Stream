import { useState, useEffect, useCallback } from 'react';

export type StorageTier = '5GB' | '25GB' | '100GB';

interface StorageStats {
  totalFiles: number;
  totalSizeBytes: number;
  cloudFiles: number;
  localFiles: number;
  cloudSizeBytes: number;
  localSizeBytes: number;
  percentageUsed: number;
  warningLevel: 'safe' | 'warning' | 'danger' | 'critical';
}

const STORAGE_TIERS: Record<StorageTier, number> = {
  '5GB': 5 * 1024 * 1024 * 1024,
  '25GB': 25 * 1024 * 1024 * 1024,
  '100GB': 100 * 1024 * 1024 * 1024,
};

export const useStorageStats = () => {
  const [storageTier, setStorageTier] = useState<StorageTier>(() => {
    try {
      const saved = localStorage.getItem('storageTier');
      return (saved as StorageTier) || '5GB';
    } catch {
      return '5GB';
    }
  });

  const [stats, setStats] = useState<StorageStats>({
    totalFiles: 0,
    totalSizeBytes: 0,
    cloudFiles: 0,
    localFiles: 0,
    cloudSizeBytes: 0,
    localSizeBytes: 0,
    percentageUsed: 0,
    warningLevel: 'safe'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateStorageTier = (tier: StorageTier) => {
    setStorageTier(tier);
    try {
      localStorage.setItem('storageTier', tier);
    } catch (error) {
      console.error('Failed to save storage tier:', error);
    }
  };

  const storageLimitBytes = STORAGE_TIERS[storageTier];

  const getWarningLevel = (percentage: number): 'safe' | 'warning' | 'danger' | 'critical' => {
    if (percentage >= 95) return 'critical';
    if (percentage >= 85) return 'danger';
    if (percentage >= 70) return 'warning';
    return 'safe';
  };

  const calculateStats = useCallback(() => {
    try {
      setIsLoading(true);
      const recordings = JSON.parse(localStorage.getItem('recordings') || '[]');

      const cloudFiles = recordings.filter((r: any) => r.storage_type === 'cloud');
      const localFiles = recordings.filter((r: any) => r.storage_type === 'local');

      const cloudSizeBytes = cloudFiles.reduce((sum: number, r: any) => sum + (r.file_size || 0), 0);
      const localSizeBytes = localFiles.reduce((sum: number, r: any) => sum + (r.file_size || 0), 0);
      const totalSizeBytes = cloudSizeBytes + localSizeBytes;

      const percentageUsed = Math.min(100, Math.round((totalSizeBytes / storageLimitBytes) * 100));
      const warningLevel = getWarningLevel(percentageUsed);

      setStats({
        totalFiles: recordings.length,
        totalSizeBytes,
        cloudFiles: cloudFiles.length,
        localFiles: localFiles.length,
        cloudSizeBytes,
        localSizeBytes,
        percentageUsed,
        warningLevel
      });
      setError(null);
    } catch (err) {
      console.error('Error calculating storage stats:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [storageLimitBytes]);

  useEffect(() => {
    calculateStats();
    // Recalculate every 30 seconds
    const interval = setInterval(calculateStats, 30000);
    return () => clearInterval(interval);
  }, [calculateStats]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return {
    stats,
    isLoading,
    error,
    refetch: calculateStats,
    formatFileSize,
    storageTier,
    updateStorageTier,
    storageLimitBytes,
    storageLimitGB: parseInt(storageTier)
  };
};
