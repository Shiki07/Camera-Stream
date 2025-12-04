import { AuthGuard } from "@/components/AuthGuard";
import Header from "@/components/Header";
import { MultiCameraGrid } from "@/components/MultiCameraGrid";
import { RecordingHistory } from "@/components/RecordingHistory";
import { SystemStatus } from "@/components/SystemStatus";
import { DuckDNSSettings } from "@/components/DuckDNSSettings";
import { StorageSettings } from "@/components/StorageSettings";
import { useState } from "react";

const Index = () => {
  const [storageType, setStorageType] = useState<'cloud' | 'local'>('local');
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('medium');

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Header />
        
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Multi-Camera Grid */}
          <MultiCameraGrid />
          
          {/* Global Settings */}
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
          
          {/* Recording History */}
          <RecordingHistory />
        </div>
      </div>
    </AuthGuard>
  );
};

export default Index;
