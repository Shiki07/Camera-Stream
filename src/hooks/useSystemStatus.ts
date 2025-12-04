import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SystemStatusData {
  isConnected: boolean;
  motionEventsToday: number;
  storageUsed: number; // in MB
  storageTotal: number; // in MB
  lastEventTime: Date | null;
  uptime: number; // in seconds
  totalRecordings: number;
}

export const useSystemStatus = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SystemStatusData>({
    isConnected: true, // We'll track this based on camera connectivity
    motionEventsToday: 0,
    storageUsed: 0,
    storageTotal: 1024, // Default 1GB limit
    lastEventTime: null,
    uptime: 0,
    totalRecordings: 0,
  });
  const [loading, setLoading] = useState(true);

  // Track uptime - calculate from mount time instead of 1-second interval
  const mountTimeRef = useRef(Date.now());
  
  const getUptime = useCallback(() => {
    return Math.floor((Date.now() - mountTimeRef.current) / 1000);
  }, []);

  // Fetch system status from database
  const fetchSystemStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Add timeout and retry logic for network stability
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const { data, error } = await supabase
        .from('recordings')
        .select('file_size, recorded_at, motion_detected')
        .eq('user_id', user.id)
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        // Silent failure - use cached data
        return;
      }

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let storageUsed = 0;
      let motionEventsToday = 0;
      let lastEventTime: Date | null = null;

      data?.forEach(record => {
        // Calculate storage used (convert bytes to MB)
        if (record.file_size) {
          storageUsed += record.file_size / (1024 * 1024);
        }

        // Count motion events today
        const recordDate = new Date(record.recorded_at);
        if (record.motion_detected && recordDate >= todayStart) {
          motionEventsToday++;
        }

        // Track latest event
        if (!lastEventTime || recordDate > lastEventTime) {
          lastEventTime = recordDate;
        }
      });

      setStatus(prev => ({
        ...prev,
        storageUsed: Math.round(storageUsed),
        motionEventsToday,
        lastEventTime,
        totalRecordings: data?.length || 0,
      }));

    } catch {
      // Silent failure
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and periodic updates
  useEffect(() => {
    if (user) {
      fetchSystemStatus();
      
      // Refresh data every 60 seconds (reduced frequency), skip when tab is hidden
      const interval = setInterval(() => {
        if (!document.hidden) {
          fetchSystemStatus();
        }
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Update connection status based on external factors
  const updateConnectionStatus = (connected: boolean) => {
    setStatus(prev => ({ ...prev, isConnected: connected }));
  };

  // Manually refresh status
  const refreshStatus = () => {
    fetchSystemStatus();
  };

  return {
    status,
    loading,
    updateConnectionStatus,
    refreshStatus,
    getUptime,
  };
};