
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useHomeAssistant } from '@/hooks/useHomeAssistant';

interface MotionNotificationOptions {
  email: string;
  enabled: boolean;
  includeAttachment?: boolean;
  cameraName?: string;
}

export const useMotionNotification = (options: MotionNotificationOptions) => {
  const { toast } = useToast();
  const { sendMotionEvent, config: haConfig } = useHomeAssistant();

  const captureFrameAsBase64 = useCallback((videoElement: HTMLVideoElement): string => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get canvas context for video frame capture');
        return '';
      }
      
      ctx.drawImage(videoElement, 0, 0);
      
      // Get base64 data without the data URL prefix
      const dataURL = canvas.toDataURL('image/jpeg', 0.8);
      const base64Data = dataURL.split(',')[1];
      console.log('Video frame captured successfully, size:', base64Data.length, 'characters');
      return base64Data;
    } catch (error) {
      console.error('Error capturing video frame:', error);
      return '';
    }
  }, []);

  const captureImageAsBase64 = useCallback((imageElement: HTMLImageElement): string => {
    try {
      // Check if image is loaded
      if (!imageElement.complete || !imageElement.naturalWidth || !imageElement.naturalHeight) {
        console.error('Image not loaded or has no dimensions');
        return '';
      }

      const canvas = document.createElement('canvas');
      canvas.width = imageElement.naturalWidth;
      canvas.height = imageElement.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get canvas context for image capture');
        return '';
      }
      
      ctx.drawImage(imageElement, 0, 0);
      
      // Get base64 data without the data URL prefix
      const dataURL = canvas.toDataURL('image/jpeg', 0.8);
      const base64Data = dataURL.split(',')[1];
      console.log('Network camera image captured successfully, size:', base64Data.length, 'characters');
      return base64Data;
    } catch (error) {
      console.error('Error capturing network camera image:', error);
      return '';
    }
  }, []);

  const sendMotionAlert = useCallback(async (
    videoElement?: HTMLVideoElement,
    motionLevel?: number,
    imageElement?: HTMLImageElement
  ) => {
    // Send Home Assistant webhook if enabled
    if (haConfig.enabled && haConfig.webhookId) {
      console.log('Sending motion event to Home Assistant');
      await sendMotionEvent(options.cameraName || 'Camera', motionLevel || 0);
    }

    if (!options.enabled) {
      console.log('Motion notifications disabled');
      return;
    }

    try {
      let attachmentData: string | undefined;
      let attachmentType: 'image' | 'video' | undefined;

      // Capture frame if video element is provided and attachments are enabled
      if (videoElement && options.includeAttachment) {
        console.log('Attempting to capture video frame for attachment');
        attachmentData = captureFrameAsBase64(videoElement);
        attachmentType = 'image';
      } else if (imageElement && options.includeAttachment) {
        // Capture frame from network camera image
        console.log('Attempting to capture network camera image for attachment');
        attachmentData = captureImageAsBase64(imageElement);
        attachmentType = 'image';
      }

      if (attachmentData) {
        console.log('Attachment captured successfully, including in email');
      } else if (options.includeAttachment) {
        console.log('Failed to capture attachment, sending email without image');
      }

      // SECURITY: Use authenticated user's email by default to prevent email harvesting
      // Only pass custom email if explicitly provided, otherwise edge function uses auth email
      const { data, error } = await supabase.functions.invoke('send-motion-alert', {
        body: {
          // Only include email if user explicitly set a custom notification email
          email: options.email || undefined,
          // Tell the edge function to prefer the authenticated user's email
          useAuthEmail: !options.email,
          attachmentData,
          attachmentType,
          timestamp: new Date().toISOString(),
          motionLevel,
          duration: 'Unknown'
        }
      });

      // Update motion event to mark email as sent
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        await supabase
          .from('motion_events')
          .update({ email_sent: true })
          .eq('user_id', user.user.id)
          .gte('detected_at', new Date(Date.now() - 30000).toISOString()) // Last 30 seconds
          .order('detected_at', { ascending: false })
          .limit(1);
      }

      if (error) {
        console.error('Error sending motion alert:', error);
        toast({
          title: "Email notification failed",
          description: "Could not send motion detection email",
          variant: "destructive"
        });
        return;
      }

      console.log('Motion alert sent successfully');
      toast({
        title: "Motion alert sent",
        description: "Email notification sent successfully",
      });

    } catch (error) {
      console.error('Error in sendMotionAlert:', error);
      toast({
        title: "Email notification failed",
        description: "Could not send motion detection email",
        variant: "destructive"
      });
    }
  }, [options, captureFrameAsBase64, captureImageAsBase64, toast, haConfig, sendMotionEvent]);

  return {
    sendMotionAlert
  };
};
