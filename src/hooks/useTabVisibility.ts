import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to monitor tab visibility and pause/resume intervals when tab is hidden
 * This significantly reduces CPU usage when the app is not in focus
 */
export const useTabVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
};

/**
 * Creates an interval that automatically pauses when the tab is hidden
 * @param callback - Function to call on each interval
 * @param delay - Interval delay in ms
 * @param enabled - Whether the interval is enabled
 * @returns cleanup function
 */
export const useVisibilityAwareInterval = (
  callback: () => void,
  delay: number,
  enabled: boolean = true
) => {
  const savedCallback = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const clearCurrentInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startInterval = useCallback(() => {
    clearCurrentInterval();
    if (enabled && !document.hidden) {
      intervalRef.current = setInterval(() => {
        savedCallback.current();
      }, delay);
    }
  }, [delay, enabled, clearCurrentInterval]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearCurrentInterval();
      } else if (enabled) {
        startInterval();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start interval if visible and enabled
    if (!document.hidden && enabled) {
      startInterval();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearCurrentInterval();
    };
  }, [enabled, startInterval, clearCurrentInterval]);

  return {
    clear: clearCurrentInterval,
    restart: startInterval
  };
};
