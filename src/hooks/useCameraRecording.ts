import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CameraRecordingOptions {
  cameraUrl: string;
  cameraName: string;
  quality: 'high' | 'medium' | 'low';
  motionTriggered?: boolean;
  videoPath?: string;
}

export const useCameraRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [piServiceConnected, setPiServiceConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionCacheRef = useRef<{ timestamp: number; connected: boolean } | null>(null);

  // Extract Pi URL from camera URL
  const getPiUrl = useCallback((cameraUrl: string) => {
    try {
      const url = new URL(cameraUrl);
      return `http://${url.hostname}:3002`;
    } catch {
      return null;
    }
  }, []);

  // Test Pi service connection
  const testPiConnection = useCallback(async (cameraUrl: string) => {
    const piUrl = getPiUrl(cameraUrl);
    if (!piUrl) {
      setPiServiceConnected(false);
      return false;
    }

    // Check cache (60 second TTL)
    const now = Date.now();
    if (connectionCacheRef.current && 
        connectionCacheRef.current.connected &&
        (now - connectionCacheRef.current.timestamp) < 60000) {
      setPiServiceConnected(true);
      return true;
    }

    try {
      const { data, error } = await supabase.functions.invoke('test-pi-connection', {
        body: { pi_endpoint: piUrl }
      });

      const connected = !error && data?.success;
      setPiServiceConnected(connected);
      
      if (connected) {
        connectionCacheRef.current = { timestamp: now, connected: true };
      }
      
      return connected;
    } catch {
      setPiServiceConnected(false);
      return false;
    }
  }, [getPiUrl]);

  // Start recording
  const startRecording = useCallback(async (options: CameraRecordingOptions) => {
    if (!user) {
      setError('Authentication required');
      return null;
    }

    if (isRecording) {
      setError('Already recording');
      return null;
    }

    const piUrl = getPiUrl(options.cameraUrl);
    if (!piUrl) {
      setError('Invalid camera URL');
      return null;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const newRecordingId = crypto.randomUUID();

      const { data, error: fnError } = await supabase.functions.invoke('pi-recording', {
        body: {
          action: 'start',
          pi_url: piUrl,
          recording_id: newRecordingId,
          stream_url: options.cameraUrl,
          quality: options.quality,
          motion_triggered: options.motionTriggered || false,
          video_path: options.videoPath || '/home/pi/Videos',
          camera_name: options.cameraName
        }
      });

      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Failed to start recording');

      setIsRecording(true);
      setRecordingId(newRecordingId);
      setRecordingDuration(0);

      // Start duration counter
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      return newRecordingId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [user, isRecording, getPiUrl]);

  // Stop recording - shows "stopping" state during the process
  const stopRecording = useCallback(async (cameraUrl: string) => {
    if (!recordingId) {
      setError('No active recording');
      return null;
    }

    const piUrl = getPiUrl(cameraUrl);
    if (!piUrl) {
      setError('Invalid camera URL');
      return null;
    }

    const currentRecordingId = recordingId;

    // Show "stopping" state - recording still shows but with stopping indicator
    setIsStopping(true);
    setIsProcessing(true);

    // Clear duration interval immediately
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    try {
      // Fire and don't block UI - use shorter timeout via AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout for graceful stop

      const { data, error: fnError } = await supabase.functions.invoke('pi-recording', {
        body: {
          action: 'stop',
          pi_url: piUrl,
          recording_id: currentRecordingId
        }
      });

      clearTimeout(timeoutId);

      if (fnError) throw fnError;
      if (!data?.success && !data?.already_stopped) throw new Error(data?.error || 'Failed to stop recording');

      // Now mark as fully stopped
      setIsRecording(false);
      setRecordingId(null);
      setRecordingDuration(0);

      return data;
    } catch (err) {
      // Log error but still mark as stopped locally
      console.warn('Stop recording request failed:', err instanceof Error ? err.message : err);
      setError(err instanceof Error ? err.message : 'Stop request failed - recording may still be active on Pi');
      
      // Still clear recording state on error
      setIsRecording(false);
      setRecordingId(null);
      setRecordingDuration(0);
      
      return null;
    } finally {
      setIsProcessing(false);
      setIsStopping(false);
    }
  }, [recordingId, getPiUrl]);

  // Format duration for display
  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isRecording,
    isProcessing,
    isStopping,
    recordingId,
    recordingDuration,
    formattedDuration: formatDuration(recordingDuration),
    piServiceConnected,
    error,
    startRecording,
    stopRecording,
    testPiConnection,
    clearError: () => setError(null),
  };
};
