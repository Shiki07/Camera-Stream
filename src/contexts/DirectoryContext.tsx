import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface DirectoryContextType {
  directoryHandle: FileSystemDirectoryHandle | null;
  directoryPath: string | null;
  isSupported: boolean;
  pickDirectory: () => Promise<FileSystemDirectoryHandle | null>;
  saveFileToDirectory: (blob: Blob, filename: string) => Promise<boolean>;
  clearDirectory: () => void;
  getStoredDirectoryName: () => string | null;
}

const DirectoryContext = createContext<DirectoryContextType | undefined>(undefined);

export const DirectoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [directoryPath, setDirectoryPath] = useState<string | null>(null);
  const isSupported = 'showDirectoryPicker' in window;

  // Try to restore directory name from localStorage on mount
  useEffect(() => {
    const storedName = localStorage.getItem('selectedDirectoryName');
    if (storedName) {
      setDirectoryPath(storedName);
    }
  }, []);

  const pickDirectory = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support folder selection. Files will be downloaded to your default Downloads folder.",
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

      // Save to localStorage
      try {
        localStorage.setItem('selectedDirectoryName', dirHandle.name);
      } catch (error) {
        console.error('Error saving directory to localStorage:', error);
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
      console.log('No directory selected, falling back to regular download');
      return false;
    }

    try {
      // Verify permission is still granted (using 'any' since TypeScript doesn't have full File System Access API types)
      const permissionStatus = await (directoryHandle as any).queryPermission({ mode: 'readwrite' });
      if (permissionStatus !== 'granted') {
        console.log('Directory permission expired, falling back to regular download');
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
      toast({
        title: "Save Error",
        description: "Failed to save to selected folder. Using default download location.",
        variant: "destructive",
      });
      return false;
    }
  }, [directoryHandle, toast]);

  const clearDirectory = useCallback(() => {
    setDirectoryHandle(null);
    setDirectoryPath(null);
    
    try {
      localStorage.removeItem('selectedDirectoryName');
    } catch (error) {
      console.error('Error clearing directory from localStorage:', error);
    }

    toast({
      title: "Folder Cleared",
      description: "Recordings will use the default download location.",
    });
  }, [toast]);

  const getStoredDirectoryName = useCallback(() => {
    try {
      return localStorage.getItem('selectedDirectoryName');
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
      pickDirectory,
      saveFileToDirectory,
      clearDirectory,
      getStoredDirectoryName
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
