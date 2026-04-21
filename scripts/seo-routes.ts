// Per-route SEO metadata used by the prerender plugin.
// Each entry produces a static HTML file at dist/<route>/index.html
// with route-specific <title>, meta description, canonical, OG tags,
// and a hidden SEO content block that crawlers can read without JS.

export const SITE_URL = "https://www.camerastream.live";
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export const routes = [
  {
    path: "/",
    title: "Camera Stream - Free Security Camera System | Motion Detection & Alerts",
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
    title: "Documentation - Camera Stream Setup Guide & Tutorials",
    description:
      "Complete documentation for Camera Stream: setup guides for webcams, IP cameras, Raspberry Pi, motion detection configuration, and Home Assistant integration.",
    keywords:
      "camera stream documentation, security camera setup, IP camera guide, webcam setup, raspberry pi camera, home assistant integration, motion detection setup",
    h1: "Camera Stream Documentation",
    body: `
      <p>Step-by-step guides for setting up and configuring Camera Stream. Learn how to add webcams, IP cameras, Raspberry Pi cameras, and Home Assistant camera entities.</p>
      <h2>Topics covered</h2>
      <ul>
        <li>Quick start: adding your first camera</li>
        <li>IP camera connection (RTSP, MJPEG, HTTP)</li>
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
    title: "Security Camera Blog - Camera Stream | Tips, Guides & Tutorials",
    description:
      "Expert guides on home security camera setup, privacy-focused monitoring, motion detection tips, and DIY surveillance solutions. Free tutorials from Camera Stream.",
    keywords:
      "security camera blog, home security tips, camera setup guide, motion detection tutorial, privacy camera monitoring, DIY surveillance",
    h1: "Camera Stream Blog",
    body: `
      <p>Tutorials, guides, and tips for building a privacy-focused home security camera system. Free, vendor-neutral advice from the Camera Stream team.</p>
      <h2>Latest articles</h2>
      <ul>
        <li><a href="/blog/free-home-security-camera-setup">Free Home Security Camera Setup Guide</a></li>
        <li><a href="/blog/privacy-first-camera-monitoring">Privacy-First Camera Monitoring Explained</a></li>
        <li><a href="/blog/webcam-vs-ip-camera">Webcam vs IP Camera: Which is Right for You?</a></li>
      </ul>
    `,
  },
  {
    path: "/blog/free-home-security-camera-setup",
    title: "Free Home Security Camera Setup Guide - Camera Stream",
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
    title: "Privacy-First Camera Monitoring Explained - Camera Stream",
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
    title: "Webcam vs IP Camera: Which is Right for You? - Camera Stream",
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
    title: "Contact Camera Stream - Support & Inquiries",
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
    title: "Privacy Policy - Camera Stream",
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
    title: "Terms of Service - Camera Stream",
    description:
      "Terms of service for Camera Stream — the free, privacy-focused security camera monitoring platform.",
    keywords: "camera stream terms, security camera terms of service",
    h1: "Terms of Service",
    body: `
      <p>These terms govern your use of Camera Stream. Camera Stream is provided free of charge for personal and small-business security monitoring.</p>
    `,
  },
];
