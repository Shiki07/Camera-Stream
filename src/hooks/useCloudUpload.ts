import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CloudStorageFactory } from '@/services/cloudStorage/CloudStorageFactory';
import { CloudStorageConfig } from '@/services/cloudStorage/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getRecordingPath } from '@/utils/folderStructure';

interface UploadOptions {
  fileType: 'video' | 'image';
  motionDetected?: boolean;
  cameraId?: string;
  dateOrganized?: boolean;
}

interface UploadResult {
  success: boolean;
  fileId?: string;
  filePath?: string;
  error?: string;
}

export const useCloudUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  const getConfig = useCallback((): CloudStorageConfig | null => {
    try {
      const configStr = localStorage.getItem('cloudStorageConfig');
      if (!configStr) return null;
      return JSON.parse(configStr);
    } catch {
      return null;
    }
  }, []);

  const isConfigured = useCallback((): boolean => {
    const config = getConfig();
    if (!config || config.provider === 'none') return false;
    
    const provider = CloudStorageFactory.getProvider(config.provider);
    return provider?.isConfigured() ?? false;
  }, [getConfig]);

  const uploadToCloud = useCallback(async (
    blob: Blob,
    filename: string,
    options: UploadOptions
  ): Promise<UploadResult> => {
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    const config = getConfig();
    if (!config || config.provider === 'none') {
      return { success: false, error: 'No cloud storage configured' };
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // For S3, use edge function
      if (config.provider === 's3') {
        return await uploadToS3ViaEdge(blob, filename, options, config);
      }

      // For other providers, use direct upload
      const provider = CloudStorageFactory.getProvider(config.provider);
      if (!provider) {
        throw new Error('Provider not available');
      }

      await provider.configure(config);
      if (!provider.isConfigured()) {
        throw new Error('Provider not properly configured');
      }

      setUploadProgress(30);

      const folderPath = getRecordingPath({
        basePath: user.id,
        dateOrganized: options.dateOrganized ?? true,
        motionDetected: options.motionDetected
      });

      setUploadProgress(50);

      const uploadResult = await provider.upload(blob, filename, folderPath);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      setUploadProgress(80);

      // Save metadata to database
      await supabase.from('recordings').insert({
        user_id: user.id,
        filename,
        storage_type: 'cloud',
        storage_path: uploadResult.fileId || uploadResult.filePath || filename,
        file_size: blob.size,
        motion_detected: options.motionDetected || false,
        camera_id: options.cameraId
      });

      setUploadProgress(100);

      toast({
        title: "Upload complete",
        description: `${options.fileType} saved to ${provider.name}`
      });

      return {
        success: true,
        fileId: uploadResult.fileId,
        filePath: uploadResult.filePath
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive"
      });
      return { success: false, error: message };
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [user, getConfig, toast]);

  const uploadToS3ViaEdge = async (
    blob: Blob,
    filename: string,
    options: UploadOptions,
    config: CloudStorageConfig
  ): Promise<UploadResult> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      setUploadProgress(20);

      // Convert blob to base64
      const buffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

      setUploadProgress(40);

      const folderPath = getRecordingPath({
        basePath: user!.id,
        dateOrganized: options.dateOrganized ?? true,
        motionDetected: options.motionDetected
      });

      const { data, error } = await supabase.functions.invoke('s3-upload', {
        body: {
          filename,
          fileData: base64,
          contentType: blob.type,
          path: folderPath,
          bucketName: config.credentials?.bucketName,
          region: config.credentials?.region
        }
      });

      if (error) throw error;

      setUploadProgress(90);

      // Save metadata to database
      await supabase.from('recordings').insert({
        user_id: user!.id,
        filename,
        storage_type: 'cloud',
        storage_path: data.key || filename,
        file_size: blob.size,
        motion_detected: options.motionDetected || false,
        camera_id: options.cameraId
      });

      setUploadProgress(100);

      return {
        success: true,
        fileId: data.key,
        filePath: data.location
      };

    } catch (error) {
      throw error;
    }
  };

  return {
    uploadToCloud,
    isUploading,
    uploadProgress,
    isConfigured,
    getConfig
  };
};
