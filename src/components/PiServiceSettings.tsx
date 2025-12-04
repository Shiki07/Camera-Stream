import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Key, Check, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const PiServiceSettings = () => {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedKey = localStorage.getItem("PI_SERVICE_API_KEY");
    if (savedKey) {
      setApiKey(savedKey);
      setIsSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem("PI_SERVICE_API_KEY", apiKey.trim());
    setIsSaved(true);
    toast({
      title: "API Key Saved",
      description: "Pi Service API key has been saved securely",
    });
  };

  const handleClear = () => {
    localStorage.removeItem("PI_SERVICE_API_KEY");
    setApiKey("");
    setIsSaved(false);
    toast({
      title: "API Key Removed",
      description: "Pi Service API key has been cleared",
    });
  };

  const handleKeyChange = (value: string) => {
    setApiKey(value);
    setIsSaved(false);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Shield className="h-5 w-5 text-primary" />
          Pi Service Authentication
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Configure the API key for secure communication with your Raspberry Pi recording service.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pi-api-key" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            PI_SERVICE_API_KEY
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="pi-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="Enter your Pi service API key"
                className="pr-10 bg-background border-input"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <Button onClick={handleSave} disabled={!apiKey.trim() || isSaved}>
              {isSaved ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Saved
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
          {isSaved && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <Check className="h-3 w-3" />
              API key is configured
            </p>
          )}
        </div>

        {isSaved && (
          <Button variant="outline" size="sm" onClick={handleClear} className="text-destructive hover:text-destructive">
            Clear API Key
          </Button>
        )}

        <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
          <p className="font-medium text-foreground">Setup Instructions:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Generate a secure random key (32+ characters recommended)</li>
            <li>Add it to your Pi's <code className="bg-background px-1 rounded">.env</code> file as <code className="bg-background px-1 rounded">PI_SERVICE_API_KEY</code></li>
            <li>Restart your Pi recording service</li>
            <li>Enter the same key above and click Save</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
