import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface OPFSFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

const RECORDINGS_FOLDER = 'recordings';

export const useOPFSStorage = () => {
  const { user } = useAuth();
  const [isSupported] = useState(() => 'storage' in navigator && 'getDirectory' in navigator.storage);

  const getUserRecordingsDirectory = useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
    if (!isSupported) return null;
    
    // SECURITY: Require authenticated user for storage access
    if (!user?.id) {
      console.warn('OPFS: No authenticated user, cannot access storage');
      return null;
    }

    try {
      const root = await navigator.storage.getDirectory();
      // Create base recordings folder
      const recordingsDir = await root.getDirectoryHandle(RECORDINGS_FOLDER, { create: true });
      // Create user-specific subfolder for isolation
      const userDir = await recordingsDir.getDirectoryHandle(user.id, { create: true });
      return userDir;
    } catch (error) {
      console.error('Error accessing OPFS:', error);
      return null;
    }
  }, [isSupported, user?.id]);

  const saveToOPFS = useCallback(async (blob: Blob, filename: string): Promise<boolean> => {
    if (!isSupported) {
      console.log('OPFS not supported');
      return false;
    }

    if (!user?.id) {
      console.warn('OPFS: Cannot save without authenticated user');
      return false;
    }

    try {
      const userDir = await getUserRecordingsDirectory();
      if (!userDir) return false;

      const fileHandle = await userDir.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      console.log(`File saved to OPFS (user-scoped): ${filename}`);
      return true;
    } catch (error) {
      console.error('Error saving to OPFS:', error);
      return false;
    }
  }, [isSupported, user?.id, getUserRecordingsDirectory]);

  const listOPFSFiles = useCallback(async (): Promise<OPFSFile[]> => {
    if (!isSupported) return [];
    
    if (!user?.id) {
      console.warn('OPFS: Cannot list files without authenticated user');
      return [];
    }

    try {
      const userDir = await getUserRecordingsDirectory();
      if (!userDir) return [];

      const files: OPFSFile[] = [];
      
      for await (const [name, handle] of (userDir as any).entries()) {
        if (handle.kind === 'file') {
          try {
            const file = await (handle as FileSystemFileHandle).getFile();
            files.push({
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified
            });
          } catch (err) {
            console.warn('Could not read file:', name, err);
          }
        }
      }

      // Sort by most recent first
      files.sort((a, b) => b.lastModified - a.lastModified);
      return files;
    } catch (error) {
      console.error('Error listing OPFS files:', error);
      return [];
    }
  }, [isSupported, user?.id, getUserRecordingsDirectory]);

  const getOPFSFile = useCallback(async (filename: string): Promise<File | null> => {
    if (!isSupported) return null;
    
    if (!user?.id) {
      console.warn('OPFS: Cannot get file without authenticated user');
      return null;
    }

    try {
      const userDir = await getUserRecordingsDirectory();
      if (!userDir) return null;

      const fileHandle = await userDir.getFileHandle(filename);
      return await fileHandle.getFile();
    } catch (error) {
      console.error('Error getting OPFS file:', error);
      return null;
    }
  }, [isSupported, user?.id, getUserRecordingsDirectory]);

  const deleteOPFSFile = useCallback(async (filename: string): Promise<boolean> => {
    if (!isSupported) return false;
    
    if (!user?.id) {
      console.warn('OPFS: Cannot delete file without authenticated user');
      return false;
    }

    try {
      const userDir = await getUserRecordingsDirectory();
      if (!userDir) return false;

      await userDir.removeEntry(filename);
      console.log(`File deleted from OPFS (user-scoped): ${filename}`);
      return true;
    } catch (error) {
      console.error('Error deleting OPFS file:', error);
      return false;
    }
  }, [isSupported, user?.id, getUserRecordingsDirectory]);

  const downloadOPFSFile = useCallback(async (filename: string): Promise<boolean> => {
    const file = await getOPFSFile(filename);
    if (!file) return false;

    try {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Error downloading OPFS file:', error);
      return false;
    }
  }, [getOPFSFile]);

  const getStorageUsage = useCallback(async (): Promise<{ used: number; available: number } | null> => {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) {
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0
      };
    } catch (error) {
      console.error('Error getting storage estimate:', error);
      return null;
    }
  }, []);

  // Clear all recordings for the current user (useful for privacy cleanup)
  const clearUserRecordings = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user?.id) return false;

    try {
      const root = await navigator.storage.getDirectory();
      const recordingsDir = await root.getDirectoryHandle(RECORDINGS_FOLDER, { create: false });
      
      // Remove the user's directory entirely
      await recordingsDir.removeEntry(user.id, { recursive: true });
      console.log('Cleared all user recordings from OPFS');
      return true;
    } catch (error) {
      // Directory might not exist, which is fine
      console.log('No user recordings to clear or error:', error);
      return false;
    }
  }, [isSupported, user?.id]);

  return {
    isSupported,
    isAuthenticated: !!user?.id,
    saveToOPFS,
    listOPFSFiles,
    getOPFSFile,
    deleteOPFSFile,
    downloadOPFSFile,
    getStorageUsage,
    clearUserRecordings
  };
};
