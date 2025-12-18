import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/SEOHead";
import { 
  Camera, ArrowLeft, Monitor, Bell, Settings, 
  HardDrive, Shield, Wifi, Play, Plus, Video
} from "lucide-react";

const Documentation = () => {
  return (
    <>
      <SEOHead 
        title="Documentation - Camera Stream | Setup Guide & User Manual"
        description="Learn how to set up and use Camera Stream for security monitoring. Step-by-step guides for webcams, IP cameras, motion detection, and alerts."
        keywords="camera stream documentation, setup guide, webcam setup, IP camera configuration, motion detection guide"
        canonical="https://www.rpicamalert.xyz/documentation"
      />
      
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Camera className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Camera Stream</span>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </nav>

        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <h1 className="text-4xl font-bold mb-4">Documentation</h1>
          <p className="text-muted-foreground text-lg mb-12">
            Everything you need to get started with Camera Stream and make the most of your security monitoring system.
          </p>

          {/* Getting Started */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Play className="h-6 w-6 text-primary" />
              Getting Started
            </h2>
            
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>1. Create Your Account</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2">
                <p>Visit the <Link to="/auth" className="text-primary hover:underline">sign up page</Link> and create your free account using your email address.</p>
                <p>You'll receive a confirmation email — click the link to verify your account and get started.</p>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>2. Access Your Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2">
                <p>Once logged in, you'll be taken to your camera dashboard where you can manage all your cameras and view live feeds.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Add Your First Camera</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2">
                <p>Click the "Add Camera" button to connect your first camera. Camera Stream supports multiple camera types:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Webcams (USB cameras connected to your computer)</li>
                  <li>IP Cameras (network cameras with MJPEG or RTSP streams)</li>
                  <li>Raspberry Pi cameras (for advanced users)</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Camera Setup */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Plus className="h-6 w-6 text-primary" />
              Camera Setup
            </h2>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Webcam Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2">
                <p>To use a webcam:</p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Connect your USB webcam to your computer</li>
                  <li>Click "Add Camera" and select "Webcam/Browser Camera"</li>
                  <li>Allow browser permission to access your camera</li>
                  <li>Your camera feed will appear in the dashboard</li>
                </ol>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  IP Camera Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2">
                <p>To connect an IP camera:</p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Find your camera's stream URL (usually in camera settings)</li>
                  <li>Click "Add Camera" and select "Network/IP Camera"</li>
                  <li>Enter the camera URL (e.g., http://192.168.1.100:8080/video)</li>
                  <li>Add username/password if your camera requires authentication</li>
                </ol>
                <p className="mt-4">Common stream URL formats:</p>
                <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                  <li>MJPEG: <code className="bg-muted px-1 rounded">http://IP:PORT/video</code></li>
                  <li>RTSP: <code className="bg-muted px-1 rounded">rtsp://IP:PORT/stream</code></li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Motion Detection */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              Motion Detection & Alerts
            </h2>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Enabling Motion Detection</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2">
                <p>Each camera can have motion detection enabled individually:</p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Click on a camera to open its settings</li>
                  <li>Toggle "Motion Detection" to enable</li>
                  <li>Adjust sensitivity (higher = more sensitive)</li>
                  <li>Set the motion threshold for triggering alerts</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2">
                <p>To receive email alerts when motion is detected:</p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Open camera settings</li>
                  <li>Enable "Email Notifications"</li>
                  <li>Enter your notification email address</li>
                  <li>Set a cooldown period to avoid alert spam</li>
                </ol>
              </CardContent>
            </Card>
          </section>

          {/* Recording */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Video className="h-6 w-6 text-primary" />
              Recording & Storage
            </h2>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Local Storage
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2">
                <p>Recordings are stored locally on your device for maximum privacy:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Recordings are saved to your browser's download folder</li>
                  <li>You can configure custom storage paths in settings</li>
                  <li>No data is uploaded to external servers</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manual & Automatic Recording</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2">
                <p><strong>Manual Recording:</strong> Click the record button on any camera to start/stop recording.</p>
                <p><strong>Motion-Triggered Recording:</strong> Enable in settings to automatically record when motion is detected.</p>
              </CardContent>
            </Card>
          </section>

          {/* Privacy & Security */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Privacy & Security
            </h2>

            <Card>
              <CardContent className="pt-6 text-muted-foreground space-y-4">
                <p>Camera Stream is designed with privacy as a core principle:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li><strong>Local Processing:</strong> Video processing happens in your browser — streams don't pass through our servers</li>
                  <li><strong>Encrypted Credentials:</strong> Camera passwords are encrypted before storage</li>
                  <li><strong>Your Data, Your Control:</strong> All recordings stay on your devices</li>
                  <li><strong>No Tracking:</strong> We don't track your camera usage or video content</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Support */}
          <section>
            <h2 className="text-2xl font-bold mb-6">Need Help?</h2>
            <p className="text-muted-foreground mb-4">
              If you have questions or run into issues, we're here to help:
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="mailto:support@camerastream.live">
                <Button>Contact Support</Button>
              </a>
              <a href="https://github.com/Shiki07/Camera-Stream" target="_blank" rel="noopener noreferrer">
                <Button variant="outline">View on GitHub</Button>
              </a>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-8 mt-12">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Camera Stream. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Documentation;
