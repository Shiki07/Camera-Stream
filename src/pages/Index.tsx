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
        
        {/* Combined Construction & VPN Warning Banner */}
        <div className="bg-amber-500/20 border-b border-amber-500/40 py-4 px-4">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Under Construction */}
            <div className="flex items-center gap-2 text-center sm:text-left">
              <p className="text-sm text-foreground">
                🚧 <span className="font-medium">Under construction</span> for multi-camera support. Need just one? Visit{' '}
                <a 
                  href="https://rpicamalert.xyz" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 underline font-semibold"
                >
                  rpicamalert.xyz
                </a>
                {' '}→
              </p>
            </div>
            
            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-amber-500/50" />
            
            {/* VPN Warning */}
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <p className="text-sm text-foreground font-medium">
                VPN not supported for Raspberry Pi features
              </p>
            </div>
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
          
          {/* Support Footer */}
          <div className="text-center py-6 border-t border-border mt-8">
            <p className="text-sm text-muted-foreground">
              For support, contact{' '}
              <a 
                href="mailto:support@camerastream.live" 
                className="text-primary hover:text-primary/80 underline"
              >
                support@camerastream.live
              </a>
            </p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};

export default Index;
