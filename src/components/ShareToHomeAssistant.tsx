import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Home, Copy, Check, Loader2, ExternalLink } from 'lucide-react';

interface ShareToHomeAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cameraId: string;
  cameraName: string;
}

export const ShareToHomeAssistant = ({
  open,
  onOpenChange,
  cameraId,
  cameraName,
}: ShareToHomeAssistantProps) => {
  const { toast } = useToast();
  const { session } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareConfig, setShareConfig] = useState<{
    snapshotUrl: string;
    haConfig: string;
    shareToken: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const generateShareConfig = async () => {
    if (!session?.access_token) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to share cameras',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('camera-snapshot', {
        body: {
          camera_id: cameraId,
          camera_name: cameraName,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // Add action parameter to the URL
      const response = await fetch(
        `https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/camera-snapshot?action=generate-share`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            camera_id: cameraId,
            camera_name: cameraName,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate share configuration');
      }

      const result = await response.json();

      setShareConfig({
        snapshotUrl: result.snapshot_url,
        haConfig: result.ha_config,
        shareToken: result.share_token,
      });

      toast({
        title: 'Share configuration generated',
        description: 'Copy the YAML below and add it to your Home Assistant configuration',
      });
    } catch (error) {
      console.error('Error generating share config:', error);
      toast({
        title: 'Failed to generate configuration',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: 'Copied to clipboard',
        description: 'YAML configuration copied successfully',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please select and copy the text manually',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Share to Home Assistant
          </DialogTitle>
          <DialogDescription>
            Export "{cameraName}" to your Home Assistant instance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!shareConfig ? (
            <>
              <Alert>
                <AlertDescription>
                  This will generate a secure URL that Home Assistant can use to fetch
                  snapshots from this camera. You'll need to:
                  <ol className="list-decimal ml-4 mt-2 space-y-1 text-sm">
                    <li>Generate the configuration below</li>
                    <li>Copy the YAML to your Home Assistant's <code className="bg-muted px-1 rounded">configuration.yaml</code></li>
                    <li>Restart Home Assistant to load the camera</li>
                    <li>Keep this web app open to push snapshots</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Camera Name</Label>
                <Input value={cameraName} disabled />
              </div>

              <div className="space-y-2">
                <Label>Camera ID</Label>
                <Input value={cameraId} disabled className="font-mono text-sm" />
              </div>
            </>
          ) : (
            <>
              <Alert className="bg-primary/10 border-primary/20">
                <Check className="h-4 w-4 text-primary" />
                <AlertDescription className="text-primary">
                  Configuration generated successfully!
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Home Assistant YAML Configuration</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(shareConfig.haConfig)}
                    className="h-8"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    <span className="ml-1">{copied ? 'Copied!' : 'Copy'}</span>
                  </Button>
                </div>
                <Textarea
                  value={shareConfig.haConfig}
                  readOnly
                  className="font-mono text-xs h-40 bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Snapshot URL</Label>
                <Input
                  value={shareConfig.snapshotUrl}
                  readOnly
                  className="font-mono text-xs"
                />
              </div>

              <Alert>
                <ExternalLink className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> For snapshots to update, the web app must be
                  running and actively capturing from the camera. Consider using the
                  Raspberry Pi service for continuous updates.
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {shareConfig ? 'Close' : 'Cancel'}
          </Button>
          {!shareConfig && (
            <Button onClick={generateShareConfig} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Home className="h-4 w-4 mr-2" />
                  Generate Configuration
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
