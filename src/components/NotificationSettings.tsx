import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMotionNotification } from "@/hooks/useMotionNotification";
import { Bell, Mail, Camera, Zap } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  useNotificationSettings, 
  AlertSensitivity, 
  SENSITIVITY_THRESHOLDS 
} from "@/hooks/useNotificationSettings";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");

interface NotificationSettingsProps {
  emailEnabled?: boolean;
  onToggleEmail?: () => void;
  onEmailChange?: (email: string) => void;
  currentEmail?: string;
}

export const NotificationSettings = ({ 
  emailEnabled: externalEmailEnabled, 
  onToggleEmail: externalOnToggleEmail,
  onEmailChange,
  currentEmail = ""
}: NotificationSettingsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const {
    settings,
    isLoaded,
    userEmail,
    updateSetting,
    getEffectiveEmail,
    canSendNotifications,
    getMotionThresholds,
  } = useNotificationSettings();

  // Use internal settings or fallback to props for backwards compatibility
  const emailEnabled = settings.enabled;
  const onToggleEmail = () => updateSetting('enabled', !settings.enabled);

  const motionNotification = useMotionNotification({
    email: getEffectiveEmail(),
    enabled: settings.enabled,
    includeAttachment: settings.includeSnapshot
  });

  const handleCustomEmailChange = (newEmail: string) => {
    setEmailError(null);
    updateSetting('customEmail', newEmail);
    onEmailChange?.(newEmail);
  };

  const validateAndSaveCustomEmail = () => {
    if (settings.useCustomEmail && settings.customEmail) {
      const result = emailSchema.safeParse(settings.customEmail);
      if (!result.success) {
        setEmailError(result.error.errors[0].message);
        return false;
      }
    }
    setEmailError(null);
    return true;
  };

  const handleSaveSettings = async () => {
    if (!validateAndSaveCustomEmail()) return;

    setIsLoading(true);
    
    try {
      toast({
        title: "Settings Saved",
        description: "Your notification preferences have been updated",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  const sendTestEmail = async () => {
    const effectiveEmail = getEffectiveEmail();
    
    if (!effectiveEmail) {
      toast({
        title: "Error", 
        description: "Please configure an email address first",
        variant: "destructive",
      });
      return;
    }

    if (!emailEnabled) {
      toast({
        title: "Error",
        description: "Please enable email notifications first",
        variant: "destructive",
      });
      return;
    }

    if (!validateAndSaveCustomEmail()) return;

    setIsLoading(true);
    
    try {
      await motionNotification.sendMotionAlert(undefined, 85.5);
      
      toast({
        title: "Test Email Sent",
        description: `Test motion alert sent to ${effectiveEmail}`,
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: "Test Failed",
        description: "Failed to send test email. Please check your settings.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  const thresholds = getMotionThresholds();

  if (!isLoaded) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
        <Bell className="w-5 h-5" />
        Email Notifications
      </h3>
      
      <div className="space-y-6">
        {/* Enable Notifications Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="email-notifications" className="text-foreground">
            Enable motion alerts
          </Label>
          <Switch
            id="email-notifications"
            checked={emailEnabled}
            onCheckedChange={onToggleEmail}
          />
        </div>

        {/* Email Configuration */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <Label className="text-foreground font-medium">Email Recipient</Label>
          </div>
          
          {/* Radio: Use user email or custom */}
          <RadioGroup
            value={settings.useCustomEmail ? 'custom' : 'user'}
            onValueChange={(value) => updateSetting('useCustomEmail', value === 'custom')}
            className="space-y-2"
            disabled={!emailEnabled}
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border bg-background">
              <RadioGroupItem value="user" id="use-user-email" disabled={!emailEnabled} />
              <Label 
                htmlFor="use-user-email" 
                className={`flex-1 cursor-pointer ${!emailEnabled ? 'opacity-50' : ''}`}
              >
                <div className="font-medium text-foreground">My account email</div>
                <div className="text-sm text-muted-foreground truncate">
                  {userEmail || 'Not logged in'}
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border bg-background">
              <RadioGroupItem value="custom" id="use-custom-email" disabled={!emailEnabled} />
              <Label 
                htmlFor="use-custom-email" 
                className={`flex-1 cursor-pointer ${!emailEnabled ? 'opacity-50' : ''}`}
              >
                <div className="font-medium text-foreground">Custom email address</div>
              </Label>
            </div>
          </RadioGroup>

          {/* Custom Email Input */}
          {settings.useCustomEmail && (
            <div className="space-y-2 pl-6">
              <Input
                type="email"
                placeholder="custom.email@example.com"
                value={settings.customEmail}
                onChange={(e) => handleCustomEmailChange(e.target.value)}
                className={`bg-background border-border text-foreground placeholder:text-muted-foreground ${
                  emailError ? 'border-destructive' : ''
                }`}
                disabled={!emailEnabled}
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>
          )}
        </div>

        {/* Alert Sensitivity */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <Label className="text-foreground font-medium">Alert Sensitivity</Label>
          </div>
          
          <RadioGroup
            value={settings.alertSensitivity}
            onValueChange={(value) => updateSetting('alertSensitivity', value as AlertSensitivity)}
            className="space-y-2"
            disabled={!emailEnabled}
          >
            <div className={`flex items-center space-x-3 p-3 rounded-lg border bg-background ${
              settings.alertSensitivity === 'low' ? 'border-primary' : 'border-border'
            }`}>
              <RadioGroupItem value="low" id="sensitivity-low" disabled={!emailEnabled} />
              <Label 
                htmlFor="sensitivity-low" 
                className={`flex-1 cursor-pointer ${!emailEnabled ? 'opacity-50' : ''}`}
              >
                <div className="font-medium text-foreground">Low</div>
                <div className="text-sm text-muted-foreground">
                  Only major movement ({SENSITIVITY_THRESHOLDS.low.motionThreshold}%+ motion, {SENSITIVITY_THRESHOLDS.low.minDuration / 1000}s sustained)
                </div>
              </Label>
            </div>
            
            <div className={`flex items-center space-x-3 p-3 rounded-lg border bg-background ${
              settings.alertSensitivity === 'medium' ? 'border-primary' : 'border-border'
            }`}>
              <RadioGroupItem value="medium" id="sensitivity-medium" disabled={!emailEnabled} />
              <Label 
                htmlFor="sensitivity-medium" 
                className={`flex-1 cursor-pointer ${!emailEnabled ? 'opacity-50' : ''}`}
              >
                <div className="font-medium text-foreground">Medium (Recommended)</div>
                <div className="text-sm text-muted-foreground">
                  Moderate movement ({SENSITIVITY_THRESHOLDS.medium.motionThreshold}%+ motion, {SENSITIVITY_THRESHOLDS.medium.minDuration / 1000}s sustained)
                </div>
              </Label>
            </div>
            
            <div className={`flex items-center space-x-3 p-3 rounded-lg border bg-background ${
              settings.alertSensitivity === 'high' ? 'border-primary' : 'border-border'
            }`}>
              <RadioGroupItem value="high" id="sensitivity-high" disabled={!emailEnabled} />
              <Label 
                htmlFor="sensitivity-high" 
                className={`flex-1 cursor-pointer ${!emailEnabled ? 'opacity-50' : ''}`}
              >
                <div className="font-medium text-foreground">High</div>
                <div className="text-sm text-muted-foreground">
                  Any small movement ({SENSITIVITY_THRESHOLDS.high.motionThreshold}%+ motion, {SENSITIVITY_THRESHOLDS.high.minDuration / 1000}s sustained)
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Snapshot Attachment */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
          <div className="flex items-center gap-3">
            <Camera className="w-4 h-4 text-muted-foreground" />
            <div>
              <Label htmlFor="include-snapshot" className="text-foreground font-medium cursor-pointer">
                Include snapshot
              </Label>
              <p className="text-sm text-muted-foreground">
                Attach a captured image when motion is detected
              </p>
            </div>
          </div>
          <Switch
            id="include-snapshot"
            checked={settings.includeSnapshot}
            onCheckedChange={(checked) => updateSetting('includeSnapshot', checked)}
            disabled={!emailEnabled}
          />
        </div>

        {/* Cooldown Setting */}
        <div className="space-y-2">
          <Label htmlFor="cooldown" className="text-foreground">
            Cooldown period (minutes)
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="cooldown"
              type="number"
              min={1}
              max={60}
              value={settings.cooldownMinutes}
              onChange={(e) => updateSetting('cooldownMinutes', Math.max(1, Math.min(60, parseInt(e.target.value) || 5)))}
              className="w-24 bg-background border-border text-foreground"
              disabled={!emailEnabled}
            />
            <span className="text-sm text-muted-foreground">
              Wait before sending another alert
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            onClick={sendTestEmail}
            variant="outline"
            className="border-border"
            disabled={!canSendNotifications() || isLoading}
          >
            {isLoading ? "Sending..." : "Test Email"}
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        {/* Status Display */}
        <div className={`${
          canSendNotifications() 
            ? 'bg-primary/10 border-primary/30' 
            : 'bg-muted border-border'
        } border rounded-lg p-3 mt-4`}>
          <p className={`text-sm ${canSendNotifications() ? 'text-primary' : 'text-muted-foreground'}`}>
            {canSendNotifications() 
              ? `✅ Email alerts active: ${getEffectiveEmail()}`
              : emailEnabled 
                ? "⚠️ Please configure an email address"
                : "📧 Enable notifications to receive motion alerts"
            }
          </p>
          {canSendNotifications() && (
            <p className="text-xs text-muted-foreground mt-1">
              Sensitivity: {settings.alertSensitivity} • Cooldown: {settings.cooldownMinutes}min • Snapshot: {settings.includeSnapshot ? 'Yes' : 'No'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
