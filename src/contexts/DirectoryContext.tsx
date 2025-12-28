import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { get, set, del } from 'idb-keyval';

const DIRECTORY_HANDLE_KEY = 'selectedDirectoryHandle';
const DIRECTORY_NAME_KEY = 'selectedDirectoryName';

interface DirectoryContextType {
  directoryHandle: FileSystemDirectoryHandle | null;
  directoryPath: string | null;
  isSupported: boolean;
  isRestoring: boolean;
  pickDirectory: () => Promise<FileSystemDirectoryHandle | null>;
  saveFileToDirectory: (blob: Blob, filename: string) => Promise<boolean>;
  clearDirectory: () => void;
  getStoredDirectoryName: () => string | null;
  requestPermission: () => Promise<boolean>;
}

const DirectoryContext = createContext<DirectoryContextType | undefined>(undefined);

export const DirectoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [directoryPath, setDirectoryPath] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const isSupported = 'showDirectoryPicker' in window;

  // Try to restore directory handle from IndexedDB on mount
  useEffect(() => {
    const restoreHandle = async () => {
      try {
        const storedHandle = await get<FileSystemDirectoryHandle>(DIRECTORY_HANDLE_KEY);
        if (storedHandle) {
          // Check if we still have permission
          const permissionStatus = await (storedHandle as any).queryPermission({ mode: 'readwrite' });
          
          if (permissionStatus === 'granted') {
            setDirectoryHandle(storedHandle);
            setDirectoryPath(storedHandle.name);
            console.log('Directory handle restored with permission:', storedHandle.name);
          } else {
            // Handle exists but permission expired - store it for later re-request
            setDirectoryHandle(storedHandle);
            setDirectoryPath(storedHandle.name);
            console.log('Directory handle restored, permission needs re-grant:', storedHandle.name);
          }
        } else {
          // Fallback to localStorage for name display
          const storedName = localStorage.getItem(DIRECTORY_NAME_KEY);
          if (storedName) {
            setDirectoryPath(storedName);
          }
        }
      } catch (error) {
        console.error('Error restoring directory handle:', error);
        // Fallback to localStorage
        const storedName = localStorage.getItem(DIRECTORY_NAME_KEY);
        if (storedName) {
          setDirectoryPath(storedName);
        }
      } finally {
        setIsRestoring(false);
      }
    };

    if (isSupported) {
      restoreHandle();
    } else {
      setIsRestoring(false);
    }
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!directoryHandle) {
      return false;
    }

    try {
      const permissionStatus = await (directoryHandle as any).queryPermission({ mode: 'readwrite' });
      
      if (permissionStatus === 'granted') {
        return true;
      }

      // Request permission
      const requestStatus = await (directoryHandle as any).requestPermission({ mode: 'readwrite' });
      
      if (requestStatus === 'granted') {
        toast({
          title: "Permission Granted",
          description: `Recordings will save to: ${directoryHandle.name}`,
        });
        return true;
      } else {
        toast({
          title: "Permission Denied",
          description: "Recordings will save to browser storage instead.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  }, [directoryHandle, toast]);

  const pickDirectory = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support folder selection. Recordings will save automatically to browser storage.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'downloads'
      });

      // Verify we have write permission
      const permissionStatus = await dirHandle.queryPermission({ mode: 'readwrite' });
      
      if (permissionStatus !== 'granted') {
        const requestStatus = await dirHandle.requestPermission({ mode: 'readwrite' });
        if (requestStatus !== 'granted') {
          toast({
            title: "Permission Denied",
            description: "Write permission is required to save recordings.",
            variant: "destructive",
          });
          return null;
        }
      }

      setDirectoryHandle(dirHandle);
      setDirectoryPath(dirHandle.name);

      // Save handle to IndexedDB for persistence
      try {
        await set(DIRECTORY_HANDLE_KEY, dirHandle);
        localStorage.setItem(DIRECTORY_NAME_KEY, dirHandle.name);
      } catch (error) {
        console.error('Error saving directory handle:', error);
      }

      toast({
        title: "Folder Selected",
        description: `Recordings will be saved to: ${dirHandle.name}`,
      });

      return dirHandle;
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error selecting directory:', error);
        toast({
          title: "Error",
          description: "Failed to select folder. Please try again.",
          variant: "destructive",
        });
      }
      return null;
    }
  }, [isSupported, toast]);

  const saveFileToDirectory = useCallback(async (
    blob: Blob,
    filename: string
  ): Promise<boolean> => {
    if (!directoryHandle) {
      console.log('No directory selected, using OPFS fallback');
      return false;
    }

    try {
      // Verify permission is still granted
      const permissionStatus = await (directoryHandle as any).queryPermission({ mode: 'readwrite' });
      if (permissionStatus !== 'granted') {
        console.log('Directory permission expired, using OPFS fallback');
        return false;
      }

      // Create the file in the selected directory
      const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      console.log(`File saved to directory: ${filename}`);
      return true;
    } catch (error) {
      console.error('Error saving file to directory:', error);
      return false;
    }
  }, [directoryHandle]);

  const clearDirectory = useCallback(async () => {
    setDirectoryHandle(null);
    setDirectoryPath(null);
    
    try {
      await del(DIRECTORY_HANDLE_KEY);
      localStorage.removeItem(DIRECTORY_NAME_KEY);
    } catch (error) {
      console.error('Error clearing directory:', error);
    }

    toast({
      title: "Folder Cleared",
      description: "Recordings will save to browser storage automatically.",
    });
  }, [toast]);

  const getStoredDirectoryName = useCallback(() => {
    try {
      return localStorage.getItem(DIRECTORY_NAME_KEY);
    } catch (error) {
      console.error('Error reading directory from localStorage:', error);
      return null;
    }
  }, []);

  return (
    <DirectoryContext.Provider value={{
      directoryHandle,
      directoryPath,
      isSupported,
      isRestoring,
      pickDirectory,
      saveFileToDirectory,
      clearDirectory,
      getStoredDirectoryName,
      requestPermission
    }}>
      {children}
    </DirectoryContext.Provider>
  );
};

export const useSharedDirectory = () => {
  const context = useContext(DirectoryContext);
  if (context === undefined) {
    throw new Error('useSharedDirectory must be used within a DirectoryProvider');
  }
  return context;
};
