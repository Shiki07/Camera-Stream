import { useCallback, useEffect, useRef } from 'react';

interface ConnectionStabilizerOptions {
  onConnectionLost: () => void;
  onConnectionRestored: () => void;
  checkInterval: number; // ms
  enabled: boolean;
}

/**
 * Hook to monitor and stabilize camera connections
 * Provides proactive connection health checks and recovery
 */
export const useConnectionStabilizer = ({
  onConnectionLost,
  onConnectionRestored,
  checkInterval = 30000, // 30 seconds
  enabled = true
}: ConnectionStabilizerOptions) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastConnectionStateRef = useRef<boolean>(true);
  const consecutiveFailuresRef = useRef<number>(0);

  const checkConnectionHealth = useCallback(async () => {
    // Skip when tab is hidden to save resources
    if (!enabled || document.hidden) return;

    try {
      // Simple connectivity check
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors'
      });

      clearTimeout(timeout);
      
      // Connection is healthy
      if (consecutiveFailuresRef.current > 0) {
        consecutiveFailuresRef.current = 0;
        if (!lastConnectionStateRef.current) {
          lastConnectionStateRef.current = true;
          onConnectionRestored();
        }
      }
    } catch {
      consecutiveFailuresRef.current++;

      // If we've had 2 consecutive failures, consider connection lost
      if (consecutiveFailuresRef.current >= 2 && lastConnectionStateRef.current) {
        lastConnectionStateRef.current = false;
        onConnectionLost();
      }
    }
  }, [enabled, onConnectionLost, onConnectionRestored]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start monitoring
    checkConnectionHealth();
    intervalRef.current = setInterval(checkConnectionHealth, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, checkInterval, checkConnectionHealth]);

  const forceCheck = useCallback(() => {
    checkConnectionHealth();
  }, [checkConnectionHealth]);

  return {
    forceCheck,
    consecutiveFailures: consecutiveFailuresRef.current,
    isMonitoring: enabled && intervalRef.current !== null
  };
};