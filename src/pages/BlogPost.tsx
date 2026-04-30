import { Link, useParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SEOHead } from "@/components/SEOHead";
import { HowToStructuredData } from "@/components/StructuredData";
import { Camera, ArrowLeft, Calendar, Clock, Shield, Eye, Home, CheckCircle, Cpu, Terminal, Wifi } from "lucide-react";

interface BlogPostData {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  category: string;
  keywords: string;
  content: React.ReactNode;
  howToSteps?: { name: string; text: string }[];
}

const blogPostsData: Record<string, BlogPostData> = {
  "raspberry-pi-camera-recording-setup": {
    slug: "raspberry-pi-camera-recording-setup",
    title: "Raspberry Pi Security Camera Setup: Streaming & Recording Guide",
    description: "Turn a Raspberry Pi into a 24/7 security camera with live MJPEG streaming, motion-triggered recording, and remote access via DuckDNS. Step-by-step guide for Camera Stream.",
    date: "2026-04-30",
    readTime: "12 min read",
    category: "Setup Guide",
    keywords: "raspberry pi security camera, raspberry pi camera streaming, pi camera recording, libcamera mjpeg, duckdns raspberry pi, pi camera motion detection, picamera2 surveillance",
    howToSteps: [
      { name: "Prepare your Raspberry Pi", text: "Flash Raspberry Pi OS Bookworm (64-bit) to an SD card, connect the camera module, and enable the camera interface." },
      { name: "Install the Pi camera service", text: "Clone the Camera Stream pi-service repo, install Python and Node dependencies, and verify libcamera detects your camera." },
      { name: "Configure DuckDNS for remote access", text: "Create a free DuckDNS subdomain and run the updater so your Pi is reachable from anywhere by hostname." },
      { name: "Start streaming and recording services", text: "Run the MJPEG stream on port 8000 and the recording control service on port 3002 as systemd services so they auto-start on boot." },
      { name: "Add the Pi to Camera Stream", text: "In the Camera Stream dashboard, add a new Raspberry Pi camera using your DuckDNS hostname, then enable motion detection and recording." }
    ],
    content: (
      <>
        <p className="text-lg text-muted-foreground mb-6">
          A Raspberry Pi with the official camera module makes an excellent always-on security
          camera: low power draw, weatherproof in a small enclosure, and fully under your
          control. This guide walks through wiring it into Camera Stream for live viewing,
          motion-triggered recording, and remote access — all without paying a subscription.
        </p>

        <div className="bg-muted/40 border border-border rounded-lg p-4 mb-8 text-sm text-muted-foreground">
          <strong className="text-foreground">Heads up:</strong> Camera Stream uses two
          separate Pi services: an MJPEG streamer on port <code className="bg-muted px-1 rounded">8000</code> and a
          recording controller on port <code className="bg-muted px-1 rounded">3002</code>. VPNs are not
          supported for Pi recording — use DuckDNS with a port-forward instead.
        </div>

        <h2 className="text-2xl font-bold mt-8 mb-4">What You'll Need</h2>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-6">
          <li>Raspberry Pi 3, 4, or 5 (Pi 4/5 strongly recommended for smooth streaming)</li>
          <li>Official Raspberry Pi Camera Module (v2, v3, or HQ) or a USB webcam</li>
          <li>16 GB+ microSD card (Class 10 / A1 minimum)</li>
          <li>Stable power supply (official PSU recommended)</li>
          <li>Wired Ethernet or strong Wi-Fi</li>
          <li>A free Camera Stream account and a free DuckDNS account</li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">Step 1: Prepare Raspberry Pi OS</h2>
        <p className="text-muted-foreground mb-4">
          Flash <strong>Raspberry Pi OS Bookworm (64-bit Lite)</strong> using Raspberry Pi
          Imager. In the Imager's advanced options, pre-set your hostname, enable SSH, and
          configure Wi-Fi if you're not using Ethernet. Boot the Pi and SSH in.
        </p>
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              Update and verify the camera
            </h3>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto"><code>{`sudo apt update && sudo apt full-upgrade -y
sudo apt install -y python3-picamera2 python3-pip git nodejs npm ffmpeg
libcamera-hello --list-cameras`}</code></pre>
            <p className="text-muted-foreground text-sm mt-3">
              <code className="bg-muted px-1 rounded">libcamera-hello --list-cameras</code> should
              list your camera. If it doesn't, re-seat the ribbon cable and re-check the
              camera interface in <code className="bg-muted px-1 rounded">raspi-config</code>.
            </p>
          </CardContent>
        </Card>

        <h2 className="text-2xl font-bold mt-8 mb-4">Step 2: Install the Camera Stream Pi Service</h2>
        <p className="text-muted-foreground mb-4">
          The Pi runs two small services: a Python MJPEG streamer and a Node.js recording
          controller. Both are open-source and live in the project's{" "}
          <code className="bg-muted px-1 rounded">pi-service/</code> directory.
        </p>
        <Card className="mb-6">
          <CardContent className="pt-6">
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto"><code>{`cd ~
git clone https://github.com/your-org/camera-stream.git
cd camera-stream/pi-service
npm install
# Test the MJPEG stream (Ctrl+C to stop)
python3 libcamera_stream.py --port 8000`}</code></pre>
            <p className="text-muted-foreground text-sm mt-3">
              Open <code className="bg-muted px-1 rounded">http://&lt;pi-ip&gt;:8000</code> in a
              browser on your LAN. You should see a live MJPEG feed.
            </p>
          </CardContent>
        </Card>

        <h2 className="text-2xl font-bold mt-8 mb-4">Step 3: Set Up DuckDNS for Remote Access</h2>
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Wifi className="h-5 w-5 text-primary" />
              Free dynamic DNS in 5 minutes
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground text-sm">
              <li>Sign up at <strong>duckdns.org</strong> and create a subdomain (e.g. <code className="bg-muted px-1 rounded">my-pi-cam.duckdns.org</code>).</li>
              <li>Copy your DuckDNS token.</li>
              <li>On your router, port-forward TCP <strong>8000</strong> and <strong>3002</strong> to your Pi's local IP.</li>
              <li>Install the DuckDNS updater on the Pi to keep the IP fresh:</li>
            </ol>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto mt-3"><code>{`mkdir -p ~/duckdns && cd ~/duckdns
echo 'echo url="https://www.duckdns.org/update?domains=my-pi-cam&token=YOUR_TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -' > duck.sh
chmod +x duck.sh
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1") | crontab -`}</code></pre>
          </CardContent>
        </Card>
        <p className="text-muted-foreground mb-6 text-sm">
          For privacy, Camera Stream hides DuckDNS hostnames in the UI after setup — your
          camera's address won't be shown back to you on screen.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">Step 4: Run Both Services on Boot</h2>
        <p className="text-muted-foreground mb-4">
          Create two systemd units so the streamer and recorder start automatically and
          restart if they crash.
        </p>
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">/etc/systemd/system/camera-stream.service</h3>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto"><code>{`[Unit]
Description=Camera Stream MJPEG (port 8000)
After=network-online.target

[Service]
User=pi
WorkingDirectory=/home/pi/camera-stream/pi-service
ExecStart=/usr/bin/python3 libcamera_stream.py --port 8000
Restart=always

[Install]
WantedBy=multi-user.target`}</code></pre>
            <h3 className="font-semibold mb-2 mt-4">/etc/systemd/system/camera-recorder.service</h3>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto"><code>{`[Unit]
Description=Camera Stream Recording Controller (port 3002)
After=network-online.target

[Service]
User=pi
WorkingDirectory=/home/pi/camera-stream/pi-service
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target`}</code></pre>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto mt-3"><code>{`sudo systemctl daemon-reload
sudo systemctl enable --now camera-stream camera-recorder
sudo systemctl status camera-stream camera-recorder`}</code></pre>
          </CardContent>
        </Card>

        <h2 className="text-2xl font-bold mt-8 mb-4">Step 5: Add Your Pi to Camera Stream</h2>
        <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-6">
          <li>Sign in at <strong>camerastream.live</strong> and open the dashboard.</li>
          <li>Click <strong>Add Camera</strong> → <strong>Raspberry Pi</strong>.</li>
          <li>Enter your DuckDNS hostname (e.g. <code className="bg-muted px-1 rounded">my-pi-cam.duckdns.org</code>).</li>
          <li>The MJPEG feed and recording controls will appear automatically.</li>
        </ol>

        <h2 className="text-2xl font-bold mt-8 mb-4">Step 6: Tune Motion Detection & Recording</h2>
        <ul className="space-y-2 mb-6">
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
            <span className="text-muted-foreground">Enable motion detection in the camera's settings — start with medium sensitivity.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
            <span className="text-muted-foreground">Set a 1–10 second post-motion buffer so events aren't cut short.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
            <span className="text-muted-foreground">Prefer storing recordings on your host computer rather than the Pi's SD card to extend its lifespan.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
            <span className="text-muted-foreground">Add your email under Notifications to get instant motion alerts.</span>
          </li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">Troubleshooting</h2>
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Stream stalls after ~2 minutes:</strong> the Pi service is tuned for seamless reconnection at ~140s. Make sure both systemd services are running and your network is stable.</p>
            <p><strong className="text-foreground">Camera not detected:</strong> run <code className="bg-muted px-1 rounded">libcamera-hello --list-cameras</code> and re-seat the ribbon cable; the contacts face the Ethernet port on a Pi 4.</p>
            <p><strong className="text-foreground">Can't reach Pi remotely:</strong> verify the DuckDNS IP is current and ports 8000/3002 are forwarded. VPNs are not supported for Pi recording.</p>
            <p><strong className="text-foreground">Choppy video:</strong> use a wired Ethernet connection and a quality SD card; lower the resolution in the streamer if needed.</p>
          </CardContent>
        </Card>

        <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mt-8">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Privacy by default
          </h3>
          <p className="text-muted-foreground">
            All video stays between your Pi and your browser — Camera Stream never proxies
            or stores your footage. Recordings live on storage you control, and credentials
            are encrypted before they ever touch our database.
          </p>
        </div>
      </>
    )
  },
  "free-home-security-camera-setup": {
    slug: "free-home-security-camera-setup",
    title: "Free Home Security Camera Setup Guide",
    description: "Learn how to set up a complete home security camera system using your existing webcam or affordable IP cameras. No monthly fees required.",
    date: "2024-12-15",
    readTime: "8 min read",
    category: "Setup Guide",
    keywords: "free security camera, home security setup, webcam security, DIY surveillance, no monthly fee camera",
    howToSteps: [
      { name: "Create your free account", text: "Sign up at Camera Stream with your email address to access the dashboard." },
      { name: "Connect your first camera", text: "Click 'Add Camera' and choose between webcam or IP camera options." },
      { name: "Configure motion detection", text: "Enable motion detection and adjust sensitivity settings for your environment." },
      { name: "Set up email alerts", text: "Enter your email address to receive instant notifications when motion is detected." },
      { name: "Test your system", text: "Walk in front of the camera to verify motion detection and alerts are working." }
    ],
    content: (
      <>
        <p className="text-lg text-muted-foreground mb-6">
          Setting up a home security camera system doesn't have to be expensive or complicated. 
          With Camera Stream, you can create a fully functional surveillance system using equipment 
          you likely already own — completely free.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">What You'll Need</h2>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-6">
          <li>A computer, laptop, or smartphone</li>
          <li>A webcam (built-in or USB) or IP camera</li>
          <li>Internet connection</li>
          <li>A free Camera Stream account</li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">Step 1: Create Your Free Account</h2>
        <p className="text-muted-foreground mb-4">
          Visit the Camera Stream sign-up page and create your account using your email address. 
          You'll receive a confirmation email — click the link to verify your account.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">Step 2: Add Your First Camera</h2>
        <p className="text-muted-foreground mb-4">
          Once logged in, click the "Add Camera" button on your dashboard. You have two main options:
        </p>
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Option A: Use Your Webcam
            </h3>
            <p className="text-muted-foreground text-sm">
              Select "Webcam/Browser Camera" and grant browser permission. Your camera feed 
              will appear instantly — no configuration needed.
            </p>
          </CardContent>
        </Card>
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" />
              Option B: Connect an IP Camera
            </h3>
            <p className="text-muted-foreground text-sm">
              Select "Network/IP Camera" and enter your camera's stream URL. Most IP cameras 
              use formats like <code className="bg-muted px-1 rounded">http://IP:PORT/video</code>.
            </p>
          </CardContent>
        </Card>

        <h2 className="text-2xl font-bold mt-8 mb-4">Step 3: Configure Motion Detection</h2>
        <p className="text-muted-foreground mb-4">
          Enable motion detection in your camera settings to automatically detect movement:
        </p>
        <ul className="space-y-2 mb-6">
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
            <span className="text-muted-foreground">Toggle "Motion Detection" to enabled</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
            <span className="text-muted-foreground">Adjust sensitivity (start with medium, adjust based on false alerts)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
            <span className="text-muted-foreground">Set a cooldown period to avoid alert spam</span>
          </li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">Step 4: Set Up Email Alerts</h2>
        <p className="text-muted-foreground mb-4">
          Enable email notifications to receive instant alerts when motion is detected:
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-6">
          <li>Enable "Email Notifications" in camera settings</li>
          <li>Enter your notification email address</li>
          <li>You'll receive alerts within seconds of motion detection</li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">Step 5: Test Your System</h2>
        <p className="text-muted-foreground mb-6">
          Walk in front of your camera to trigger motion detection. You should see the motion 
          indicator light up on your dashboard and receive an email notification shortly after.
        </p>

        <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mt-8">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Privacy Note
          </h3>
          <p className="text-muted-foreground">
            All video processing happens locally in your browser. Your camera feeds are never 
            sent to our servers, and recordings are stored only on your device. You have 
            complete control over your security footage.
          </p>
        </div>
      </>
    )
  },
  "privacy-first-camera-monitoring": {
    slug: "privacy-first-camera-monitoring",
    title: "Privacy-First Camera Monitoring Explained",
    description: "Understand why local storage and privacy-focused design matter for home security, and how Camera Stream protects your data.",
    date: "2024-12-10",
    readTime: "6 min read",
    category: "Privacy",
    keywords: "privacy camera, secure surveillance, local storage camera, data privacy, home security privacy",
    content: (
      <>
        <p className="text-lg text-muted-foreground mb-6">
          When it comes to home security cameras, privacy should be a top priority. Many popular 
          camera brands require cloud subscriptions and store your footage on their servers — 
          but there's a better way.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">The Problem with Cloud-Based Cameras</h2>
        <p className="text-muted-foreground mb-4">
          Traditional cloud-connected security cameras come with significant privacy concerns:
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-6">
          <li>Your footage is stored on company servers — you don't control access</li>
          <li>Data breaches can expose your private recordings</li>
          <li>Employees may have access to view your cameras</li>
          <li>Monthly subscription fees add up over time</li>
          <li>If the company shuts down, you lose access to your footage</li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">How Camera Stream Protects Your Privacy</h2>
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Local Processing</h3>
                <p className="text-muted-foreground text-sm">
                  All video processing — including motion detection — happens directly in your 
                  browser. Your camera streams never pass through our servers.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Home className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Local Storage</h3>
                <p className="text-muted-foreground text-sm">
                  Recordings are saved directly to your device. You choose where your footage 
                  is stored and who has access to it.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Eye className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Encrypted Credentials</h3>
                <p className="text-muted-foreground text-sm">
                  If you add IP cameras with passwords, those credentials are encrypted before 
                  storage. Even we can't see your camera passwords.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="text-2xl font-bold mt-8 mb-4">Best Practices for Secure Monitoring</h2>
        <ul className="space-y-2 mb-6">
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
            <span className="text-muted-foreground">Use strong, unique passwords for all cameras</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
            <span className="text-muted-foreground">Keep your camera firmware updated</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
            <span className="text-muted-foreground">Segment your cameras on a separate network if possible</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
            <span className="text-muted-foreground">Regularly review and delete old recordings</span>
          </li>
        </ul>
      </>
    )
  },
  "webcam-vs-ip-camera": {
    slug: "webcam-vs-ip-camera",
    title: "Webcam vs IP Camera: Which is Right for You?",
    description: "Compare the pros and cons of using a webcam versus a dedicated IP camera for your security monitoring needs.",
    date: "2024-12-05",
    readTime: "5 min read",
    category: "Comparison",
    keywords: "webcam vs IP camera, security camera comparison, best home camera, webcam for security, IP camera setup",
    content: (
      <>
        <p className="text-lg text-muted-foreground mb-6">
          Choosing between a webcam and an IP camera depends on your specific needs, budget, 
          and setup requirements. Let's compare both options to help you decide.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">Webcams: Pros and Cons</h2>
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-primary mb-3">Advantages</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
              <li>You likely already own one — no additional cost</li>
              <li>Simple plug-and-play setup</li>
              <li>No network configuration required</li>
              <li>Easy to reposition or move</li>
            </ul>
            <h3 className="font-semibold text-destructive mb-3">Disadvantages</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Must be connected to a running computer</li>
              <li>Limited placement options (USB cable length)</li>
              <li>May not have night vision</li>
              <li>Generally lower video quality than dedicated cameras</li>
            </ul>
          </CardContent>
        </Card>

        <h2 className="text-2xl font-bold mt-8 mb-4">IP Cameras: Pros and Cons</h2>
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-primary mb-3">Advantages</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
              <li>Designed for surveillance — better image quality</li>
              <li>Built-in night vision/infrared</li>
              <li>Flexible placement anywhere with network access</li>
              <li>Weather-resistant options for outdoor use</li>
              <li>Can run 24/7 independently</li>
            </ul>
            <h3 className="font-semibold text-destructive mb-3">Disadvantages</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Requires purchase ($20-$100+)</li>
              <li>Network setup required</li>
              <li>May need power outlet or PoE infrastructure</li>
            </ul>
          </CardContent>
        </Card>

        <h2 className="text-2xl font-bold mt-8 mb-4">Our Recommendation</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Choose a Webcam If...</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• You want to test Camera Stream for free</li>
                <li>• You need temporary/indoor monitoring</li>
                <li>• Your computer runs 24/7 anyway</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Choose an IP Camera If...</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• You need outdoor monitoring</li>
                <li>• You want dedicated 24/7 surveillance</li>
                <li>• Night vision is important</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <p className="text-muted-foreground">
          The best part? Camera Stream supports both! Start with a webcam to try things out, 
          then add IP cameras as your needs grow.
        </p>
      </>
    )
  }
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? blogPostsData[slug] : null;

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <>
      <SEOHead 
        title={`${post.title} | Camera Stream Blog`}
        description={post.description}
        keywords={post.keywords}
        canonical={`https://www.camerastream.live/blog/${post.slug}`}
      />
      {post.howToSteps && (
        <HowToStructuredData
          name={post.title}
          description={post.description}
          steps={post.howToSteps}
        />
      )}
      
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Camera className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Camera Stream</span>
            </Link>
            <Link to="/blog">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Blog
              </Button>
            </Link>
          </div>
        </nav>

        <main className="container mx-auto px-4 py-12 max-w-3xl">
          <article>
            <header className="mb-8">
              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                  {post.category}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(post.date).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {post.readTime}
                </span>
              </div>
              <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
              <p className="text-xl text-muted-foreground">{post.description}</p>
            </header>

            <div className="prose prose-lg dark:prose-invert max-w-none">
              {post.content}
            </div>
          </article>

          {/* CTA Section */}
          <section className="mt-16 text-center p-8 bg-muted/50 rounded-xl border border-border">
            <h2 className="text-2xl font-bold mb-4">Ready to Try Camera Stream?</h2>
            <p className="text-muted-foreground mb-6">
              Set up your free security camera system in minutes. No credit card required.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/auth">
                <Button size="lg">Get Started Free</Button>
              </Link>
              <Link to="/documentation">
                <Button size="lg" variant="outline">View Documentation</Button>
              </Link>
            </div>
          </section>

          {/* Related Posts */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-6">More Articles</h2>
            <div className="grid gap-4">
              {Object.values(blogPostsData)
                .filter(p => p.slug !== post.slug)
                .slice(0, 2)
                .map(relatedPost => (
                  <Link key={relatedPost.slug} to={`/blog/${relatedPost.slug}`}>
                    <Card className="hover:border-primary/50 transition-colors">
                      <CardContent className="pt-6">
                        <h3 className="font-semibold hover:text-primary transition-colors">
                          {relatedPost.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {relatedPost.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
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

export default BlogPost;
