
import { useState, useRef } from "react";
import { RecordingHistory } from "@/components/RecordingHistory";
import { CameraGrid } from "@/components/CameraGrid";
import { AuthGuard } from "@/components/AuthGuard";
import Header from "@/components/Header";
import { useCameraSettings } from "@/hooks/useCameraSettings";
import { useEmailSettings } from "@/hooks/useEmailSettings";
import { LiveFeedHandle } from "@/components/LiveFeed";
import { useStorageStats } from "@/hooks/useStorageStats";

const Index = () => {
  const [isConnected, setIsConnected] = useState(false);
  const liveFeedRef = useRef<LiveFeedHandle>(null);
  const { stats: storageStats, storageLimitGB } = useStorageStats();
  
  const {
    // State
    isRecording,
    motionDetected,
    motionDetectionEnabled,
    lastMotionTime,
    emailEnabled,
    notificationEmail,
    storageType,
    quality,
    motionSensitivity,
    motionThreshold,
    scheduleEnabled,
    startHour,
    endHour,
    motionEventsToday,
    detectionZonesEnabled,
    cooldownPeriod,
    minMotionDuration,
    noiseReduction,
    dateOrganizedFolders,
    
    // Setters
    setIsRecording,
    setStorageType,
    setQuality,
    setMotionSensitivity,
    setMotionThreshold,
    setScheduleEnabled,
    
    // Handlers
    toggleRecording,
    handleMotionDetected,
    toggleMotionDetection,
    toggleEmailNotifications,
    handleEmailChange,
    handleScheduleChange,
    toggleDetectionZones,
    handleCooldownChange,
    handleMinDurationChange,
    toggleNoiseReduction,
    toggleDateOrganizedFolders,
    piVideoPath,
    handlePiVideoPathChange,
    dateOrganizedFoldersPi,
    toggleDateOrganizedFoldersPi
  } = useCameraSettings();

  // Initialize email settings
  useEmailSettings(notificationEmail, handleEmailChange);

  const handleSnapshot = () => {
    liveFeedRef.current?.takeSnapshot();
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900">
        <Header />
        
        <div className="bg-gray-800 border-b border-gray-700 py-2">
          <p className="text-sm text-gray-400 text-center">
            This website is under construction, to be able to connect multiple cameras, if you need to connect just one you can go to{' '}
            <a 
              href="https://rpicamalert.xyz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              rpicamalert.xyz
            </a>
          </p>
        </div>
        
        <div className="container mx-auto px-4 py-8">
          <CameraGrid
            isRecording={isRecording}
            onRecordingChange={setIsRecording}
            storageType={storageType}
            quality={quality}
            motionDetectionEnabled={motionDetectionEnabled}
            onMotionDetected={handleMotionDetected}
            emailNotificationsEnabled={emailEnabled}
            notificationEmail={notificationEmail}
            motionSensitivity={motionSensitivity}
            motionThreshold={motionThreshold}
            scheduleEnabled={scheduleEnabled}
            startHour={startHour}
            endHour={endHour}
            onStorageTypeChange={setStorageType}
            onQualityChange={setQuality}
            onToggleRecording={toggleRecording}
            motionDetected={motionDetected}
            onToggleMotionDetection={toggleMotionDetection}
            onSensitivityChange={setMotionSensitivity}
            onThresholdChange={setMotionThreshold}
            onScheduleToggle={() => setScheduleEnabled(!scheduleEnabled)}
            onScheduleChange={handleScheduleChange}
            onToggleEmail={toggleEmailNotifications}
            onEmailChange={handleEmailChange}
            detectionZonesEnabled={detectionZonesEnabled}
            onDetectionZonesToggle={toggleDetectionZones}
            cooldownPeriod={cooldownPeriod}
            onCooldownChange={handleCooldownChange}
            minMotionDuration={minMotionDuration}
            onMinDurationChange={handleMinDurationChange}
            noiseReduction={noiseReduction}
            onNoiseReductionToggle={toggleNoiseReduction}
            isConnected={isConnected}
            onConnectionChange={setIsConnected}
            onSnapshot={handleSnapshot}
            liveFeedRef={liveFeedRef}
            dateOrganizedFolders={dateOrganizedFolders}
            onDateOrganizedToggle={toggleDateOrganizedFolders}
            piVideoPath={piVideoPath}
            onPiVideoPathChange={handlePiVideoPathChange}
            dateOrganizedFoldersPi={dateOrganizedFoldersPi}
            onDateOrganizedTogglePi={toggleDateOrganizedFoldersPi}
            storageUsedPercent={storageStats.percentageUsed}
            storageWarningLevel={storageStats.warningLevel}
            storageLimitGB={storageLimitGB}
          />
          
          {/* Recording History - Full width */}
          <div className="lg:col-span-3 mt-6">
            <RecordingHistory />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};

export default Index;
