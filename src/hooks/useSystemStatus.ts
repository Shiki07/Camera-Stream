import { useState, useEffect, useCallback } from 'react';

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

  // Track uptime
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(prev => ({ ...prev, uptime: prev.uptime + 1 }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch system status from localStorage
  const fetchSystemStatus = useCallback(() => {
    try {
      setLoading(true);
      
      const recordings = JSON.parse(localStorage.getItem('recordings') || '[]');
      const motionEvents = JSON.parse(localStorage.getItem('motionEvents') || '[]');

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let storageUsed = 0;
      let lastEventTime: Date | null = null;

      recordings.forEach((record: any) => {
        // Calculate storage used (convert bytes to MB)
        if (record.file_size) {
          storageUsed += record.file_size / (1024 * 1024);
        }

        // Track latest event
        const recordDate = new Date(record.recorded_at);
        if (!lastEventTime || recordDate > lastEventTime) {
          lastEventTime = recordDate;
        }
      });

      // Count motion events today
      const motionEventsToday = motionEvents.filter((event: any) => {
        const eventDate = new Date(event.detected_at);
        return eventDate >= todayStart;
      }).length;

      setStatus(prev => ({
        ...prev,
        storageUsed: Math.round(storageUsed),
        motionEventsToday,
        lastEventTime,
        totalRecordings: recordings.length,
      }));

    } catch (error) {
      console.error('Error in fetchSystemStatus:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and periodic updates
  useEffect(() => {
    fetchSystemStatus();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchSystemStatus]);

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
  };
};
