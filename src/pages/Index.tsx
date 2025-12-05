import { AuthGuard } from "@/components/AuthGuard";
import Header from "@/components/Header";
import { MultiCameraGrid } from "@/components/MultiCameraGrid";
import { RecordingHistory } from "@/components/RecordingHistory";
import { SystemStatus } from "@/components/SystemStatus";
import { DuckDNSSettings } from "@/components/DuckDNSSettings";
import { StorageSettings } from "@/components/StorageSettings";
import { MotionEventDashboard } from "@/components/MotionEventDashboard";
import { CloudStorageSettings } from "@/components/CloudStorageSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Camera, Activity, Settings, History } from "lucide-react";

const Index = () => {
  const [storageType, setStorageType] = useState<'cloud' | 'local'>('local');
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('medium');

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Header />
        
        {/* Construction Banner */}
        <div className="bg-primary/20 border-b border-primary/30 py-3 px-4 text-center">
          <p className="text-sm text-foreground">
            This website is under construction to be able to connect multiple cameras. If you need to connect just one, you can go to{' '}
            <a 
              href="https://rpicamalert.xyz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              rpicamalert.xyz
            </a>
          </p>
        </div>
        
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Multi-Camera Grid */}
          <MultiCameraGrid />
          
          {/* Tabbed Sections */}
          <Tabs defaultValue="motion" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="motion" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Motion Events</span>
              </TabsTrigger>
              <TabsTrigger value="recordings" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Recordings</span>
              </TabsTrigger>
              <TabsTrigger value="storage" className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Cloud Storage</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="motion">
              <MotionEventDashboard />
            </TabsContent>

            <TabsContent value="recordings">
              <RecordingHistory />
            </TabsContent>

            <TabsContent value="storage">
              <CloudStorageSettings />
            </TabsContent>

            <TabsContent value="settings">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <SystemStatus cameraConnected={false} />
                <DuckDNSSettings />
                <StorageSettings
                  storageType={storageType}
                  onStorageTypeChange={setStorageType}
                  quality={quality}
                  onQualityChange={setQuality}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  );
};

export default Index;
