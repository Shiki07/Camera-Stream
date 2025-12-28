import { useCallback, useState } from 'react';

export interface OPFSFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

const RECORDINGS_FOLDER = 'recordings';

export const useOPFSStorage = () => {
  const [isSupported] = useState(() => 'storage' in navigator && 'getDirectory' in navigator.storage);

  const getRecordingsDirectory = useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
    if (!isSupported) return null;

    try {
      const root = await navigator.storage.getDirectory();
      const recordingsDir = await root.getDirectoryHandle(RECORDINGS_FOLDER, { create: true });
      return recordingsDir;
    } catch (error) {
      console.error('Error accessing OPFS:', error);
      return null;
    }
  }, [isSupported]);

  const saveToOPFS = useCallback(async (blob: Blob, filename: string): Promise<boolean> => {
    if (!isSupported) {
      console.log('OPFS not supported');
      return false;
    }

    try {
      const recordingsDir = await getRecordingsDirectory();
      if (!recordingsDir) return false;

      const fileHandle = await recordingsDir.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      console.log(`File saved to OPFS: ${filename}`);
      return true;
    } catch (error) {
      console.error('Error saving to OPFS:', error);
      return false;
    }
  }, [isSupported, getRecordingsDirectory]);

  const listOPFSFiles = useCallback(async (): Promise<OPFSFile[]> => {
    if (!isSupported) return [];

    try {
      const recordingsDir = await getRecordingsDirectory();
      if (!recordingsDir) return [];

      const files: OPFSFile[] = [];
      
      for await (const [name, handle] of (recordingsDir as any).entries()) {
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
  }, [isSupported, getRecordingsDirectory]);

  const getOPFSFile = useCallback(async (filename: string): Promise<File | null> => {
    if (!isSupported) return null;

    try {
      const recordingsDir = await getRecordingsDirectory();
      if (!recordingsDir) return null;

      const fileHandle = await recordingsDir.getFileHandle(filename);
      return await fileHandle.getFile();
    } catch (error) {
      console.error('Error getting OPFS file:', error);
      return null;
    }
  }, [isSupported, getRecordingsDirectory]);

  const deleteOPFSFile = useCallback(async (filename: string): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const recordingsDir = await getRecordingsDirectory();
      if (!recordingsDir) return false;

      await recordingsDir.removeEntry(filename);
      console.log(`File deleted from OPFS: ${filename}`);
      return true;
    } catch (error) {
      console.error('Error deleting OPFS file:', error);
      return false;
    }
  }, [isSupported, getRecordingsDirectory]);

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

  return {
    isSupported,
    saveToOPFS,
    listOPFSFiles,
    getOPFSFile,
    deleteOPFSFile,
    downloadOPFSFile,
    getStorageUsage
  };
};
