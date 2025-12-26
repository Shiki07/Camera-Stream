import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
}

interface StreamRoom {
  roomId: string;
  hostId: string;
  hostName: string;
  createdAt: string;
}

export interface StreamSource {
  type: 'webcam' | 'network-camera' | 'canvas';
  name: string;
  // For webcam
  deviceId?: string;
  // For network camera - we'll capture from an image element
  imageElement?: HTMLImageElement;
  // For canvas-based streaming (network cameras)
  canvasElement?: HTMLCanvasElement;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useWebRTCStream = () => {
  const { user } = useAuth();
  const [isHosting, setIsHosting] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [availableRooms, setAvailableRooms] = useState<StreamRoom[]>([]);

  const [selectedSource, setSelectedSource] = useState<StreamSource | null>(null);

  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const canvasIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create a new peer connection
  const createPeerConnection = useCallback((peerId: string, isInitiator: boolean): RTCPeerConnection => {
    console.log(`Creating peer connection for ${peerId}, isInitiator: ${isInitiator}`);
    
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local stream tracks if hosting
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming tracks (for viewers)
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        console.log('Sending ICE candidate to', peerId);
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            from: user?.id,
            to: peerId,
            candidate: event.candidate.toJSON(),
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}:`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectedPeers(prev => [...new Set([...prev, peerId])]);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setConnectedPeers(prev => prev.filter(id => id !== peerId));
        peerConnectionsRef.current.delete(peerId);
      }
    };

    peerConnectionsRef.current.set(peerId, { peerId, connection: pc });
    return pc;
  }, [user?.id]);

  // Handle incoming signaling messages
  const handleSignalingMessage = useCallback(async (payload: any) => {
    const { type, from, to, offer, answer, candidate, roomId: msgRoomId } = payload;
    
    // Ignore messages not meant for us
    if (to && to !== user?.id) return;
    // Ignore our own messages
    if (from === user?.id) return;

    console.log('Received signaling message:', type, 'from:', from);

    switch (type) {
      case 'offer': {
        // Someone wants to view our stream
        const pc = createPeerConnection(from, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answerDesc = await pc.createAnswer();
        await pc.setLocalDescription(answerDesc);
        
        channelRef.current?.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            type: 'answer',
            from: user?.id,
            to: from,
            answer: answerDesc,
          },
        });
        break;
      }
      
      case 'answer': {
        const peerData = peerConnectionsRef.current.get(from);
        if (peerData) {
          await peerData.connection.setRemoteDescription(new RTCSessionDescription(answer));
        }
        break;
      }
      
      case 'ice-candidate': {
        const peerData = peerConnectionsRef.current.get(from);
        if (peerData && candidate) {
          try {
            await peerData.connection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        }
        break;
      }
    }
  }, [user?.id, createPeerConnection]);

  // Create a stream from an image element (for network cameras)
  const createStreamFromImage = useCallback((imgElement: HTMLImageElement): MediaStream => {
    const canvas = document.createElement('canvas');
    canvas.width = imgElement.naturalWidth || 640;
    canvas.height = imgElement.naturalHeight || 480;
    const ctx = canvas.getContext('2d')!;

    // Draw the image to canvas at regular intervals
    const drawFrame = () => {
      if (imgElement.complete && imgElement.naturalWidth > 0) {
        canvas.width = imgElement.naturalWidth;
        canvas.height = imgElement.naturalHeight;
        ctx.drawImage(imgElement, 0, 0);
      }
    };

    // Initial draw
    drawFrame();

    // Update at 15fps for network cameras
    canvasIntervalRef.current = setInterval(drawFrame, 66);

    // Capture stream from canvas
    const stream = canvas.captureStream(15);
    return stream;
  }, []);

  // Start hosting a stream
  const startHosting = useCallback(async (source: StreamSource | MediaStream) => {
    if (!user) {
      toast.error('Please sign in to share your camera');
      return null;
    }

    let stream: MediaStream;

    // Handle different source types
    if (source instanceof MediaStream) {
      stream = source;
    } else if (source.type === 'webcam') {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: source.deviceId 
            ? { deviceId: { exact: source.deviceId }, width: 1280, height: 720 }
            : { width: 1280, height: 720 },
          audio: true,
        });
      } catch (error) {
        console.error('Failed to get webcam:', error);
        toast.error('Failed to access webcam');
        return null;
      }
      setSelectedSource(source);
    } else if (source.type === 'network-camera' && source.imageElement) {
      stream = createStreamFromImage(source.imageElement);
      setSelectedSource(source);
    } else if (source.type === 'canvas' && source.canvasElement) {
      stream = source.canvasElement.captureStream(15);
      setSelectedSource(source);
    } else {
      toast.error('Invalid stream source');
      return null;
    }

    const newRoomId = `room_${user.id}_${Date.now()}`;
    localStreamRef.current = stream;
    setLocalStream(stream);
    setRoomId(newRoomId);
    setIsHosting(true);

    // Join the signaling channel
    const channel = supabase.channel(`webrtc_${newRoomId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        handleSignalingMessage(payload);
      })
      .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
        handleSignalingMessage({ type: 'ice-candidate', ...payload });
      })
      .on('broadcast', { event: 'join-request' }, async ({ payload }) => {
        if (payload.from === user.id) return;
        
        console.log('Viewer joining:', payload.from);
        // Create offer for the viewer
        const pc = createPeerConnection(payload.from, true);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            type: 'offer',
            from: user.id,
            to: payload.from,
            offer,
          },
        });
      })
      .subscribe((status) => {
        console.log('Host channel status:', status);
      });

    channelRef.current = channel;

    // Announce room availability in a global channel
    const globalChannel = supabase.channel('webrtc_rooms');
    await globalChannel.subscribe();
    globalChannel.send({
      type: 'broadcast',
      event: 'room-available',
      payload: {
        roomId: newRoomId,
        hostId: user.id,
        hostName: user.email?.split('@')[0] || 'Anonymous',
        createdAt: new Date().toISOString(),
      },
    });

    toast.success('Stream started! Share your Room ID with others.');
    return newRoomId;
  }, [user, handleSignalingMessage, createPeerConnection, createStreamFromImage]);

  // Join a stream as viewer
  const joinStream = useCallback(async (targetRoomId: string) => {
    if (!user) {
      toast.error('Please sign in to view streams');
      return;
    }

    setRoomId(targetRoomId);
    setIsViewing(true);

    const channel = supabase.channel(`webrtc_${targetRoomId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        handleSignalingMessage(payload);
      })
      .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
        handleSignalingMessage({ type: 'ice-candidate', ...payload });
      })
      .subscribe((status) => {
        console.log('Viewer channel status:', status);
        if (status === 'SUBSCRIBED') {
          // Request to join the stream
          channel.send({
            type: 'broadcast',
            event: 'join-request',
            payload: { from: user.id },
          });
        }
      });

    channelRef.current = channel;
    toast.info('Connecting to stream...');
  }, [user, handleSignalingMessage]);

  // Stop hosting/viewing
  const stopStream = useCallback(() => {
    // Close all peer connections
    peerConnectionsRef.current.forEach(({ connection }) => {
      connection.close();
    });
    peerConnectionsRef.current.clear();

    // Stop canvas interval if active
    if (canvasIntervalRef.current) {
      clearInterval(canvasIntervalRef.current);
      canvasIntervalRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Unsubscribe from channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setRoomId(null);
    setIsHosting(false);
    setIsViewing(false);
    setConnectedPeers([]);
    setSelectedSource(null);

    toast.info('Stream ended');
  }, []);

  // Listen for available rooms
  const refreshAvailableRooms = useCallback(() => {
    const globalChannel = supabase.channel('webrtc_rooms');
    
    globalChannel
      .on('broadcast', { event: 'room-available' }, ({ payload }) => {
        setAvailableRooms(prev => {
          const exists = prev.some(r => r.roomId === payload.roomId);
          if (exists) return prev;
          return [...prev, payload as StreamRoom];
        });
      })
      .on('broadcast', { event: 'room-closed' }, ({ payload }) => {
        setAvailableRooms(prev => prev.filter(r => r.roomId !== payload.roomId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    isHosting,
    isViewing,
    roomId,
    localStream,
    remoteStream,
    connectedPeers,
    availableRooms,
    selectedSource,
    startHosting,
    joinStream,
    stopStream,
    refreshAvailableRooms,
  };
};
