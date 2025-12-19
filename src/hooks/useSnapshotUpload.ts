import { useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useSnapshotUpload = () => {
  const { session } = useAuth();
  const uploadIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const uploadSnapshot = useCallback(async (
    cameraId: string,
    videoElement: HTMLVideoElement | null
  ): Promise<boolean> => {
    if (!session?.access_token || !videoElement) {
      return false;
    }

    try {
      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      ctx.drawImage(videoElement, 0, 0);
      
      // Convert to base64
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64Data = dataUrl.split(',')[1];

      // Upload to edge function
      const response = await fetch(
        `https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/camera-snapshot?action=upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            camera_id: cameraId,
            image_data: base64Data,
            content_type: 'image/jpeg',
          }),
        }
      );

      if (!response.ok) {
        console.error('Snapshot upload failed:', response.status);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error uploading snapshot:', error);
      return false;
    }
  }, [session?.access_token]);

  const startAutoUpload = useCallback((
    cameraId: string,
    videoElement: HTMLVideoElement | null,
    intervalMs: number = 10000
  ) => {
    // Clear any existing interval
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current);
    }

    // Start new interval
    uploadIntervalRef.current = setInterval(() => {
      uploadSnapshot(cameraId, videoElement);
    }, intervalMs);

    // Upload immediately
    uploadSnapshot(cameraId, videoElement);

    return () => {
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
        uploadIntervalRef.current = null;
      }
    };
  }, [uploadSnapshot]);

  const stopAutoUpload = useCallback(() => {
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = null;
    }
  }, []);

  return {
    uploadSnapshot,
    startAutoUpload,
    stopAutoUpload,
  };
};
