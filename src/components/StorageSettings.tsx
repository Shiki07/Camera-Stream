
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cloud, HardDrive, Settings, Wifi, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CloudProvider, CloudStorageConfig } from '@/services/cloudStorage/types';
import { CloudStorageFactory } from '@/services/cloudStorage/CloudStorageFactory';
import { Badge } from '@/components/ui/badge';

interface StorageSettingsProps {
  storageType: 'cloud' | 'local';
  onStorageTypeChange: (type: 'cloud' | 'local') => void;
  quality: 'high' | 'medium' | 'low';
  onQualityChange: (quality: 'high' | 'medium' | 'low') => void;
}

export const StorageSettings = ({ 
  storageType, 
  onStorageTypeChange, 
  quality, 
  onQualityChange 
}: StorageSettingsProps) => {
  const [piEndpoint, setPiEndpoint] = useState(() => {
    try {
      return localStorage.getItem('piEndpoint') || '';
    } catch {
      return '';
    }
  });
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider>('none');
  const [isCloudConfigured, setIsCloudConfigured] = useState(false);
  const { toast } = useToast();

  const providers = CloudStorageFactory.getSupportedProviders();

  useEffect(() => {
    try {
      localStorage.setItem('piEndpoint', piEndpoint);
    } catch {
      // Silent failure
    }
  }, [piEndpoint]);

  // Load saved cloud configuration on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('cloudStorageConfig');
    if (savedConfig) {
      try {
        const config: CloudStorageConfig = JSON.parse(savedConfig);
        setSelectedProvider(config.provider);
        checkCloudConfiguration(config);
      } catch (error) {
        console.error('Failed to load cloud storage config:', error);
      }
    }
  }, []);

  const checkCloudConfiguration = async (config: CloudStorageConfig) => {
    if (config.provider === 'none') {
      setIsCloudConfigured(false);
      return;
    }
    const provider = CloudStorageFactory.getProvider(config.provider);
    if (provider) {
      const configured = await provider.configure(config);
      setIsCloudConfigured(configured);
    }
  };

  const handleProviderChange = (providerId: string) => {
    const newProvider = providerId as CloudProvider;
    setSelectedProvider(newProvider);
    
    if (newProvider === 'none') {
      localStorage.removeItem('cloudStorageConfig');
      setIsCloudConfigured(false);
      toast({
        title: "Cloud storage disabled",
        description: "Recordings will be saved locally only"
      });
      return;
    }

    // Check if this provider was previously configured
    const savedConfig = localStorage.getItem('cloudStorageConfig');
    if (savedConfig) {
      try {
        const config: CloudStorageConfig = JSON.parse(savedConfig);
        if (config.provider === newProvider) {
          checkCloudConfiguration(config);
          return;
        }
      } catch {
        // Continue to show not configured
      }
    }

    // Provider changed, needs configuration
    setIsCloudConfigured(false);
    toast({
      title: "Provider selected",
      description: `Please configure ${providers.find(p => p.id === newProvider)?.name} in Cloud Storage Settings`,
    });
  };

  const testPiConnection = async () => {
    if (!piEndpoint.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Pi endpoint first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use cloud-based test via Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('test-pi-connection', {
        body: { pi_endpoint: piEndpoint.trim() }
      });

      if (error) {
        toast({
          title: "Test Failed",
          description: `Cloud test error: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      if (data.success) {
        toast({
          title: "Connection Successful ✅",
          description: `Pi service is reachable from cloud. ${data.healthData?.videosPath ? `Videos path: ${data.healthData.videosPath}` : ''}`,
        });
      } else {
        toast({
          title: "Connection Failed ❌",
          description: `${data.error}${!data.reachable ? ' - Check port forwarding and firewall settings.' : ''}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Test Error",
        description: "Could not perform cloud test. Try again.",
        variant: "destructive",
      });
    }
  };

  const getSelectedProviderName = () => {
    if (selectedProvider === 'none') return 'Not configured';
    return providers.find(p => p.id === selectedProvider)?.name || 'Unknown';
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Storage Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Storage Type Selection */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Storage Location</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={storageType === 'cloud' ? 'default' : 'outline'}
              onClick={() => onStorageTypeChange('cloud')}
              className={`flex items-center gap-2 ${
                storageType === 'cloud' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'border-border text-muted-foreground hover:bg-secondary'
              }`}
            >
              <Cloud className="w-4 h-4" />
              Cloud
            </Button>
            <Button
              variant={storageType === 'local' ? 'default' : 'outline'}
              onClick={() => onStorageTypeChange('local')}
              className={`flex items-center gap-2 ${
                storageType === 'local' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'border-border text-muted-foreground hover:bg-secondary'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              Local
            </Button>
          </div>
        </div>

        {/* Cloud Provider Selection - Show when cloud is selected */}
        {storageType === 'cloud' && (
          <div className="space-y-3 p-3 bg-secondary/30 rounded-lg border border-border">
            <Label className="text-foreground flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              Cloud Provider
            </Label>
            <Select value={selectedProvider} onValueChange={handleProviderChange}>
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="Select a cloud provider" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="none">None (Local only)</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Configuration Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={isCloudConfigured ? "default" : "secondary"} className="gap-1">
                {isCloudConfigured ? (
                  <>
                    <Check className="w-3 h-3" />
                    Configured
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    {selectedProvider === 'none' ? 'Not Selected' : 'Needs Setup'}
                  </>
                )}
              </Badge>
            </div>
            
            {selectedProvider !== 'none' && !isCloudConfigured && (
              <p className="text-xs text-amber-400">
                ⚠️ Configure {getSelectedProviderName()} credentials in the "Cloud Storage Configuration" section below to enable uploads.
              </p>
            )}
          </div>
        )}

        {/* Quality Settings */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Recording Quality</label>
          <div className="grid grid-cols-3 gap-2">
            {['high', 'medium', 'low'].map((q) => (
              <Button
                key={q}
                variant={quality === q ? 'default' : 'outline'}
                onClick={() => onQualityChange(q as 'high' | 'medium' | 'low')}
                size="sm"
                className={`${
                  quality === q 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'border-border text-muted-foreground hover:bg-secondary'
                }`}
              >
                {q.charAt(0).toUpperCase() + q.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Storage Info */}
        <div className="bg-secondary/30 rounded p-3 text-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground">Current:</span>
            <span className="text-foreground flex items-center gap-1">
              {storageType === 'cloud' ? <Cloud className="w-3 h-3" /> : <HardDrive className="w-3 h-3" />}
              {storageType === 'cloud' 
                ? (selectedProvider !== 'none' ? getSelectedProviderName() : 'No Provider Selected')
                : 'Local Storage'
              }
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Quality:</span>
            <span className="text-foreground">{quality} ({
              quality === 'high' ? '1080p' : quality === 'medium' ? '720p' : '480p'
            })</span>
          </div>
        </div>
        
        {/* Pi Sync Configuration */}
        <div className="space-y-3">
          <Label className="text-muted-foreground flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            Raspberry Pi Sync (Optional)
          </Label>
          <div className="space-y-2">
            <Input
              placeholder="http://yourname.duckdns.org:3002"
              value={piEndpoint}
              onChange={(e) => setPiEndpoint(e.target.value)}
              className="bg-background border-border text-foreground placeholder-muted-foreground"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={testPiConnection}
              className="w-full"
            >
              Test Connection
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {piEndpoint 
              ? "✅ Pi sync enabled - recordings will be saved to your Pi's local storage" 
              : "Enter your DuckDNS URL with port 3002 (e.g., http://yourname.duckdns.org:3002). Requires port forwarding on your router."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
