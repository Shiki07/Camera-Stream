import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Clock, Mail, RefreshCw, Camera, Calendar, Filter, Image as ImageIcon } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isYesterday, startOfDay, subDays } from 'date-fns';

interface MotionEvent {
  id: string;
  motion_level: number | null;
  duration_ms: number | null;
  detected_at: string;
  cleared_at: string | null;
  email_sent: boolean | null;
  camera_id: string | null;
  user_id: string;
  created_at: string;
  thumbnail?: string;
}

interface GroupedEvents {
  [date: string]: MotionEvent[];
}

export const MotionEventDashboard = () => {
  const [motionEvents, setMotionEvents] = useState<MotionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');
  const [stats, setStats] = useState({ total: 0, today: 0, alerts: 0 });
  const { user } = useAuth();
  const { toast } = useToast();

  const loadMotionEvents = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const daysAgo = timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : 30;
      const startDate = subDays(new Date(), daysAgo);

      let query = supabase
        .from('motion_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('detected_at', startDate.toISOString())
        .order('detected_at', { ascending: false })
        .limit(100);

      if (selectedCamera !== 'all') {
        query = query.eq('camera_id', selectedCamera);
      }

      const { data, error } = await query;

      if (error) {
        toast({
          title: "Error loading motion events",
          description: "Could not fetch motion detection history",
          variant: "destructive"
        });
        return;
      }

      // Load thumbnails from localStorage if available
      const eventsWithThumbnails = (data || []).map(event => {
        const thumbnail = localStorage.getItem(`motion_thumbnail_${event.id}`);
        return { ...event, thumbnail: thumbnail || undefined };
      });

      setMotionEvents(eventsWithThumbnails);
      
      // Calculate stats
      const today = startOfDay(new Date());
      const todayEvents = eventsWithThumbnails.filter(e => new Date(e.detected_at) >= today);
      const alertsSent = eventsWithThumbnails.filter(e => e.email_sent).length;
      
      setStats({
        total: eventsWithThumbnails.length,
        today: todayEvents.length,
        alerts: alertsSent
      });

    } catch {
      // Silent failure
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedCamera, timeRange, toast]);

  useEffect(() => {
    loadMotionEvents();
  }, [loadMotionEvents]);

  // Get unique camera IDs
  const cameraIds = [...new Set(motionEvents.map(e => e.camera_id).filter(Boolean))];

  // Group events by date
  const groupedEvents: GroupedEvents = motionEvents.reduce((acc, event) => {
    const date = format(new Date(event.detected_at), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as GroupedEvents);

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d');
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm:ss');
  };

  const formatDuration = (durationMs: number | null) => {
    if (!durationMs) return 'Ongoing';
    const seconds = Math.round(durationMs / 1000);
    return `${seconds}s`;
  };

  const getMotionLevelColor = (level: number) => {
    if (level < 1) return 'bg-green-500';
    if (level < 3) return 'bg-yellow-500';
    return 'bg-destructive';
  };

  const getMotionLevelBadge = (level: number) => {
    if (level < 1) return 'secondary';
    if (level < 3) return 'default';
    return 'destructive';
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Motion Event Dashboard
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              View all detected motion events across your cameras
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadMotionEvents}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Events</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary">{stats.today}</div>
            <div className="text-xs text-muted-foreground">Today</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-500">{stats.alerts}</div>
            <div className="text-xs text-muted-foreground">Alerts Sent</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <TabsList className="h-8">
              <TabsTrigger value="today" className="text-xs px-2">Today</TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-2">7 Days</TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-2">30 Days</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {cameraIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="bg-background border border-border rounded px-2 py-1 text-sm"
              >
                <option value="all">All Cameras</option>
                {cameraIds.map(id => (
                  <option key={id} value={id || ''}>Camera: {id?.slice(0, 8)}...</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[400px] w-full pr-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading motion events...
            </div>
          ) : motionEvents.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No motion events recorded</p>
              <p className="text-sm mt-1">Motion events will appear here when detected</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedEvents).map(([date, events]) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-3 sticky top-0 bg-card py-1">
                    <Calendar className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground">{formatDateHeader(date)}</h3>
                    <Badge variant="outline" className="ml-auto">
                      {events.length} events
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors"
                      >
                        {/* Thumbnail or placeholder */}
                        <div className="w-16 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                          {event.thumbnail ? (
                            <img 
                              src={event.thumbnail} 
                              alt="Motion snapshot"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>

                        {/* Event details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div
                              className={`w-2 h-2 rounded-full ${getMotionLevelColor(event.motion_level || 0)}`}
                            />
                            <span className="font-medium text-sm text-foreground">
                              {formatTime(event.detected_at)}
                            </span>
                            <Badge variant={getMotionLevelBadge(event.motion_level || 0)} className="text-xs">
                              {(event.motion_level || 0).toFixed(1)}%
                            </Badge>
                            {event.email_sent && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Mail className="w-3 h-3" />
                                Alert Sent
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(event.duration_ms)}
                            </span>
                            {event.camera_id && (
                              <span className="flex items-center gap-1">
                                <Camera className="w-3 h-3" />
                                {event.camera_id.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
