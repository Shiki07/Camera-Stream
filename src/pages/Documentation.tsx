import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/SEOHead";
import { StructuredData, HowToStructuredData } from "@/components/StructuredData";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Camera, ArrowLeft, Monitor, Bell, Settings, 
  HardDrive, Shield, Wifi, Play, Plus, Video, HelpCircle, Wrench
} from "lucide-react";

const setupSteps = [
  { name: "Create your free account", text: "Sign up at Camera Stream with your email address to access the dashboard." },
  { name: "Access your dashboard", text: "Once logged in, you'll be taken to your camera dashboard where you can manage all cameras." },
  { name: "Add your first camera", text: "Click 'Add Camera' and choose between webcam or IP camera options." },
  { name: "Configure motion detection", text: "Enable motion detection and adjust sensitivity for your environment." },
  { name: "Set up email alerts", text: "Enter your email to receive instant notifications when motion is detected." }
];

const faqItems = [
  {
    question: "Is Camera Stream free to use?",
    answer: "Yes, Camera Stream offers a free tier that allows you to monitor cameras, enable motion detection, and receive email alerts. All core security features are available at no cost."
  },
  {
    question: "Are my camera feeds private and secure?",
    answer: "Absolutely. Camera Stream processes video locally in your browser — streams never pass through our servers. Camera credentials are encrypted, and all recordings stay on your device. We don't track your camera usage or video content."
  },
  {
    question: "What types of cameras does Camera Stream support?",
    answer: "Camera Stream supports USB webcams, IP cameras with MJPEG or RTSP streams, Home Assistant camera integrations, and Raspberry Pi cameras. Most network-enabled cameras work with our platform."
  },
  {
    question: "How does motion detection work?",
    answer: "Motion detection analyzes video frames directly in your browser to detect movement. You can adjust sensitivity levels, set detection zones, configure cooldown periods, and receive instant email or push notifications when motion is detected."
  },
  {
    question: "Where are my recordings stored?",
    answer: "Recordings are stored locally on your device for maximum privacy. They save to your browser's download folder or a custom location you configure. No video data is uploaded to external servers."
  },
  {
    question: "Can I access my cameras remotely?",
    answer: "Yes, Camera Stream supports remote viewing through our stream relay feature and DuckDNS integration. You can securely access your cameras from anywhere while maintaining end-to-end privacy."
  },
  {
    question: "Does Camera Stream work with Home Assistant?",
    answer: "Yes, Camera Stream integrates with Home Assistant. You can connect your Home Assistant instance to view and manage your HA cameras directly within the Camera Stream dashboard."
  },
  {
    question: "What browsers are supported?",
    answer: "Camera Stream works on all modern browsers including Chrome, Firefox, Safari, and Edge. For the best experience, we recommend using the latest version of Chrome or Firefox."
  },
  {
    question: "How do I set up a libcamera MJPEG stream on a Raspberry Pi?",
    answer: "On Raspberry Pi OS Bookworm, the legacy camera stack is replaced by libcamera. Install the tools with 'sudo apt install -y libcamera-apps' and confirm the sensor is detected with 'libcamera-hello --list-cameras'. Then publish an MJPEG stream over HTTP, for example: 'libcamera-vid -t 0 --codec mjpeg --width 1280 --height 720 --framerate 15 --inline -o - | cvlc stream:///dev/stdin --sout \"#standard{access=http,mux=mpjpeg,dst=:8000/stream.mjpg}\" :demux=h264'. Add the resulting URL (http://<pi-ip>:8000/stream.mjpg) as a network camera in Camera Stream. If the stream stutters, lower the resolution to 640x480 or the framerate to 10 fps."
  },
  {
    question: "How do I record Raspberry Pi camera footage locally?",
    answer: "Raspberry Pi camera recording runs on the Pi itself: a small Node.js recording controller listens on port 3002 and calls FFmpeg to write clips from the MJPEG stream to a folder such as /home/pi/Videos, optionally organised into date folders. Camera Stream triggers start and stop over your local network or DuckDNS hostname, and a lock file prevents overlapping recordings. Clips stay on the Pi's SD card or an attached USB drive — nothing is uploaded to the cloud."
  },
  {
    question: "Does any footage get uploaded to the cloud?",
    answer: "No. Video frames are decoded in your browser and recordings are written to your own device or your Raspberry Pi. Camera Stream never uploads footage to our servers, and there are no subscription fees for local recording or Home Assistant integration."
  }
];


