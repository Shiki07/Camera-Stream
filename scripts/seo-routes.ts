// Per-route SEO metadata used by the prerender plugin.
// Each entry produces a static HTML file at dist/<route>/index.html
// with route-specific <title>, meta description, canonical, OG tags,
// and a hidden SEO content block that crawlers can read without JS.

export const SITE_URL = "https://www.camerastream.live";
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export const routes = [
  {
    path: "/",
    title: "Camera Stream — Free Security Camera Monitoring System",
    description:
      "Free, privacy-focused security camera monitoring with real-time motion detection, instant email alerts, and local storage. No subscription fees.",
    keywords:
      "free security camera, home security system, camera motion detection, webcam monitoring, surveillance system, IP camera software, privacy-focused camera, local storage camera",
    h1: "Free Security Camera System with Motion Detection",
    body: `
      <p>Camera Stream is a free, privacy-focused security camera monitoring platform. Connect webcams, IP cameras, Raspberry Pi cameras, and Home Assistant entities to a single dashboard.</p>
      <p>Get real-time motion detection, instant email alerts, and local storage recording — with no monthly fees and no cloud uploads required.</p>
      <h2>Features</h2>
      <ul>
        <li>Real-time motion detection with configurable sensitivity</li>
        <li>Instant email notifications when motion is detected</li>
        <li>Local storage recording for full privacy</li>
        <li>Multi-camera dashboard supporting webcams, IP cameras, Raspberry Pi, and Home Assistant</li>
        <li>Mobile-friendly responsive interface</li>
        <li>Free forever — no subscription, no hidden fees</li>
      </ul>
    `,
  },
  {
    path: "/documentation",
    title: "Raspberry Pi Security Camera Setup & DIY Surveillance Guide",
    description:
      "Free Raspberry Pi security camera setup guide: build a DIY surveillance system with libcamera MJPEG streaming, RTSP cameras, motion alerts, Home Assistant, and local recording — no cloud, no fees.",
    keywords:
      "raspberry pi security camera, raspberry pi security camera setup, diy surveillance system, free ip camera software, home assistant camera integration, raspberry pi camera module comparison, MJPEG stream troubleshooting, RTSP stream setup, local recording",
    h1: "Raspberry Pi Security Camera Setup & DIY Surveillance Guide",


    body: `
      <p>Free hardware and software documentation for Raspberry Pi security cameras and Home Assistant integration: libcamera MJPEG streaming, RTSP conversion, Pi model and camera module comparison, stream error troubleshooting, motion alerts, and private local recording with no cloud uploads.</p>
      <h2>Which Raspberry Pi and camera module to use</h2>
      <p>Pi Zero 2 W handles 640x480 at 10-15 fps for streaming only. Pi 3 Model B+ handles 720p at 15 fps with occasional motion clips. Pi 4 handles 720p at 25-30 fps with continuous local recording. Pi 5 handles 1080p at 30 fps and multiple cameras with FFmpeg re-encoding.</p>
      <p>Camera Module 3 (IMX708, autofocus) is the general-purpose choice, Camera Module 3 NoIR adds night vision with an IR illuminator, Camera Module 2 (IMX219) is the cheapest option, and the HQ Camera (IMX477) accepts interchangeable C/CS lenses. USB webcams work through v4l2 without the ribbon connector.</p>
      <h2>MJPEG and RTSP stream error troubleshooting</h2>
      <p><strong>401 Unauthorized:</strong> the camera uses digest auth or a dedicated stream account — create a local camera user and enter credentials in Camera Stream rather than in the URL.</p>
      <p><strong>404 on the stream path:</strong> try <code>/video</code>, <code>/stream.mjpg</code>, or <code>/mjpg/video.mjpg</code>.</p>
      <p><strong>Mixed content blocked:</strong> browsers block plain-HTTP feeds on HTTPS pages — use the secure proxy or a TLS-terminated DuckDNS hostname.</p>
      <p><strong>Stream freezes after minutes:</strong> lower to 640x480 at 10 fps and prefer a wired connection.</p>
      <p><strong>504 timeout or DNS failure on DuckDNS:</strong> check the DNS record, port forwarding for 8000 and 3002, and disable VPN on the Pi.</p>
      <p><strong>libcamera "no cameras available":</strong> reseat the ribbon cable and run <code>libcamera-hello --list-cameras</code>; use <code>libcamera-vid</code> on Bookworm.</p>
      <h2>Setting up an MJPEG stream</h2>
      <p>MJPEG (Motion JPEG) streams deliver each video frame as a complete JPEG image over HTTP. Browsers play MJPEG natively, so it is the most reliable format for Camera Stream.</p>
      <p>To add an MJPEG camera, find the camera URL (commonly <code>http://IP:PORT/video</code>), choose <strong>Add Camera &gt; Network/IP Camera</strong> in Camera Stream, paste the URL, and enter credentials if required.</p>
      <p><strong>Troubleshooting tip:</strong> open the URL directly in a browser tab. If it prompts for credentials or downloads a multipart stream, the URL is correct but may need authentication enabled in Camera Stream.</p>
      <h2>Setting up an RTSP stream</h2>
      <p>RTSP delivers efficient H.264 or H.265 video, but browsers cannot decode it directly. Convert RTSP to MJPEG or a JPEG snapshot stream locally before adding it to Camera Stream.</p>
      <p>Use FFmpeg to relay an RTSP feed to MJPEG: <code>ffmpeg -i rtsp://camera_ip:554/stream -f mjpeg -q:v 5 http://localhost:8080/video</code>, then add <code>http://localhost:8080/video</code> as a Network/IP Camera.</p>
      <p><strong>Troubleshooting tip:</strong> verify the RTSP URL in VLC or ffplay first. Authentication errors usually mean the username/password or digest-auth setting does not match the camera's configuration.</p>
      <h2>Snapshot / JPEG polling</h2>
      <p>Some cameras only expose a still-image endpoint such as <code>/snapshot.jpg</code>. Camera Stream polls these endpoints several times per second to create a live-looking feed.</p>
      <h2>IP camera troubleshooting by brand</h2>
      <p><strong>Hikvision / HiLook:</strong> enable RTSP and ONVIF, use <code>rtsp://IP:554/Streaming/Channels/101</code>, and create a dedicated local account.</p>
      <p><strong>Dahua / Amcrest:</strong> use <code>rtsp://IP:554/cam/realmonitor?channel=1&amp;subtype=0</code>, confirm the channel number, and add an ONVIF user.</p>
      <p><strong>Reolink:</strong> enable RTSP in the app, use <code>rtsp://IP:554/h264Preview_01_main</code>, and switch to the sub stream if the feed stutters.</p>
      <p><strong>TP-Link Tapo:</strong> create a local Camera Account in the Tapo app, then use <code>rtsp://IP:554/stream1</code>.</p>
      <p><strong>Axis / Foscam / generic ONVIF:</strong> use ONVIF Device Manager to discover RTSP or snapshot endpoints and copy them into Camera Stream.</p>
      <h2>Topics covered</h2>
      <ul>
        <li>Quick start: adding your first camera</li>
        <li>IP camera connection (RTSP, MJPEG, HTTP)</li>
        <li>Step-by-step MJPEG and RTSP stream setup</li>
        <li>Common stream URL examples for generic cameras and phone apps</li>
        <li>Brand-specific troubleshooting for Hikvision, Dahua, Reolink, Tapo, Axis and Foscam</li>
        <li>Raspberry Pi camera streaming with DuckDNS</li>
        <li>Home Assistant camera integration</li>
        <li>Motion detection configuration and detection zones</li>
        <li>Email alert setup</li>
        <li>Local storage and recording management</li>
      </ul>
    `,
  },
  {
    path: "/blog",
    title: "Security Camera Blog — Tips & Guides | Camera Stream",
    description:
      "Expert guides on home security camera setup, privacy-focused monitoring, motion detection tips, and DIY surveillance solutions. Free tutorials from Camera Stream.",
    keywords:
      "security camera blog, home security tips, camera setup guide, motion detection tutorial, privacy camera monitoring, DIY surveillance",
    h1: "Camera Stream Blog",
    body: `
      <p>Tutorials, guides, and tips for building a privacy-focused home security camera system. Free, vendor-neutral advice from the Camera Stream team.</p>
      <h2>Latest articles</h2>
      <ul>
        <li><a href="/blog/open-source-security-camera-software">Open Source Security Camera Software: 2026 Guide</a></li>
        <li><a href="/blog/raspberry-pi-camera-recording-setup">Raspberry Pi Security Camera Setup: Streaming & Recording Guide</a></li>
        <li><a href="/blog/free-home-security-camera-setup">Free Home Security Camera Setup Guide</a></li>
        <li><a href="/blog/privacy-first-camera-monitoring">Privacy-First Camera Monitoring Explained</a></li>
        <li><a href="/blog/webcam-vs-ip-camera">Webcam vs IP Camera: Which is Right for You?</a></li>
      </ul>
    `,
  },
  {
    path: "/blog/open-source-security-camera-software",
    title: "Open Source Security Camera Software: 2026 Guide",
    description:
      "Compare open source security camera software — Camera Stream, Frigate, ZoneMinder, MotionEye and Shinobi — and see why local storage beats cloud camera subscriptions.",
    keywords:
      "open source security camera software, free security camera software, self hosted nvr, frigate nvr, zoneminder, motioneye, shinobi, local storage security camera",
    h1: "Open Source Security Camera Software: 2026 Guide",
    body: `
      <p>Open source security camera software lets you run surveillance on hardware you already own, with footage stored locally instead of in a vendor cloud. This guide compares Camera Stream, Frigate, ZoneMinder, MotionEye and Shinobi, and explains how to pick between a browser-based dashboard, an AI object-detection NVR, and a full server NVR.</p>
      <p>Covers no-subscription recording, local and Raspberry Pi storage, auditable code, ONVIF/RTSP and USB webcam support, and how Camera Stream keeps motion detection and recording on your own device.</p>
    `,
  },
  {

    path: "/blog/raspberry-pi-camera-recording-setup",
    title: "Raspberry Pi Security Camera: Streaming & Recording",
    description:
      "Turn a Raspberry Pi into a 24/7 security camera with live MJPEG streaming, motion-triggered recording, and remote access via DuckDNS. Step-by-step Camera Stream guide.",
    keywords:
      "raspberry pi security camera, raspberry pi camera streaming, pi camera recording, libcamera mjpeg, duckdns raspberry pi, pi camera motion detection",
    h1: "Raspberry Pi Security Camera: Streaming & Recording",
    body: `
      <p>Turn a Raspberry Pi and the official camera module into an always-on security camera with Camera Stream. This guide covers libcamera MJPEG streaming on port 8000, the Node.js recording controller on port 3002, DuckDNS remote access, and systemd auto-start.</p>
      <p>Includes motion detection tuning, post-motion buffer recommendations, SD-card-friendly storage advice, and troubleshooting for stalled streams and undetected cameras.</p>
    `,
  },
  {
    path: "/blog/free-home-security-camera-setup",
    title: "Free Home Security Camera Setup Guide | Camera Stream",
    description:
      "Step-by-step guide to setting up a complete home security camera system using your existing webcam or affordable IP cameras. No monthly fees required.",
    keywords:
      "free home security camera, DIY security camera, webcam security, IP camera setup, home surveillance free, no subscription camera",
    h1: "Free Home Security Camera Setup Guide",
    body: `
      <p>Build a complete home security camera system for free using webcams or affordable IP cameras. No monthly subscription fees, no cloud lock-in.</p>
      <p>This guide walks through hardware selection, software configuration, motion detection tuning, and recording storage strategy for a privacy-focused setup.</p>
    `,
  },
  {
    path: "/blog/privacy-first-camera-monitoring",
    title: "Privacy-First Camera Monitoring Explained | Camera Stream",
    description:
      "Why local storage and privacy-focused design matter for home security cameras, and how Camera Stream protects your data from third-party access.",
    keywords:
      "privacy camera, local storage camera, no cloud security camera, encrypted camera, private home security",
    h1: "Privacy-First Camera Monitoring Explained",
    body: `
      <p>Most consumer security cameras send your footage to vendor cloud servers. Privacy-first monitoring keeps recordings on hardware you own and control.</p>
      <p>This article explains the privacy trade-offs of cloud cameras, the benefits of local storage, and how Camera Stream is architected to keep your data private.</p>
    `,
  },
  {
    path: "/blog/webcam-vs-ip-camera",
    title: "Webcam vs IP Camera: Which Is Right for You | Camera Stream",
    description:
      "Compare the pros and cons of using a webcam versus a dedicated IP camera for your home security monitoring setup.",
    keywords:
      "webcam vs ip camera, security camera comparison, home camera choice, USB webcam security, IP camera benefits",
    h1: "Webcam vs IP Camera: Which is Right for You?",
    body: `
      <p>Webcams and IP cameras both work for home security monitoring, but each has clear strengths. Webcams are cheap and plug-and-play; IP cameras offer weatherproofing, longer cable runs, and dedicated streams.</p>
      <p>This comparison covers cost, image quality, placement flexibility, and software compatibility to help you choose.</p>
    `,
  },
  {
    path: "/contact",
    title: "Contact Us — Camera Stream Support & Feature Requests",
    description:
      "Get in touch with the Camera Stream team for support, feature requests, or general inquiries about our free security camera platform.",
    keywords: "camera stream contact, security camera support, camera stream help",
    h1: "Contact Camera Stream",
    body: `
      <p>Questions, feedback, or feature requests? Reach out to the Camera Stream team. We typically respond within one business day.</p>
    `,
  },
  {
    path: "/privacy",
    title: "Privacy Policy — Camera Stream Free Security Monitoring",
    description:
      "Camera Stream privacy policy. Learn how we handle your data, why we use local storage, and our commitment to keeping your camera footage private.",
    keywords: "camera stream privacy policy, security camera privacy, GDPR camera",
    h1: "Privacy Policy",
    body: `
      <p>Camera Stream is built on a privacy-first foundation. This policy describes what minimal data we collect, how it's protected, and your rights as a user.</p>
    `,
  },
  {
    path: "/terms",
    title: "Terms of Service — Camera Stream Free Security Platform",
    description:
      "Terms of service for Camera Stream — the free, privacy-focused security camera monitoring platform.",
    keywords: "camera stream terms, security camera terms of service",
    h1: "Terms of Service",
    body: `
      <p>These terms govern your use of Camera Stream. Camera Stream is provided free of charge for personal and small-business security monitoring.</p>
    `,
  },
  {
    path: "/auth",
    title: "Sign In to Camera Stream — Free Security Camera App",
    description:
      "Sign in to Camera Stream or create a free account to monitor webcams, IP cameras, and Raspberry Pi cameras with motion detection and instant email alerts.",
    keywords: "camera stream sign in, security camera login, create camera monitoring account",
    h1: "Sign In to Camera Stream",
    noindex: true,
    body: `
      <p>Sign in to your free Camera Stream account, or create one in seconds, to manage your cameras, motion alerts, and local recordings.</p>
    `,
  },
];
