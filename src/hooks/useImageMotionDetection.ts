import { useRef, useCallback, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface ImageMotionDetectionConfig {
  sensitivity: number;
  threshold: number;
  enabled: boolean;
  scheduleEnabled: boolean;
  startHour: number;
  endHour: number;
  detectionZonesEnabled: boolean;
  cooldownPeriod: number;
  minMotionDuration: number;
  noiseReduction: boolean;
  onMotionDetected?: (motionLevel: number) => void;
  onMotionCleared?: () => void;
}

export const useImageMotionDetection = (config: ImageMotionDetectionConfig) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [motionDetected, setMotionDetected] = useState(false);
  const [lastMotionTime, setLastMotionTime] = useState<Date | null>(null);
  const [currentMotionLevel, setCurrentMotionLevel] = useState(0);
  const [motionEventsToday, setMotionEventsToday] = useState(0);
  const [lastAlertTime, setLastAlertTime] = useState<Date | null>(null);
  
  const previousFrameRef = useRef<ImageData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const motionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const motionStartTimeRef = useRef<Date | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const { toast } = useToast();

  const isWithinSchedule = useCallback(() => {
    if (!config.scheduleEnabled) return true;
    
    const now = new Date();
    const currentHour = now.getHours();
    
    if (config.startHour <= config.endHour) {
      return currentHour >= config.startHour && currentHour < config.endHour;
    } else {
      // Handle overnight schedule (e.g., 22:00 to 06:00)
      return currentHour >= config.startHour || currentHour < config.endHour;
    }
  }, [config.scheduleEnabled, config.startHour, config.endHour]);

  // Use fixed small resolution for motion detection to reduce CPU usage
  const DETECTION_WIDTH = 160;
  const DETECTION_HEIGHT = 120;

  const initializeCanvas = useCallback(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = DETECTION_WIDTH;
      canvasRef.current.height = DETECTION_HEIGHT;
      contextRef.current = canvasRef.current.getContext('2d');
    }
    
    return canvasRef.current && contextRef.current 
      ? { canvas: canvasRef.current, context: contextRef.current }
      : null;
  }, []);

  const isInCooldownPeriod = useCallback(() => {
    if (!lastAlertTime) return false;
    const now = new Date();
    const timeSinceLastAlert = (now.getTime() - lastAlertTime.getTime()) / 1000;
    return timeSinceLastAlert < config.cooldownPeriod;
  }, [lastAlertTime, config.cooldownPeriod]);

  const calculateMotion = useCallback((currentFrame: ImageData, previousFrame: ImageData): number => {
    const current = currentFrame.data;
    const previous = previousFrame.data;
    let changedPixels = 0;
    
    // Apply noise reduction if enabled
    const noiseThreshold = config.noiseReduction ? 15 : 5;
    
    for (let i = 0; i < current.length; i += 4) {
      const currentGray = (current[i] + current[i + 1] + current[i + 2]) / 3;
      const previousGray = (previous[i] + previous[i + 1] + previous[i + 2]) / 3;
      
      const difference = Math.abs(currentGray - previousGray);
      const sensitivityThreshold = Math.max(noiseThreshold, 255 - (config.sensitivity * 2.55));
      
      if (difference > sensitivityThreshold) {
        changedPixels++;
      }
    }
    
    return changedPixels;
  }, [config.sensitivity, config.noiseReduction]);

  const saveMotionEvent = useCallback((motionLevel: number, detected: boolean) => {
    try {
      const events = JSON.parse(localStorage.getItem('motionEvents') || '[]');
      
      if (detected) {
        const newEvent = {
          id: crypto.randomUUID(),
          motion_level: motionLevel,
          detected_at: new Date().toISOString(),
          recording_triggered: true,
          email_sent: false,
          detection_zone: null,
          duration_ms: null,
          cleared_at: null
        };
        events.unshift(newEvent);
        localStorage.setItem('motionEvents', JSON.stringify(events.slice(0, 100)));
      }
    } catch (error) {
      console.error('Error saving motion event:', error);
    }
  }, []);

  const processFrame = useCallback(() => {
    if (!config.enabled || !imageRef.current) return;
    
    // Skip if tab is not visible
    if (document.hidden) return;
    
    // Check schedule
    if (!isWithinSchedule()) {
      return;
    }

    // Check cooldown period
    if (isInCooldownPeriod()) {
      return;
    }
    
    const img = imageRef.current;
    
    // Make sure image is loaded and has dimensions
    if (!img.complete || !img.naturalWidth || !img.naturalHeight) {
      return;
    }
    
    const canvasData = initializeCanvas();
    if (!canvasData) return;
    
    const { canvas, context } = canvasData;
    
    try {
      // Draw downsampled frame
      context.drawImage(img, 0, 0, DETECTION_WIDTH, DETECTION_HEIGHT);
      const currentFrame = context.getImageData(0, 0, DETECTION_WIDTH, DETECTION_HEIGHT);
      
      if (previousFrameRef.current) {
        const changedPixels = calculateMotion(currentFrame, previousFrameRef.current);
        const motionLevel = (changedPixels / (DETECTION_WIDTH * DETECTION_HEIGHT)) * 100;
        
        setCurrentMotionLevel(motionLevel);
        
        if (motionLevel > config.threshold) {
          if (!motionDetected) {
            setMotionDetected(true);
            setLastMotionTime(new Date());
            setLastAlertTime(new Date());
            setMotionEventsToday(prev => prev + 1);
            
            // Save motion event to localStorage
            saveMotionEvent(motionLevel, true);
            
            config.onMotionDetected?.(motionLevel);
            
            toast({
              title: "Motion Detected!",
              description: `Movement detected (${motionLevel.toFixed(1)}% change)`,
              variant: "default"
            });
          }
          
          if (motionTimeoutRef.current) {
            clearTimeout(motionTimeoutRef.current);
          }
          
          motionTimeoutRef.current = setTimeout(() => {
            setMotionDetected(false);
            setCurrentMotionLevel(0);
            motionStartTimeRef.current = null;
            
            config.onMotionCleared?.();
          }, 3000);
        } else {
          // Reset motion start time if no motion
          motionStartTimeRef.current = null;
        }
      }
      
      previousFrameRef.current = currentFrame;
    } catch (error) {
      console.error('Error processing motion detection frame:', error);
    }
  }, [config, motionDetected, isWithinSchedule, isInCooldownPeriod, initializeCanvas, calculateMotion, saveMotionEvent, toast]);

  const startDetection = useCallback((imgElement: HTMLImageElement) => {
    if (!config.enabled || isDetecting) return;
    
    setIsDetecting(true);
    imageRef.current = imgElement;
    
    // Start detection interval - less frequent to improve performance
    detectionIntervalRef.current = setInterval(() => {
      processFrame();
    }, 1000); // Check every 1000ms for motion
  }, [config.enabled, isDetecting, processFrame]);

  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    setMotionDetected(false);
    setCurrentMotionLevel(0);
    imageRef.current = null;
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    if (motionTimeoutRef.current) {
      clearTimeout(motionTimeoutRef.current);
      motionTimeoutRef.current = null;
    }
    
    previousFrameRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  // Reset daily counter at midnight
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const timeout = setTimeout(() => {
      setMotionEventsToday(0);
      
      // Set up daily interval
      const dailyInterval = setInterval(() => {
        setMotionEventsToday(0);
      }, 24 * 60 * 60 * 1000); // 24 hours
      
      return () => clearInterval(dailyInterval);
    }, msUntilMidnight);
    
    return () => clearTimeout(timeout);
  }, []);

  return {
    isDetecting,
    motionDetected,
    lastMotionTime,
    currentMotionLevel,
    motionEventsToday,
    startDetection,
    stopDetection,
    isWithinSchedule: isWithinSchedule()
  };
};
