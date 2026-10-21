# Camera Stream

**Free, privacy-first camera monitoring in your browser.** Watch webcams, IP cameras, Home Assistant cameras and Raspberry Pi cameras from one dashboard — with motion detection, alerts and recording.

🌐 **Live app:** [camerastream.live](https://www.camerastream.live) · 📖 **Full docs:** [camerastream.live/documentation](https://www.camerastream.live/documentation)

---

## ✨ Features

- **Live view** of up to 16 cameras per account
- **Motion detection** with adjustable sensitivity and zones
- **Alerts** by email and push notification, with snapshots
- **Recording** in the browser, on your computer, or on a Raspberry Pi SD card
- **Home Assistant** integration (view HA cameras, send motion events, trigger recordings)
- **Private by design:** camera passwords and tokens are encrypted server-side and never shown in the browser
- **100% free**, no subscriptions

---

## 🚀 Quick Start (easiest: a webcam)

1. Go to [camerastream.live](https://www.camerastream.live) and create an account (check your spam folder for the confirmation email).
2. Click **Add Camera** → **Webcam** and allow camera access.
3. Turn on **Motion Detection** and **Alerts** in the camera settings. Done!

---

## 📷 Supported Cameras

| Type | How to add | Example URL |
|------|-----------|-------------|
| Webcam / USB camera | Add Camera → Webcam | — |
| IP camera (MJPEG/HTTP) | Add Camera → Network | `http://camera-ip/mjpeg` |
| Home Assistant camera | Settings → Home Assistant | URL + Long-Lived Access Token |
| Raspberry Pi camera | Add Camera → Network | `http://yourname.duckdns.org:8000/stream.mjpg` |

RTSP cameras have partial support. Common brand URLs: Axis `/axis-cgi/mjpg/video.cgi`, Hikvision `rtsp://ip:554/Streaming/Channels/101`, Dahua `rtsp://ip:554/cam/realmonitor?channel=1&subtype=0`.

---

## 🍓 Raspberry Pi (advanced, optional)

A Pi can stream its camera and save recordings to its SD card. In short:

1. Install Raspberry Pi OS, Node.js 18+ and FFmpeg.
2. Copy the [`pi-service/`](pi-service/) folder to the Pi — it contains the camera streamer (port **8000**) and the recording service (port **3002**).
3. Set a strong API key: `openssl rand -hex 32` → `PI_SERVICE_API_KEY`.
4. Set up a free [DuckDNS](https://www.duckdns.org) hostname and forward ports 8000 and 3002 on your router (or use Cloudflare Tunnel to avoid open ports).
5. Add the camera in the app with your DuckDNS URL.

👉 Step-by-step instructions: [`pi-service/README.md`](pi-service/README.md) and the [Raspberry Pi guide](https://www.camerastream.live/documentation).

---

## 🏠 Home Assistant

1. In HA, create a **Long-Lived Access Token** (Profile → Security).
2. In Camera Stream, open **Settings → Home Assistant**, enter your HA URL (use `https://`) and the token.
3. Fetch your cameras and add them. Optionally set up webhooks to send motion events or start recordings in HA.

Your token is encrypted on the server and never exposed to the browser. Details and example automations are in the [documentation](https://www.camerastream.live/documentation).

---

## 🔒 About VPNs

- **Using a VPN on your own phone or computer (ProtonVPN, NordVPN, etc.) works fine.**
- A full-tunnel VPN on the **camera device itself** (Pi or HA server) can block its stream. Fixes: Cloudflare Tunnel / Tailscale Funnel, Home Assistant Cloud (Nabu Casa), or split-tunneling ports 8000/3002.

---

## 🛠 Troubleshooting

| Problem | Try this |
|---------|----------|
| Camera won't load / timeout (504) | Check the camera is online, DuckDNS IP is current, and ports are forwarded |
| Home Assistant 401 error | Create a new token and paste it again (no extra spaces) |
| "Mixed content" error | Use an `https://` camera/HA URL |
| No confirmation email | Check your spam folder |
| Pi services not running | `sudo systemctl status camalert-pi.service` and `sudo journalctl -u camalert-pi.service -f` |

More fixes: [documentation → troubleshooting](https://www.camerastream.live/documentation).

---

## 🔐 Security Tips

- Use strong, unique passwords for your account, Pi and router.
- Only forward the ports you need (8000, 3002) — or use a tunnel instead.
- Keep your Pi updated: `sudo apt update && sudo apt upgrade`.

---

## 💻 For Developers

Built with React, Vite, TypeScript, Tailwind CSS and Supabase.

```bash
git clone https://github.com/Shiki07/Camera-Stream.git
cd Camera-Stream
npm install
npm run dev
```

---

## 📞 Support

Found a bug or have an idea? [Open a GitHub issue](../../issues) — include your camera type and any error message.
