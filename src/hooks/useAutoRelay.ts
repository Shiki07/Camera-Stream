import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const EDGE_FUNCTION_URL = 'https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/stream-relay';
const FRAME_INTERVAL = 66; // 15 fps
const HEARTBEAT_INTERVAL = 10000; // 10 seconds

interface UseAutoRelayProps {
  cameraId: string;
  isLocalWebcam: boolean;
  relayRoomId?: string | null;
  relayActive?: boolean;
}

export const useAutoRelay = ({
  cameraId,
  isLocalWebcam,
  relayRoomId: initialRelayRoomId,
  relayActive: initialRelayActive,
}: UseAutoRelayProps) => {
  const { user } = useAuth();
  const [isRelaying, setIsRelaying] = useState(false);
  const [relayRoomId, setRelayRoomId] = useState<string | null>(initialRelayRoomId || null);
  const [remoteFrameUrl, setRemoteFrameUrl] = useState<string | null>(null);
  const [relayError, setRelayError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pushIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pullIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);

  // Update relay status in database
  const updateRelayStatus = useCallback(async (roomId: string | null, active: boolean) => {
    if (!user) return;
    
    try {
      await supabase
        .from('camera_credentials')
        .update({
          relay_room_id: roomId,
          relay_active: active,
          relay_last_heartbeat: active ? new Date().toISOString() : null,
        })
        .eq('camera_url', cameraId)
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Failed to update relay status:', err);
    }
  }, [cameraId, user]);

  // Capture frame from video element
  const captureFrame = useCallback((): string | null => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video || video.readyState < 2) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.6);
  }, []);

  // Push frame to relay server
  const pushFrame = useCallback(async () => {
    if (!relayRoomId || !isRelaying) return;

    const frame = captureFrame();
    if (!frame) return;

    try {
      await fetch(`${EDGE_FUNCTION_URL}?action=push&roomId=${encodeURIComponent(relayRoomId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame,
          hostId: user?.id || 'anonymous',
          hostName: user?.email?.split('@')[0] || 'Anonymous',
        }),
      });
    } catch (error) {
      console.error('Push frame error:', error);
    }
  }, [relayRoomId, isRelaying, captureFrame, user]);

  // Pull frame from relay server (for remote viewing)
  const pullFrame = useCallback(async () => {
    if (!relayRoomId || isLocalWebcam) return;

    try {
      const response = await fetch(`${EDGE_FUNCTION_URL}?action=pull&roomId=${encodeURIComponent(relayRoomId)}`);
      
      if (response.status === 404 || response.status === 410) {
        setRelayError('Stream not available');
        return;
      }

      if (!response.ok) return;

      const data = await response.json();
      if (data.frame) {
        setRemoteFrameUrl(data.frame);
        setRelayError(null);
      }
    } catch (error) {
      console.error('Pull frame error:', error);
    }
  }, [relayRoomId, isLocalWebcam]);

  // Heartbeat to keep relay alive
  const sendHeartbeat = useCallback(async () => {
    if (!user || !relayRoomId) return;
    
    try {
      await supabase
        .from('camera_credentials')
        .update({ relay_last_heartbeat: new Date().toISOString() })
        .eq('camera_url', cameraId)
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Heartbeat failed:', err);
    }
  }, [cameraId, user, relayRoomId]);

  // Start relaying (for local webcam)
  const startRelay = useCallback(async (video: HTMLVideoElement) => {
    if (!user || !isLocalWebcam) return;
    
    console.log('Starting auto-relay for webcam:', cameraId);
    
    videoRef.current = video;
    canvasRef.current = document.createElement('canvas');
    
    const newRoomId = `auto_${user.id}_${Date.now()}`;
    setRelayRoomId(newRoomId);
    setIsRelaying(true);
    
    // Update database
    await updateRelayStatus(newRoomId, true);
    
    // Start pushing frames
    pushIntervalRef.current = setInterval(pushFrame, FRAME_INTERVAL);
    
    // Start heartbeat
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    
    // Push first frame immediately
    setTimeout(pushFrame, 100);
  }, [user, isLocalWebcam, cameraId, updateRelayStatus, pushFrame, sendHeartbeat]);

  // Start viewing relay (for remote webcam)
  const startViewing = useCallback(() => {
    if (!relayRoomId || isLocalWebcam) return;
    
    console.log('Starting relay view for remote webcam:', cameraId, 'room:', relayRoomId);
    
    // Start pulling frames
    pullIntervalRef.current = setInterval(pullFrame, FRAME_INTERVAL);
    pullFrame(); // Pull immediately
  }, [relayRoomId, isLocalWebcam, cameraId, pullFrame]);

  // Stop relay
  const stopRelay = useCallback(async () => {
    console.log('Stopping relay for:', cameraId);
    
    // Clear intervals
    if (pushIntervalRef.current) {
      clearInterval(pushIntervalRef.current);
      pushIntervalRef.current = null;
    }
    if (pullIntervalRef.current) {
      clearInterval(pullIntervalRef.current);
      pullIntervalRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    // Notify relay server
    if (isRelaying && relayRoomId) {
      try {
        await fetch(`${EDGE_FUNCTION_URL}?action=stop&roomId=${encodeURIComponent(relayRoomId)}`, {
          method: 'POST',
        });
      } catch (err) {
        console.error('Failed to stop relay on server:', err);
      }
    }
    
    // Update database
    if (isLocalWebcam) {
      await updateRelayStatus(null, false);
    }
    
    setIsRelaying(false);
    setRemoteFrameUrl(null);
    videoRef.current = null;
    canvasRef.current = null;
  }, [cameraId, isRelaying, relayRoomId, isLocalWebcam, updateRelayStatus]);

  // Update push interval when relayRoomId changes
  useEffect(() => {
    if (isRelaying && relayRoomId && pushIntervalRef.current) {
      clearInterval(pushIntervalRef.current);
      pushIntervalRef.current = setInterval(pushFrame, FRAME_INTERVAL);
    }
  }, [isRelaying, relayRoomId, pushFrame]);

  // Cleanup on unmount
  useEffect(() => {
    isActiveRef.current = true;
    
    return () => {
      isActiveRef.current = false;
      stopRelay();
    };
  }, []);

  // Auto-start viewing for remote webcam with active relay
  useEffect(() => {
    if (!isLocalWebcam && initialRelayActive && initialRelayRoomId) {
      setRelayRoomId(initialRelayRoomId);
      startViewing();
    }
  }, [isLocalWebcam, initialRelayActive, initialRelayRoomId, startViewing]);

  return {
    isRelaying,
    relayRoomId,
    remoteFrameUrl,
    relayError,
    startRelay,
    stopRelay,
    startViewing,
  };
};