const Documentation = () => {
  return (
    <>
      <SEOHead 
        title="Raspberry Pi Security Camera Setup & DIY Surveillance Guide"
        description="Free Raspberry Pi security camera setup guide: build a DIY surveillance system with libcamera MJPEG streaming, RTSP cameras, motion alerts, Home Assistant, and local recording — no cloud, no fees."
        keywords="raspberry pi security camera, raspberry pi security camera setup, diy surveillance system, free ip camera software, home assistant camera integration, raspberry pi camera module comparison, MJPEG stream troubleshooting, RTSP stream setup, local recording"

        canonical="https://www.camerastream.live/documentation"
      />
      <StructuredData 
        type="faq"
        pageTitle="Camera Stream Documentation"
        pageDescription="Complete setup guide and user manual for Camera Stream security camera system"
        faqItems={faqItems}
      />
      <HowToStructuredData
        name="How to Set Up Camera Stream Security System"
        description="Step-by-step guide to set up your free security camera monitoring system with Camera Stream"
        steps={setupSteps}
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
          <h1 className="text-4xl font-bold mb-4">Raspberry Pi Security Camera Setup &amp; DIY Surveillance Guide</h1>
          <p className="text-muted-foreground text-lg mb-12">
            Build a DIY surveillance system with a Raspberry Pi, a USB webcam, or any IP camera —
            free and without subscriptions. These guides cover Raspberry Pi camera setup with
            libcamera MJPEG streaming, RTSP feeds, motion alerts, Home Assistant integration,
            and local recording with no cloud uploads.
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

            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Raspberry Pi Camera Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2">
                <p>
                  A Raspberry Pi with the Camera Module or a USB webcam can act as a
                  standalone streaming and recording node:
                </p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Run an MJPEG streaming service on the Pi (default port 8000)</li>
                  <li>Optionally run the recording controller service (default port 3002)</li>
                  <li>Expose the Pi with a dynamic DNS hostname such as DuckDNS</li>
                  <li>Add the Pi in Camera Stream as a Network/IP Camera</li>
                </ol>
                <p className="mt-4">
                  Full walkthrough:{" "}
                  <Link
                    to="/blog/raspberry-pi-camera-recording-setup"
                    className="text-primary underline underline-offset-4"
                  >
                    Raspberry Pi security camera streaming &amp; recording guide
                  </Link>
                  . Comparing tools first? Read the{" "}
                  <Link
                    to="/blog/open-source-security-camera-software"
                    className="text-primary underline underline-offset-4"
                  >
                    open source security camera software comparison
                  </Link>
                  .
                </p>

              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Which Raspberry Pi and camera module should you use?</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p className="text-sm">
                  Any Pi that runs Raspberry Pi OS Bookworm can stream MJPEG. Higher-end
                  boards matter mainly when you also record locally with FFmpeg or run
                  several camera modules at once.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">
                      Raspberry Pi model comparison for security camera streaming and recording
                    </caption>
                    <thead>
                      <tr className="text-left border-b border-border">
                        <th scope="col" className="py-2 pr-4 font-medium text-foreground">Model</th>
                        <th scope="col" className="py-2 pr-4 font-medium text-foreground">Practical MJPEG stream</th>
                        <th scope="col" className="py-2 font-medium text-foreground">Best for</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <th scope="row" className="py-2 pr-4 font-normal">Pi Zero 2 W</th>
                        <td className="py-2 pr-4">640x480 at 10-15 fps</td>
                        <td className="py-2">Single low-power camera, streaming only</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <th scope="row" className="py-2 pr-4 font-normal">Pi 3 Model B+</th>
                        <td className="py-2 pr-4">1280x720 at 15 fps</td>
                        <td className="py-2">Streaming plus occasional motion clips</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <th scope="row" className="py-2 pr-4 font-normal">Pi 4 (2-4 GB)</th>
                        <td className="py-2 pr-4">1280x720 at 25-30 fps</td>
                        <td className="py-2">Streaming plus continuous local recording</td>
                      </tr>
                      <tr>
                        <th scope="row" className="py-2 pr-4 font-normal">Pi 5</th>
                        <td className="py-2 pr-4">1920x1080 at 30 fps</td>
                        <td className="py-2">Multiple cameras and FFmpeg re-encoding</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">
                      Raspberry Pi camera module comparison
                    </caption>
                    <thead>
                      <tr className="text-left border-b border-border">
                        <th scope="col" className="py-2 pr-4 font-medium text-foreground">Camera module</th>
                        <th scope="col" className="py-2 pr-4 font-medium text-foreground">Sensor</th>
                        <th scope="col" className="py-2 font-medium text-foreground">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <th scope="row" className="py-2 pr-4 font-normal">Camera Module 3</th>
                        <td className="py-2 pr-4">IMX708, 12 MP</td>
                        <td className="py-2">Autofocus and HDR; good general choice</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <th scope="row" className="py-2 pr-4 font-normal">Camera Module 3 NoIR</th>
                        <td className="py-2 pr-4">IMX708, 12 MP</td>
                        <td className="py-2">Night vision with an external IR illuminator</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <th scope="row" className="py-2 pr-4 font-normal">Camera Module 2</th>
                        <td className="py-2 pr-4">IMX219, 8 MP</td>
                        <td className="py-2">Cheapest supported module, fixed focus</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <th scope="row" className="py-2 pr-4 font-normal">HQ Camera</th>
                        <td className="py-2 pr-4">IMX477, 12 MP</td>
                        <td className="py-2">Interchangeable C/CS lenses for long-range views</td>
                      </tr>
                      <tr>
                        <th scope="row" className="py-2 pr-4 font-normal">USB webcam</th>
                        <td className="py-2 pr-4">Varies</td>
                        <td className="py-2">Works without the ribbon connector; use v4l2</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Stream error troubleshooting */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Wrench className="h-6 w-6 text-primary" />
              MJPEG &amp; RTSP Stream Error Troubleshooting
            </h2>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Common stream errors and fixes</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground">401 Unauthorized / repeated password prompt</h3>
                  <p>
                    The camera uses digest authentication or a dedicated stream account.
                    Create a local camera user, avoid characters like <code className="bg-muted px-1 rounded">@</code>{" "}
                    and <code className="bg-muted px-1 rounded">:</code> in the password, and enter the
                    credentials in Camera Stream instead of embedding them in the URL.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">404 Not Found on the stream path</h3>
                  <p>
                    The path differs by firmware. Try <code className="bg-muted px-1 rounded">/video</code>,{" "}
                    <code className="bg-muted px-1 rounded">/stream.mjpg</code>,{" "}
                    <code className="bg-muted px-1 rounded">/mjpg/video.mjpg</code> or the sub-stream
                    path listed in the camera's web interface.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Mixed content blocked / stream loads only over HTTP</h3>
                  <p>
                    Browsers block plain-HTTP camera feeds on an HTTPS page. Use the built-in
                    secure proxy, put the camera behind an HTTPS reverse proxy, or serve the Pi
                    stream through a TLS-terminated DuckDNS hostname.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Stream freezes after a few minutes</h3>
                  <p>
                    Usually bandwidth or a router idle timeout. Lower the resolution to 640x480,
                    drop to 10 fps, and prefer a wired connection for the Pi. Camera Stream
                    reconnects automatically with exponential backoff.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">504 timeout or DNS failure on a DuckDNS hostname</h3>
                  <p>
                    Confirm the DuckDNS record points to your current public IP, that the router
                    forwards ports 8000 and 3002, and that no VPN is active on the Pi — VPN
                    tunnels are not supported for Pi recording.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">RTSP works in VLC but shows a black screen in the browser</h3>
                  <p>
                    Expected: browsers cannot decode RTSP. Relay it with FFmpeg to MJPEG, or use
                    the camera's MJPEG/snapshot endpoint instead.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">libcamera: "no cameras available"</h3>
                  <p>
                    Reseat the ribbon cable with the contacts facing the right way, then run{" "}
                    <code className="bg-muted px-1 rounded">libcamera-hello --list-cameras</code>. On
                    Bookworm the legacy <code className="bg-muted px-1 rounded">raspistill</code> stack
                    is gone — use <code className="bg-muted px-1 rounded">libcamera-vid</code>.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>



          {/* Supported cameras and protocols */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Wifi className="h-6 w-6 text-primary" />
              Supported Cameras &amp; Stream Protocols
            </h2>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Protocols</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2">
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>
                    <strong>MJPEG over HTTP</strong> — streams directly in the browser; the
                    most reliable option for live viewing.
                  </li>
                  <li>
                    <strong>Snapshot / JPEG polling</strong> — used when a camera only exposes
                    a still-image endpoint.
                  </li>
                  <li>
                    <strong>RTSP</strong> — browsers cannot play RTSP natively, so it needs a
                    local converter (for example FFmpeg or your camera's built-in MJPEG or
                    snapshot endpoint).
                  </li>
                  <li>
                    <strong>Home Assistant camera entities</strong> — imported through the
                    secure proxy without exposing your Home Assistant token.
                  </li>
                  <li>
                    <strong>USB webcams</strong> — captured in the browser via the standard
                    camera API.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Setting up an MJPEG stream</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-4">
                <p>
                  MJPEG (Motion JPEG) streams deliver each video frame as a complete JPEG image over HTTP.
                  Because every frame is self-contained, browsers can play MJPEG feeds natively
                  with an <code className="bg-muted px-1 rounded">&lt;img&gt;</code> tag or a
                  multipart parser. This makes MJPEG the most reliable format for Camera Stream:
                  no plug-ins, no transcoding, and minimal latency on local networks.
                </p>
                <h3 className="font-semibold text-foreground">How to add an MJPEG camera</h3>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Find your camera's MJPEG URL (commonly <code className="bg-muted px-1 rounded">http://IP:PORT/video</code> or <code className="bg-muted px-1 rounded">http://IP:PORT/stream</code>).</li>
                  <li>In Camera Stream, click <strong>Add Camera</strong> and choose <strong>Network/IP Camera</strong>.</li>
                  <li>Paste the URL and enter the camera username and password if required.</li>
                  <li>Save — the feed should appear in your dashboard immediately.</li>
                </ol>
                <p className="text-sm">
                  <strong>Troubleshooting tip:</strong> If the image does not load, open the URL directly
                  in a browser tab. If it prompts for credentials or downloads a multipart stream, the URL
                  is correct but may need authentication enabled in Camera Stream.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Setting up an RTSP stream</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-4">
                <p>
                  RTSP (Real Time Streaming Protocol) is used by most IP cameras to deliver H.264 or H.265
                  video over RTP. It is efficient and low-latency, but browsers cannot decode RTSP
                  directly. To use an RTSP camera with Camera Stream, convert it to MJPEG or a JPEG
                  snapshot stream locally — for example with FFmpeg, a camera sub-stream, or your
                  NVR's built-in MJPEG endpoint.
                </p>
                <h3 className="font-semibold text-foreground">How to convert RTSP to MJPEG with FFmpeg</h3>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Install FFmpeg on the same machine or Pi that runs Camera Stream.</li>
                  <li>Run a local relay: <code className="bg-muted px-1 rounded">ffmpeg -i rtsp://camera_ip:554/stream -f mjpeg -q:v 5 http://localhost:8080/video</code>.</li>
                  <li>Add <code className="bg-muted px-1 rounded">http://localhost:8080/video</code> as a Network/IP Camera in Camera Stream.</li>
                  <li>Alternatively, check your camera or NVR for a built-in MJPEG/sub-stream URL and use that directly.</li>
                </ol>
                <p className="text-sm">
                  <strong>Troubleshooting tip:</strong> If you see a black screen, verify the RTSP URL
                  in VLC or ffplay first. Authentication errors usually mean the username/password or
                  digest-auth setting does not match the camera's configuration.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Snapshot / JPEG polling</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-4">
                <p>
                  Some cameras only expose a still-image endpoint such as{" "}
                  <code className="bg-muted px-1 rounded">/snapshot.jpg</code>. Camera Stream can
                  poll these endpoints several times per second to create a live-looking feed. This
                  mode works well for low-bandwidth or battery-powered devices.
                </p>
                <h3 className="font-semibold text-foreground">How to add a snapshot camera</h3>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Locate the snapshot URL in your camera's web interface (often <code className="bg-muted px-1 rounded">http://IP/snapshot.jpg</code>).</li>
                  <li>Add it as a Network/IP Camera in Camera Stream.</li>
                  <li>Adjust the polling interval in settings if the default is too fast or slow.</li>
                </ol>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Common camera URL patterns</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p className="text-sm">
                  Paths differ between models and firmware versions — always confirm with
                  your camera's manual or web interface.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">
                      Typical stream URL patterns by camera type
                    </caption>
                    <thead>
                      <tr className="text-left border-b border-border">
                        <th scope="col" className="py-2 pr-4 font-medium text-foreground">
                          Camera type
                        </th>
                        <th scope="col" className="py-2 font-medium text-foreground">
                          Typical stream URL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <th scope="row" className="py-2 pr-4 font-normal">Generic MJPEG camera</th>
                        <td className="py-2"><code className="bg-muted px-1 rounded">http://IP:PORT/video</code></td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <th scope="row" className="py-2 pr-4 font-normal">Generic ONVIF / RTSP camera</th>
                        <td className="py-2"><code className="bg-muted px-1 rounded">rtsp://IP:554/stream</code></td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <th scope="row" className="py-2 pr-4 font-normal">Raspberry Pi MJPEG service</th>
                        <td className="py-2"><code className="bg-muted px-1 rounded">http://host:8000/stream.mjpg</code></td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <th scope="row" className="py-2 pr-4 font-normal">Android / phone IP webcam apps</th>
                        <td className="py-2"><code className="bg-muted px-1 rounded">http://IP:8080/video</code></td>
                      </tr>
                      <tr>
                        <th scope="row" className="py-2 pr-4 font-normal">Snapshot-only camera</th>
                        <td className="py-2"><code className="bg-muted px-1 rounded">http://IP/snapshot.jpg</code></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm">
                  If your camera is reachable only on your local network, keep the viewer on
                  the same network or expose it through your own dynamic DNS hostname —
                  Camera Stream never uploads your footage to a cloud service.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* IP Camera Troubleshooting */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Wrench className="h-6 w-6 text-primary" />
              IP Camera Troubleshooting by Brand
            </h2>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Hikvision, HiLook & Hilux</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2">
                <p>Common RTSP path: <code className="bg-muted px-1 rounded">rtsp://IP:554/Streaming/Channels/101</code> (main stream) or <code className="bg-muted px-1 rounded">.../102</code> (sub stream).</p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Enable RTSP and ONVIF in the camera's web interface under Network &gt; Advanced Settings.</li>
                  <li>Create a dedicated user account for Camera Stream; avoid special characters in passwords.</li>
                  <li>If the feed is blank, switch to the sub stream — it is usually H.264 and easier to convert to MJPEG.</li>
                </ol>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Dahua, Amcrest & Lorex</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2">
                <p>Common RTSP path: <code className="bg-muted px-1 rounded">rtsp://IP:554/cam/realmonitor?channel=1&amp;subtype=0</code> (subtype=1 for lower resolution).</p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Confirm the camera channel number matches the physical channel in your NVR or standalone camera.</li>
                  <li>Enable ONVIF and add an ONVIF user if the camera is behind an NVR.</li>
                  <li>For Amcrest, check that the HTTP port is open and that HTTPS is not forcing a certificate mismatch.</li>
                </ol>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Reolink</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2">
                <p>Common RTSP path: <code className="bg-muted px-1 rounded">rtsp://IP:554/h264Preview_01_main</code> or <code className="bg-muted px-1 rounded">h264Preview_01_sub</code> for a lower bitrate feed.</p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Use the Reolink mobile app or web UI to enable RTSP under Settings &gt; Network &gt; Advanced &gt; RTSP.</li>
                  <li>Make sure the camera and the viewing device are on the same network for first setup.</li>
                  <li>If the stream stutters, reduce the bitrate or switch to the sub stream.</li>
                </ol>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>TP-Link Tapo</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2">
                <p>Common RTSP path: <code className="bg-muted px-1 rounded">rtsp://IP:554/stream1</code> (main) or <code className="bg-muted px-1 rounded">stream2</code> (SD).</p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Open the Tapo app, go to Camera Settings &gt; Advanced &gt; Camera Account, and create a local account.</li>
                  <li>RTSP credentials are separate from your TP-Link cloud login — use the local account in Camera Stream.</li>
                  <li>Some Tapo models expose an MJPEG snapshot URL at <code className="bg-muted px-1 rounded">http://IP:8080/stream</code>; try this if RTSP conversion is slow.</li>
                </ol>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Axis & Foscam</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2">
                <p>Axis RTSP path: <code className="bg-muted px-1 rounded">rtsp://IP:554/axis-media/media.amp</code>. Foscam path: <code className="bg-muted px-1 rounded">rtsp://IP:88/videoMain</code> or <code className="bg-muted px-1 rounded">rtsp://IP:88/videoSub</code>.</p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Axis cameras often require digest authentication — choose digest or basic auth in Camera Stream if prompted.</li>
                  <li>Foscam users should disable HTTPS in the camera UI unless you have a valid certificate.</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generic ONVIF cameras</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2">
                <p>If your camera supports ONVIF but you do not know the stream URL, use a free ONVIF scanner such as ONVIF Device Manager to discover the RTSP or snapshot endpoints.</p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Connect the scanner to the same LAN as the camera.</li>
                  <li>Log in with the camera's ONVIF credentials.</li>
                  <li>Copy the discovered stream URL into Camera Stream as a Network/IP Camera.</li>
                </ol>
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

          {/* FAQ Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              Frequently Asked Questions
            </h2>
            
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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
