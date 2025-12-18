import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useHomeAssistant } from '@/hooks/useHomeAssistant';
import { Home, TestTube, RefreshCw, Eye, EyeOff, CheckCircle, XCircle, Info } from 'lucide-react';

export const HomeAssistantSettings = () => {
  const {
    config,
    saveConfig,
    connected,
    loading,
    testConnection,
    fetchCameras,
    cameras,
  } = useHomeAssistant();

  const [showToken, setShowToken] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);

  // Update local config when hook config changes
  useState(() => {
    setLocalConfig(config);
  });

  const handleSave = () => {
    saveConfig(localConfig);
  };

  const handleTest = async () => {
    // Save first, then test
    saveConfig(localConfig);
    await testConnection();
  };

  const handleFetchCameras = async () => {
    saveConfig(localConfig);
    await fetchCameras();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          Home Assistant Integration
        </CardTitle>
        <CardDescription>
          Connect to your Home Assistant instance to use HA cameras and send motion events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {connected ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">Not connected</span>
            </div>
          )}
        </div>

        {/* Enable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Home Assistant</Label>
            <p className="text-sm text-muted-foreground">
              Send motion events to Home Assistant webhooks
            </p>
          </div>
          <Switch
            checked={localConfig.enabled}
            onCheckedChange={(enabled) => setLocalConfig({ ...localConfig, enabled })}
          />
        </div>

        {/* URL Configuration */}
        <div className="space-y-2">
          <Label htmlFor="ha-url">Home Assistant URL</Label>
          <Input
            id="ha-url"
            placeholder="http://homeassistant.local:8123"
            value={localConfig.url}
            onChange={(e) => setLocalConfig({ ...localConfig, url: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Your Home Assistant instance URL (e.g., http://192.168.1.100:8123)
          </p>
        </div>

        {/* Token Configuration */}
        <div className="space-y-2">
          <Label htmlFor="ha-token">Long-Lived Access Token</Label>
          <div className="relative">
            <Input
              id="ha-token"
              type={showToken ? 'text' : 'password'}
              placeholder="Enter your HA token"
              value={localConfig.token}
              onChange={(e) => setLocalConfig({ ...localConfig, token: e.target.value })}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Create at: Profile → Long-Lived Access Tokens → Create Token
          </p>
        </div>

        {/* Webhook ID for motion events */}
        <div className="space-y-2">
          <Label htmlFor="ha-webhook">Webhook ID (for motion events)</Label>
          <Input
            id="ha-webhook"
            placeholder="camera_stream_motion"
            value={localConfig.webhookId}
            onChange={(e) => setLocalConfig({ ...localConfig, webhookId: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Create an automation in HA with webhook trigger, use that webhook ID here
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Setup in Home Assistant:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
              <li>Create an automation with "Webhook" trigger</li>
              <li>Set webhook ID (e.g., "camera_stream_motion")</li>
              <li>Add actions (notifications, lights, alarms, etc.)</li>
              <li>Motion events include: type, camera_name, motion_level, timestamp</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} variant="outline">
            Save Settings
          </Button>
          <Button onClick={handleTest} disabled={loading || !localConfig.url || !localConfig.token}>
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
            Test Connection
          </Button>
          <Button 
            onClick={handleFetchCameras} 
            variant="secondary"
            disabled={loading || !localConfig.url || !localConfig.token}
          >
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Fetch Cameras
          </Button>
        </div>

        {/* Available Cameras */}
        {cameras.length > 0 && (
          <div className="space-y-2">
            <Label>Available Cameras ({cameras.length})</Label>
            <div className="grid gap-2 max-h-48 overflow-y-auto">
              {cameras.map((camera) => (
                <div
                  key={camera.entity_id}
                  className="p-2 rounded-md bg-muted text-sm flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{camera.name}</div>
                    <div className="text-xs text-muted-foreground">{camera.entity_id}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Add these cameras using the "Add Camera" dialog → Home Assistant tab
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
