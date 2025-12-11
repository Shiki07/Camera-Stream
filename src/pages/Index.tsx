import { AuthGuard } from "@/components/AuthGuard";
import Header from "@/components/Header";
import { MultiCameraGrid } from "@/components/MultiCameraGrid";
import { RecordingHistory } from "@/components/RecordingHistory";
import { SystemStatus } from "@/components/SystemStatus";
import { DuckDNSSettings } from "@/components/DuckDNSSettings";
import { StorageSettings } from "@/components/StorageSettings";
import { MotionEventDashboard } from "@/components/MotionEventDashboard";
import { CloudStorageSettings } from "@/components/CloudStorageSettings";
import { FolderSettings } from "@/components/FolderSettings";
import { PiServiceSettings } from "@/components/PiServiceSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useState } from "react";
import { Camera, Activity, Settings, History, AlertTriangle } from "lucide-react";

const Index = () => {
  const [storageType, setStorageType] = useState<'cloud' | 'local'>('local');
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('medium');
  const [dateOrganizedFolders, setDateOrganizedFolders] = useState(true);
  const [piVideoPath, setPiVideoPath] = useState('/home/pi/Videos');
  const [dateOrganizedFoldersPi, setDateOrganizedFoldersPi] = useState(true);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Header />
        
        {/* Construction Banner with rpicamalert.xyz link */}
        <div className="bg-primary/20 border-b border-primary/30 py-3 px-4 text-center">
          <p className="text-sm text-foreground">
            This website is under construction to connect multiple cameras. If you need just one camera, go to{' '}
            <a 
              href="https://rpicamalert.xyz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 underline font-medium"
            >
              rpicamalert.xyz
            </a>
          </p>
        </div>
        
        {/* VPN Warning Banner */}
        <div className="bg-destructive/20 border-b border-destructive/30 py-3 px-4">
          <div className="container mx-auto flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-foreground">
              <strong>VPN Warning:</strong> If using a Raspberry Pi camera, VPN is not supported. Direct internet access is required for the Pi recording service.
            </p>
          </div>
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
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <SystemStatus cameraConnected={false} />
                  <DuckDNSSettings />
                  <StorageSettings
                    storageType={storageType}
                    onStorageTypeChange={setStorageType}
                    quality={quality}
                    onQualityChange={setQuality}
                  />
                  <FolderSettings
                    storageType={storageType}
                    dateOrganizedFolders={dateOrganizedFolders}
                    onDateOrganizedToggle={setDateOrganizedFolders}
                    piVideoPath={piVideoPath}
                    onPiVideoPathChange={setPiVideoPath}
                    dateOrganizedFoldersPi={dateOrganizedFoldersPi}
                    onDateOrganizedTogglePi={setDateOrganizedFoldersPi}
                  />
                  <PiServiceSettings />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  );
};

export default Index;
