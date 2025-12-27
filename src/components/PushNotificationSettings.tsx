import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellRing, Loader2, Smartphone } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export const PushNotificationSettings = () => {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    sendTestNotification
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Push Notifications
        </h3>
        <div className="bg-muted border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Push notifications are not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
        <Smartphone className="w-5 h-5" />
        Push Notifications
      </h3>

      <div className="space-y-6">
        {/* Enable Push Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="push-notifications" className="text-foreground">
              Enable push notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive instant alerts on your device when motion is detected
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Switch
              id="push-notifications"
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Permission Warning */}
        {permission === 'denied' && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <p className="text-sm text-destructive">
              Notification permission was denied. Please enable notifications in your browser settings to receive push alerts.
            </p>
          </div>
        )}

        {/* Test Button */}
        {isSubscribed && (
          <Button
            onClick={sendTestNotification}
            variant="outline"
            className="w-full border-border"
            disabled={isLoading}
          >
            <BellRing className="w-4 h-4 mr-2" />
            Send Test Notification
          </Button>
        )}

        {/* Status Display */}
        <div className={`${
          isSubscribed 
            ? 'bg-primary/10 border-primary/30' 
            : 'bg-muted border-border'
        } border rounded-lg p-3`}>
          <p className={`text-sm flex items-center gap-2 ${isSubscribed ? 'text-primary' : 'text-muted-foreground'}`}>
            {isSubscribed ? (
              <>
                <Bell className="w-4 h-4" />
                Push notifications active on this device
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                Enable to receive instant motion alerts
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
