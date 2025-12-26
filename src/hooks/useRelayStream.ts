import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const EDGE_FUNCTION_URL = 'https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/stream-relay';
const FRAME_INTERVAL = 100; // Send frame every 100ms (10 fps)
const PULL_INTERVAL = 100; // Pull frames every 100ms

export interface StreamRoom {
  roomId: string;
  hostId: string;
  hostName: string;
  createdAt: string;
}

export interface RelayStreamSource {
  type: 'webcam' | 'network-camera';
  name: string;
  deviceId?: string;
  // For network cameras - image element to capture from
  imageElement?: HTMLImageElement;
}

export const useRelayStream = () => {
  const { user } = useAuth();
  const [isHosting, setIsHosting] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteFrameUrl, setRemoteFrameUrl] = useState<string | null>(null);
  const [availableRooms, setAvailableRooms] = useState<StreamRoom[]>([]);
  const [selectedSource, setSelectedSource] = useState<RelayStreamSource | null>(null);
  const [streamStatus, setStreamStatus] = useState<'idle' | 'connecting' | 'streaming' | 'error'>('idle');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pushIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pullIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const networkImgRef = useRef<HTMLImageElement | null>(null);

  // Capture frame from video or image element
  const captureFrame = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Capture from video element (webcam)
    if (videoRef.current && videoRef.current.readyState >= 2) {
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      ctx.drawImage(videoRef.current, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.6); // 60% quality for bandwidth
    }

    // Capture from image element (network camera)
    if (networkImgRef.current && networkImgRef.current.complete) {
      canvas.width = networkImgRef.current.naturalWidth || 640;
      canvas.height = networkImgRef.current.naturalHeight || 480;
      ctx.drawImage(networkImgRef.current, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.6);
    }

    return null;
  }, []);

  // Push frame to server
  const pushFrame = useCallback(async () => {
    if (!roomId || !isHosting) return;

    const frame = captureFrame();
    if (!frame) return;

    try {
      const response = await fetch(`${EDGE_FUNCTION_URL}?action=push&roomId=${encodeURIComponent(roomId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame,
          hostId: user?.id || 'anonymous',
          hostName: user?.email?.split('@')[0] || 'Anonymous',
        }),
      });

      if (!response.ok) {
        console.error('Failed to push frame:', await response.text());
      }
    } catch (error) {
      console.error('Push frame error:', error);
    }
  }, [roomId, isHosting, captureFrame, user]);

  // Pull frame from server
  const pullFrame = useCallback(async () => {
    if (!roomId || !isViewing) return;

    try {
      const response = await fetch(`${EDGE_FUNCTION_URL}?action=pull&roomId=${encodeURIComponent(roomId)}`);
      
      if (response.status === 404 || response.status === 410) {
        // Stream ended or stale
        setStreamStatus('error');
        return;
      }

      if (!response.ok) {
        console.error('Failed to pull frame');
        return;
      }

      const data = await response.json();
      if (data.frame) {
        setRemoteFrameUrl(data.frame);
        setStreamStatus('streaming');
      }
    } catch (error) {
      console.error('Pull frame error:', error);
    }
  }, [roomId, isViewing]);

  // List available rooms
  const refreshAvailableRooms = useCallback(async () => {
    try {
      const response = await fetch(`${EDGE_FUNCTION_URL}?action=list-rooms`);
      if (response.ok) {
        const data = await response.json();
        setAvailableRooms(data.rooms || []);
      }
    } catch (error) {
      console.error('Failed to list rooms:', error);
    }
  }, []);

  // Start hosting
  const startHosting = useCallback(async (source: RelayStreamSource) => {
    if (!user) {
      toast.error('Please sign in to share your camera');
      return null;
    }

    setStreamStatus('connecting');

    try {
      // Create canvas for frame capture
      canvasRef.current = document.createElement('canvas');

      if (source.type === 'webcam') {
        // Get webcam stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: source.deviceId 
            ? { deviceId: { exact: source.deviceId }, width: 640, height: 480 }
            : { width: 640, height: 480 },
          audio: false, // No audio for now
        });

        // Create video element for capture
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();

        videoRef.current = video;
        setLocalStream(stream);
      } else if (source.type === 'network-camera' && source.imageElement) {
        // Use provided image element
        networkImgRef.current = source.imageElement;
      }

      const newRoomId = `relay_${user.id}_${Date.now()}`;
      setRoomId(newRoomId);
      setSelectedSource(source);
      setIsHosting(true);
      setStreamStatus('streaming');

      // Start pushing frames
      pushIntervalRef.current = setInterval(() => {
        pushFrame();
      }, FRAME_INTERVAL);

      // Push first frame immediately
      setTimeout(pushFrame, 100);

      toast.success('Stream started!');
      return newRoomId;
    } catch (error) {
      console.error('Failed to start hosting:', error);
      setStreamStatus('error');
      toast.error(error instanceof Error ? error.message : 'Failed to start stream');
      return null;
    }
  }, [user, pushFrame]);

  // Join a stream as viewer
  const joinStream = useCallback(async (targetRoomId: string) => {
    if (!user) {
      toast.error('Please sign in to view streams');
      return;
    }

    setStreamStatus('connecting');
    setRoomId(targetRoomId);
    setIsViewing(true);

    // Start pulling frames
    pullIntervalRef.current = setInterval(pullFrame, PULL_INTERVAL);

    // Pull first frame immediately
    pullFrame();

    toast.info('Connecting to stream...');
  }, [user, pullFrame]);

  // Stop stream
  const stopStream = useCallback(async () => {
    // Stop intervals
    if (pushIntervalRef.current) {
      clearInterval(pushIntervalRef.current);
      pushIntervalRef.current = null;
    }
    if (pullIntervalRef.current) {
      clearInterval(pullIntervalRef.current);
      pullIntervalRef.current = null;
    }

    // Notify server if hosting
    if (isHosting && roomId) {
      try {
        await fetch(`${EDGE_FUNCTION_URL}?action=stop&roomId=${encodeURIComponent(roomId)}`, {
          method: 'POST',
        });
      } catch (error) {
        console.error('Failed to stop stream on server:', error);
      }
    }

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Clean up video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }

    // Reset state
    setLocalStream(null);
    setRemoteFrameUrl(null);
    setRoomId(null);
    setIsHosting(false);
    setIsViewing(false);
    setSelectedSource(null);
    setStreamStatus('idle');
    canvasRef.current = null;
    networkImgRef.current = null;

    toast.info('Stream ended');
  }, [isHosting, roomId, localStream]);

  // Update pushFrame when roomId changes
  useEffect(() => {
    if (isHosting && roomId && pushIntervalRef.current) {
      clearInterval(pushIntervalRef.current);
      pushIntervalRef.current = setInterval(pushFrame, FRAME_INTERVAL);
    }
  }, [isHosting, roomId, pushFrame]);

  // Update pullFrame when roomId changes
  useEffect(() => {
    if (isViewing && roomId && pullIntervalRef.current) {
      clearInterval(pullIntervalRef.current);
      pullIntervalRef.current = setInterval(pullFrame, PULL_INTERVAL);
    }
  }, [isViewing, roomId, pullFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pushIntervalRef.current) clearInterval(pushIntervalRef.current);
      if (pullIntervalRef.current) clearInterval(pullIntervalRef.current);
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream]);

  // Auto-refresh rooms periodically
  useEffect(() => {
    if (!isHosting && !isViewing) {
      refreshAvailableRooms();
      const interval = setInterval(refreshAvailableRooms, 5000);
      return () => clearInterval(interval);
    }
  }, [isHosting, isViewing, refreshAvailableRooms]);

  return {
    isHosting,
    isViewing,
    roomId,
    localStream,
    remoteFrameUrl,
    availableRooms,
    selectedSource,
    streamStatus,
    startHosting,
    joinStream,
    stopStream,
    refreshAvailableRooms,
    videoRef,
  };
};
