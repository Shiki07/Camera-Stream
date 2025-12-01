import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Clock } from "lucide-react";

interface MotionStats {
  totalEvents: number;
  averageMotionLevel: number;
  totalDuration: number;
  peakHour: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export const MotionAnalytics = () => {
  const [stats, setStats] = useState<MotionStats>({
    totalEvents: 0,
    averageMotionLevel: 0,
    totalDuration: 0,
    peakHour: 0,
    trend: 'stable',
    trendPercentage: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load stats from localStorage
  useEffect(() => {
    try {
      const savedStats = localStorage.getItem('motionStats');
      if (savedStats) {
        setStats(JSON.parse(savedStats));
      }
    } catch (error) {
      console.error('Error loading motion stats:', error);
    }
    setIsLoading(false);
  }, []);

  const formatDuration = (totalMs: number) => {
    const totalSeconds = Math.round(totalMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Motion Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            Loading analytics...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Motion Analytics (30 days)
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Events</span>
              <div className="flex items-center gap-1">
                <span className="font-semibold">{stats.totalEvents}</span>
                {stats.trend !== 'stable' && (
                  <div className="flex items-center gap-1">
                    {stats.trend === 'up' ? (
                      <TrendingUp className="w-3 h-3 text-red-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-green-400" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {stats.trendPercentage.toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg Motion Level</span>
              <Badge variant="outline">
                {stats.averageMotionLevel.toFixed(1)}%
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Duration</span>
              <span className="font-semibold text-sm">
                {formatDuration(stats.totalDuration)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Peak Hour</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="font-semibold text-sm">
                  {formatHour(stats.peakHour)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
