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
  const relayRoomIdRef = useRef<string | null>(null);
  const isRelayingRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    relayRoomIdRef.current = relayRoomId;
  }, [relayRoomId]);

  useEffect(() => {
    isRelayingRef.current = isRelaying;
  }, [isRelaying]);

  // Capture frame from video element (optimized: 320x240 @ 50% JPEG quality)
  const captureFrame = useCallback((): string | null => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video || video.readyState < 2) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fixed smaller resolution for faster relay
    canvas.width = 320;
    canvas.height = 240;
    ctx.drawImage(video, 0, 0, 320, 240);
    return canvas.toDataURL('image/jpeg', 0.5);
  }, []);

  // Push frame to relay server (uses refs for current values)
  const pushFrame = useCallback(async () => {
    const currentRoomId = relayRoomIdRef.current;
    if (!currentRoomId || !isRelayingRef.current) return;

    const frame = captureFrame();
    if (!frame) return;

    try {
      await fetch(`${EDGE_FUNCTION_URL}?action=push&roomId=${encodeURIComponent(currentRoomId)}`, {
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
  }, [captureFrame, user]);

  // Pull frame from relay server (for remote viewing)
  const pullFrame = useCallback(async () => {
    const currentRoomId = relayRoomIdRef.current;
    if (!currentRoomId || isLocalWebcam) return;

    try {
      const response = await fetch(`${EDGE_FUNCTION_URL}?action=pull&roomId=${encodeURIComponent(currentRoomId)}`);
      
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
  }, [isLocalWebcam]);

  // Heartbeat to keep relay alive
  const sendHeartbeat = useCallback(async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('camera_credentials')
        .update({ relay_last_heartbeat: new Date().toISOString() })
        .eq('camera_url', cameraId)
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Heartbeat failed:', err);
    }
  }, [cameraId, user]);

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
      console.log('Updated relay status in DB:', { roomId, active });
    } catch (err) {
      console.error('Failed to update relay status:', err);
    }
  }, [cameraId, user]);

  // Start relaying (for local webcam)
  const startRelay = useCallback(async (video: HTMLVideoElement) => {
    if (!user || !isLocalWebcam || isRelayingRef.current) return;
    
    console.log('Starting auto-relay for webcam:', cameraId);
    
    videoRef.current = video;
    canvasRef.current = document.createElement('canvas');
    
    const newRoomId = `auto_${user.id}_${Date.now()}`;
    
    // Set refs first so pushFrame can use them immediately
    relayRoomIdRef.current = newRoomId;
    isRelayingRef.current = true;
    
    // Then update state
    setRelayRoomId(newRoomId);
    setIsRelaying(true);
    
    // Update database
    await updateRelayStatus(newRoomId, true);
    
    // Clear any existing intervals
    if (pushIntervalRef.current) clearInterval(pushIntervalRef.current);
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    
    // Start pushing frames
    pushIntervalRef.current = setInterval(pushFrame, FRAME_INTERVAL);
    
    // Start heartbeat
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    
    // Push first frame immediately
    setTimeout(pushFrame, 100);
  }, [user, isLocalWebcam, cameraId, updateRelayStatus, pushFrame, sendHeartbeat]);

  // Start viewing relay (for remote webcam)
  const startViewing = useCallback(() => {
    const currentRoomId = relayRoomIdRef.current;
    if (!currentRoomId || isLocalWebcam) return;
    
    console.log('Starting relay view for remote webcam:', cameraId, 'room:', currentRoomId);
    
    // Clear any existing interval
    if (pullIntervalRef.current) clearInterval(pullIntervalRef.current);
    
    // Start pulling frames (slower interval for viewers - 10fps)
    pullIntervalRef.current = setInterval(pullFrame, 100);
    pullFrame(); // Pull immediately
  }, [isLocalWebcam, cameraId, pullFrame]);

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
    
    const currentRoomId = relayRoomIdRef.current;
    
    // Notify relay server
    if (isRelayingRef.current && currentRoomId) {
      try {
        await fetch(`${EDGE_FUNCTION_URL}?action=stop&roomId=${encodeURIComponent(currentRoomId)}`, {
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
    
    isRelayingRef.current = false;
    relayRoomIdRef.current = null;
    setIsRelaying(false);
    setRemoteFrameUrl(null);
    videoRef.current = null;
    canvasRef.current = null;
  }, [cameraId, isLocalWebcam, updateRelayStatus]);

  // Cleanup on unmount
  useEffect(() => {
    isActiveRef.current = true;
    
    return () => {
      isActiveRef.current = false;
      // Clear intervals directly without async cleanup
      if (pushIntervalRef.current) clearInterval(pushIntervalRef.current);
      if (pullIntervalRef.current) clearInterval(pullIntervalRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, []);

  // Auto-start viewing for remote webcam with active relay
  useEffect(() => {
    if (!isLocalWebcam && initialRelayActive && initialRelayRoomId) {
      console.log('Auto-starting viewer for remote webcam relay:', initialRelayRoomId);
      relayRoomIdRef.current = initialRelayRoomId;
      setRelayRoomId(initialRelayRoomId);
      
      // Small delay to ensure state is set
      setTimeout(() => {
        startViewing();
      }, 100);
    }
  }, [isLocalWebcam, initialRelayActive, initialRelayRoomId]);

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
