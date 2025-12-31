import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOPFSStorage, OPFSFile } from '@/hooks/useOPFSStorage';
import { useToast } from '@/hooks/use-toast';
import { 
  Video, 
  Image, 
  Download, 
  Trash2, 
  RefreshCw, 
  HardDrive,
  FileVideo,
  FileImage,
  FolderOpen
} from 'lucide-react';
import { format } from 'date-fns';

export const RecordingsLibrary = () => {
  const { toast } = useToast();
  const { 
    isSupported,
    isAuthenticated,
    listOPFSFiles, 
    deleteOPFSFile, 
    downloadOPFSFile,
    getStorageUsage 
  } = useOPFSStorage();
  
  const [files, setFiles] = useState<OPFSFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageUsage, setStorageUsage] = useState<{ used: number; available: number } | null>(null);
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const fileList = await listOPFSFiles();
      setFiles(fileList);
      
      const usage = await getStorageUsage();
      setStorageUsage(usage);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSupported && isAuthenticated) {
      loadFiles();
    } else {
      setIsLoading(false);
    }
  }, [isSupported, isAuthenticated]);

  const handleDownload = async (filename: string) => {
    const success = await downloadOPFSFile(filename);
    if (success) {
      toast({
        title: "Download Started",
        description: `Downloading ${filename}`,
      });
    } else {
      toast({
        title: "Download Failed",
        description: "Could not download the file",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (filename: string) => {
    setDeletingFiles(prev => new Set(prev).add(filename));
    
    const success = await deleteOPFSFile(filename);
    if (success) {
      setFiles(prev => prev.filter(f => f.name !== filename));
      toast({
        title: "File Deleted",
        description: `Removed ${filename}`,
      });
      // Refresh storage usage
      const usage = await getStorageUsage();
      setStorageUsage(usage);
    } else {
      toast({
        title: "Delete Failed",
        description: "Could not delete the file",
        variant: "destructive",
      });
    }
    
    setDeletingFiles(prev => {
      const next = new Set(prev);
      next.delete(filename);
      return next;
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getFileIcon = (type: string, name: string) => {
    if (type.startsWith('video/') || name.endsWith('.webm') || name.endsWith('.mp4')) {
      return <FileVideo className="h-5 w-5 text-blue-500" />;
    }
    if (type.startsWith('image/') || name.endsWith('.jpg') || name.endsWith('.png')) {
      return <FileImage className="h-5 w-5 text-green-500" />;
    }
    return <FolderOpen className="h-5 w-5 text-muted-foreground" />;
  };

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Browser Storage
          </CardTitle>
          <CardDescription>
            Your browser doesn't support the Origin Private File System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Automatic recording saves require a modern browser (Chrome 86+, Edge 86+, Opera 72+).
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Browser Storage
            </CardTitle>
            <CardDescription>
              {files.length} recording{files.length !== 1 ? 's' : ''} • {formatFileSize(totalSize)} used
              {storageUsage && (
                <span className="ml-2 text-xs">
                  ({((storageUsage.used / storageUsage.available) * 100).toFixed(1)}% of quota)
                </span>
              )}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={loadFiles}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No recordings saved yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Webcam recordings will automatically save here
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {getFileIcon(file.type, file.name)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {format(new Date(file.lastModified), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(file.name)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(file.name)}
                      disabled={deletingFiles.has(file.name)}
                      title="Delete"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className={`h-4 w-4 ${deletingFiles.has(file.name) ? 'animate-pulse' : ''}`} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
