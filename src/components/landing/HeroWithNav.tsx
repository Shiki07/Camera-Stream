import { Link } from "react-router-dom";

/**
 * HeroWithNav — Above-the-fold experience for the Camera Stream landing page.
 * Sticky nav + two-column hero + browser mockup + scroll indicator.
 * Uses scoped CSS variables (--hn-*) so it doesn't collide with the app theme.
 */
const HeroWithNav = () => {
  return (
    <div className="hn-root">
      <style>{hnCss}</style>

      {/* Sticky Nav */}
      <nav className="hn-nav" aria-label="Primary">
        <a href="/" className="hn-brand" aria-label="Camera Stream home">
          <span className="hn-brand-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="5" width="15" height="14" rx="2" />
              <path d="M23 7l-7 5 7 5V7z" />
            </svg>
          </span>
          <span className="hn-brand-text">Camera Stream</span>
        </a>

        <div className="hn-nav-right">
          <Link to="/documentation" className="hn-nav-link">Docs</Link>
          <Link to="/auth" className="hn-nav-link">Sign In</Link>
          <Link to="/auth" className="hn-btn-primary">
            Get Started
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hn-hero">
        {/* Left */}
        <div className="hn-left">
          <div className="hn-badge">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            100% Free &amp; Privacy-First · Open Source
          </div>

          <h1 className="hn-h1">
            Your Cameras, One{" "}
            <span className="hn-gradient">Smart Dashboard</span>
          </h1>

          <p className="hn-lede">
            Privacy-focused camera monitoring with{" "}
            <strong>real-time motion detection</strong>, instant email alerts,
            and <strong>fully local storage</strong>. Works with webcams, RTSP
            streams, and any IP camera — nothing ever leaves your network.
          </p>

          <div className="hn-cta-row">
            <Link to="/auth" className="hn-btn-primary hn-btn-lg">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
              Start Monitoring Free
            </Link>
            <a
              href="https://github.com/Shiki07/Camera-Stream"
              target="_blank"
              rel="noopener noreferrer"
              className="hn-btn-secondary hn-btn-lg"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.97 3.22 9.18 7.69 10.67.56.1.77-.24.77-.54 0-.27-.01-1.15-.02-2.09-3.13.68-3.79-1.34-3.79-1.34-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.57 0-1.23.44-2.23 1.16-3.02-.12-.29-.5-1.44.11-3 0 0 .95-.31 3.11 1.16.9-.25 1.87-.38 2.83-.38.96 0 1.93.13 2.83.38 2.16-1.47 3.1-1.16 3.1-1.16.62 1.56.23 2.71.11 3 .73.79 1.16 1.79 1.16 3.02 0 4.33-2.64 5.28-5.15 5.56.4.35.76 1.03.76 2.07 0 1.5-.01 2.7-.01 3.07 0 .3.2.65.78.54 4.47-1.49 7.68-5.7 7.68-10.67C23.25 5.48 18.27.5 12 .5z" />
              </svg>
              View on GitHub
            </a>
          </div>

          <div className="hn-proof">
            <div className="hn-avatars" aria-hidden="true">
              <span className="hn-avatar" style={{ background: "#2f74e8", marginLeft: 0 }}>JK</span>
              <span className="hn-avatar" style={{ background: "#0ea5a4" }}>MR</span>
              <span className="hn-avatar" style={{ background: "#7c5cf0" }}>AL</span>
              <span className="hn-avatar" style={{ background: "#334766" }}>+</span>
            </div>
            <span>Trusted by <strong>12,400+</strong> developers</span>
            <span className="hn-dot" />
            <span>Open source on <strong>GitHub</strong></span>

          </div>
        </div>

        {/* Right — Mockup */}
        <div className="hn-mockup">
          <div className="hn-browser">
            <div className="hn-chrome">
              <div className="hn-dots" aria-hidden="true">
                <span style={{ background: "#f26d6d" }} />
                <span style={{ background: "#e8b04d" }} />
                <span style={{ background: "#4cc776" }} />
              </div>
              <div className="hn-url">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                camerastream.live/dashboard
              </div>
              <div style={{ width: 52 }} aria-hidden="true" />
            </div>

            <div className="hn-grid">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="hn-cam" style={{ background: camBg(i) }}>
                  <CamScene index={i} />

                  <div className="hn-cam-top">
                    <span className="hn-live">
                      <span
                        className="hn-pulse"
                        style={{ animationDelay: `${[0, -0.5, -1, -1.4][i]}s` }}
                      />
                      Live
                    </span>
                    {i === 0 && (
                      <span className="hn-motion">
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 01-3.46 0" />
                        </svg>
                        Motion
                      </span>
                    )}
                  </div>
                  <div className="hn-cam-bottom">
                    <span className="hn-cam-label">{camLabels[i]}</span>
                    <span className="hn-cam-time">
                      {["00:12", "01:47", "00:03", "02:34"][i]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Floating status cards */}
          <div className="hn-float hn-float-top" aria-hidden="true">
            <span className="hn-float-icon" style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </span>
            <div>
              <div className="hn-float-title">Secure</div>
              <div className="hn-float-sub">100% Local Storage</div>
            </div>
          </div>
          <div className="hn-float hn-float-bottom" aria-hidden="true">
            <span className="hn-float-icon" style={{ background: "rgba(94,162,255,0.15)", color: "#5ea2ff" }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
            <div>
              <div className="hn-float-title">16 Cameras</div>
              <div className="hn-float-sub">All Online</div>
            </div>
          </div>
        </div>
      </section>

      {/* Scroll indicator */}
      <a href="#features" className="hn-scroll" aria-label="Scroll to features">
        <span>Scroll</span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </a>
    </div>
  );
};

const camLabels = ["Driveway", "Hallway", "Garage", "Backyard"];

const camBg = (i: number) => {
  const gradients = [
    "linear-gradient(160deg, #0a1a2e 0%, #122840 60%, #0f2038 100%)",
    "linear-gradient(160deg, #0d1d33 0%, #14263f 100%)",
    "linear-gradient(160deg, #0a1626 0%, #10203a 100%)",
    "linear-gradient(160deg, #0b1c30 0%, #142a44 100%)",
  ];
  return gradients[i];
};

const CamScene = ({ index }: { index: number }) => {
  // Shared style: sits behind overlays, full cover
  const common = {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
  };

  if (index === 0) {
    // Driveway w/ car + small buildings (matches reference)
    return (
      <svg style={common} viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="sky0" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0d2036" />
            <stop offset="1" stopColor="#0a1a2e" />
          </linearGradient>
        </defs>
        <rect width="160" height="100" fill="url(#sky0)" />
        {/* ground */}
        <rect y="72" width="160" height="28" fill="#0a1826" opacity="0.7" />
        {/* small building blocks left */}
        <rect x="10" y="42" width="10" height="10" fill="#1b3352" opacity="0.85" />
        <rect x="22" y="46" width="8" height="6" fill="#1b3352" opacity="0.85" />
        <rect x="12" y="55" width="6" height="6" fill="#22406a" opacity="0.9" />
        <rect x="22" y="55" width="6" height="6" fill="#22406a" opacity="0.9" />
        {/* car */}
        <g transform="translate(78,60)">
          <path d="M2 12 L6 4 L26 4 L32 12 L32 18 L2 18 Z" fill="#2b5591" />
          <rect x="8" y="6" width="8" height="6" fill="#4a80c4" opacity="0.7" />
          <rect x="18" y="6" width="8" height="6" fill="#4a80c4" opacity="0.7" />
          <circle cx="9" cy="19" r="2.6" fill="#0a1220" />
          <circle cx="25" cy="19" r="2.6" fill="#0a1220" />
          <rect x="1" y="10" width="2" height="3" fill="#ffd27a" opacity="0.8" />
        </g>
      </svg>
    );
  }

  if (index === 1) {
    // Hallway — perspective walls + door
    return (
      <svg style={common} viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0e2340" />
            <stop offset="1" stopColor="#0a1930" />
          </linearGradient>
        </defs>
        <rect width="160" height="100" fill="url(#sky1)" />
        {/* perspective vanishing walls */}
        <polygon points="0,0 0,100 60,72 60,28" fill="#122a48" opacity="0.85" />
        <polygon points="160,0 160,100 100,72 100,28" fill="#122a48" opacity="0.85" />
        <polygon points="0,100 60,72 100,72 160,100" fill="#0a1a2f" />
        <polygon points="0,0 60,28 100,28 160,0" fill="#0a1a2f" opacity="0.9" />
        {/* far door */}
        <rect x="72" y="38" width="16" height="34" fill="#1c3a63" />
        <circle cx="85" cy="56" r="0.9" fill="#ffd27a" />
        {/* ceiling light */}
        <circle cx="80" cy="24" r="2.2" fill="#9fc6ff" opacity="0.85" />
      </svg>
    );
  }

  if (index === 2) {
    // Garage / driveway with streetlight
    return (
      <svg style={common} viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0c1e36" />
            <stop offset="1" stopColor="#091628" />
          </linearGradient>
          <radialGradient id="lamp2" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffd27a" stopOpacity="0.7" />
            <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="160" height="100" fill="url(#sky2)" />
        <rect y="76" width="160" height="24" fill="#0a1826" />
        {/* garage door hint left */}
        <rect x="6" y="46" width="42" height="30" fill="#132a48" />
        <line x1="6" y1="56" x2="48" y2="56" stroke="#0a1a2e" strokeWidth="1" />
        <line x1="6" y1="66" x2="48" y2="66" stroke="#0a1a2e" strokeWidth="1" />
        {/* lamp glow */}
        <circle cx="92" cy="52" r="24" fill="url(#lamp2)" />
        {/* streetlight */}
        <rect x="91" y="52" width="2" height="30" fill="#1b3352" />
        <circle cx="92" cy="50" r="3" fill="#ffd27a" />
        <path d="M86 50 L98 50 L96 46 L88 46 Z" fill="#1b3352" />
      </svg>
    );
  }

  // index 3 — Backyard with lit windows
  return (
    <svg style={common} viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e2340" />
          <stop offset="1" stopColor="#0a1a2e" />
        </linearGradient>
      </defs>
      <rect width="160" height="100" fill="url(#sky3)" />
      <rect y="74" width="160" height="26" fill="#0a1826" />
      {/* house silhouette */}
      <polygon points="70,26 140,26 140,74 70,74" fill="#132a48" />
      <polygon points="70,26 105,10 140,26" fill="#0f2340" />
      {/* windows */}
      <rect x="82" y="38" width="10" height="10" fill="#f0c96a" opacity="0.85" />
      <rect x="100" y="38" width="10" height="10" fill="#2a4a75" />
      <rect x="118" y="38" width="10" height="10" fill="#f0c96a" opacity="0.85" />
      <rect x="82" y="54" width="10" height="10" fill="#2a4a75" />
      <rect x="100" y="54" width="10" height="14" fill="#f0c96a" opacity="0.9" />
      <rect x="118" y="54" width="10" height="10" fill="#2a4a75" />
      {/* fence */}
      <g fill="#122841">
        <rect x="4" y="60" width="3" height="14" />
        <rect x="12" y="60" width="3" height="14" />
        <rect x="20" y="60" width="3" height="14" />
        <rect x="28" y="60" width="3" height="14" />
        <rect x="36" y="60" width="3" height="14" />
        <rect x="44" y="60" width="3" height="14" />
      </g>
    </svg>
  );
};



const hnCss = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

.hn-root {
  --bg: #0b1220;
  --bg2: #0e1628;
  --panel: #111c31;
  --panel2: #16223b;
  --line: rgba(120,160,255,0.14);
  --line2: rgba(120,160,255,0.22);
  --blue: #3b82f6;
  --blue-bright: #5ea2ff;
  --cyan: #67d4ff;
  --text: #eef3fb;
  --text2: #b8c6dd;
  --green: #34d399;
  --red: #f87171;

  position: relative;
  background-color: var(--bg);
  background-image:
    radial-gradient(900px 500px at 80% -10%, rgba(59,130,246,0.14), transparent 60%),
    radial-gradient(700px 500px at 5% 110%, rgba(103,212,255,0.07), transparent 60%),
    linear-gradient(rgba(120,160,255,0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(120,160,255,0.045) 1px, transparent 1px);
  background-size: auto, auto, 44px 44px, 44px 44px;
  color: var(--text);
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-height: 100vh;
}

.hn-root * { box-sizing: border-box; }

/* Nav */
.hn-nav {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px clamp(20px, 4vw, 48px);
  background: rgba(11,18,32,0.72);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--line);
}
.hn-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; }
.hn-brand-icon {
  width: 34px; height: 34px; border-radius: 9px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(59,130,246,0.25), rgba(59,130,246,0.08));
  border: 1px solid rgba(94,162,255,0.4);
  color: var(--blue-bright);
}
.hn-brand-text { font-weight: 800; font-size: 17px; letter-spacing: -0.01em; color: var(--text); }
.hn-nav-right { display: flex; align-items: center; gap: 8px; }
.hn-nav-link {
  font-size: 14px; font-weight: 700; color: var(--text2);
  padding: 9px 14px; border-radius: 8px; text-decoration: none;
  transition: all 0.15s;
}
.hn-nav-link:hover { color: var(--text); background: rgba(120,160,255,0.08); }

.hn-btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  font-weight: 800; font-size: 14px; border-radius: 9px;
  padding: 10px 18px; text-decoration: none; color: #fff;
  background: linear-gradient(180deg, #4a90ff, #2f74e8);
  border: none; cursor: pointer;
  box-shadow: 0 1px 0 rgba(255,255,255,0.18) inset, 0 8px 24px -8px rgba(59,130,246,0.55);
  transition: transform 0.15s, box-shadow 0.15s;
}
.hn-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 1px 0 rgba(255,255,255,0.18) inset, 0 12px 30px -8px rgba(59,130,246,0.7); }
.hn-btn-primary:active { transform: translateY(0); }
.hn-btn-primary:focus-visible { outline: 2px solid var(--blue-bright); outline-offset: 2px; }

.hn-btn-lg { padding: 14px 24px; font-size: 15px; border-radius: 11px; }

.hn-btn-secondary {
  display: inline-flex; align-items: center; gap: 8px;
  font-weight: 800; text-decoration: none;
  color: var(--text);
  background: rgba(120,160,255,0.09);
  border: 1px solid rgba(140,175,255,0.45);
  transition: all 0.15s; cursor: pointer;
}
.hn-btn-secondary:hover { background: rgba(120,160,255,0.16); border-color: rgba(160,190,255,0.65); }
.hn-btn-secondary:active { background: rgba(120,160,255,0.22); }
.hn-btn-secondary:focus-visible { outline: 2px solid var(--blue-bright); outline-offset: 2px; }

/* Hero */
.hn-hero {
  max-width: 1240px; margin: 0 auto;
  padding: clamp(36px, 5.5vh, 64px) clamp(20px, 4vw, 48px) 24px;
  display: grid;
  grid-template-columns: minmax(0, 46%) minmax(0, 54%);
  gap: clamp(28px, 4vw, 56px);
  align-items: center;
  min-height: calc(100vh - 63px);
}
@media (max-width: 900px) {
  .hn-hero { grid-template-columns: 1fr; min-height: auto; }
}

.hn-badge {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 700; color: var(--blue-bright);
  border: 1px solid rgba(94,162,255,0.35); border-radius: 999px;
  padding: 7px 14px; background: rgba(59,130,246,0.1);
  margin-bottom: 22px;
}

.hn-h1 {
  font-size: clamp(38px, 4.6vw, 60px);
  line-height: 1.06; letter-spacing: -0.03em; font-weight: 800;
  margin: 0 0 18px 0; color: var(--text);
}
.hn-gradient {
  background: linear-gradient(92deg, var(--blue-bright), var(--cyan));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}

.hn-lede {
  font-size: clamp(16px, 1.4vw, 18px); line-height: 1.6;
  color: var(--text2); font-weight: 500;
  max-width: 52ch; margin: 0 0 26px 0;
}
.hn-lede strong { color: var(--text); font-weight: 700; }

.hn-cta-row { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }

.hn-proof {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  font-size: 13.5px; color: var(--text2); font-weight: 600;
}
.hn-proof strong { color: var(--text); }
.hn-avatars { display: flex; }
.hn-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid var(--bg);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800; color: #fff;
  margin-left: -8px;
}
.hn-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--text2); opacity: 0.5; }

/* Mockup */
.hn-mockup { position: relative; }
.hn-mockup::before {
  content: ''; position: absolute; inset: -8% -6%;
  background: radial-gradient(closest-side, rgba(59,130,246,0.22), transparent 70%);
  animation: hn-glow 5s ease-in-out infinite;
  pointer-events: none;
}
@keyframes hn-glow { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }

.hn-browser {
  position: relative; z-index: 1;
  background: linear-gradient(180deg, var(--panel2), var(--panel));
  border: 1px solid var(--line2); border-radius: 14px; overflow: hidden;
  box-shadow:
    0 40px 80px -24px rgba(0,0,0,0.6),
    0 12px 32px -12px rgba(30,64,175,0.35),
    0 0 0 1px rgba(255,255,255,0.03) inset;
}
.hn-chrome {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--line);
  background: rgba(255,255,255,0.02);
}
.hn-dots { display: flex; gap: 7px; }
.hn-dots span { width: 11px; height: 11px; border-radius: 50%; display: block; }
.hn-url {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 12px; color: var(--text2);
  background: rgba(0,0,0,0.28);
  border: 1px solid var(--line);
  border-radius: 7px; padding: 6px 12px;
}

.hn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px; }

.hn-cam {
  position: relative; border-radius: 9px; overflow: hidden;
  aspect-ratio: 16 / 10; border: 1px solid rgba(120,160,255,0.16);
}
.hn-cam::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 4px);
}

.hn-cam-top {
  position: absolute; top: 8px; left: 8px; right: 8px; z-index: 2;
  display: flex; justify-content: space-between; align-items: center;
}
.hn-cam-bottom {
  position: absolute; bottom: 8px; left: 8px; right: 8px; z-index: 2;
  display: flex; justify-content: space-between; align-items: center;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px; color: var(--text2);
}
.hn-cam-label {
  background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
  padding: 3px 8px; border-radius: 5px; color: var(--text);
}
.hn-cam-time {
  background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
  padding: 3px 8px; border-radius: 5px;
}

.hn-live {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10.5px; font-weight: 700; color: #d9f7e8;
  background: rgba(6,20,14,0.6); backdrop-filter: blur(4px);
  padding: 4px 9px; border-radius: 999px;
  border: 1px solid rgba(52,211,153,0.35);
}
.hn-pulse {
  position: relative; width: 7px; height: 7px; border-radius: 50%;
  background: var(--green); display: inline-block;
}
.hn-pulse::after {
  content: ''; position: absolute; inset: -4px;
  border: 1.5px solid var(--green); border-radius: 50%;
  animation: hn-ping 1.8s ease-out infinite;
}
@keyframes hn-ping {
  0% { transform: scale(0.5); opacity: 0.9; }
  100% { transform: scale(1.6); opacity: 0; }
}

.hn-motion {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10.5px; font-weight: 800; color: #fecaca;
  background: rgba(127,29,29,0.75);
  border: 1px solid rgba(248,113,113,0.5);
  padding: 4px 9px; border-radius: 6px;
  animation: hn-blink 1.4s ease-in-out infinite;
}
@keyframes hn-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

/* Floating cards */
.hn-float {
  position: absolute; z-index: 2;
  display: flex; align-items: center; gap: 10px;
  background: linear-gradient(180deg, var(--panel2), var(--panel));
  border: 1px solid var(--line2);
  border-radius: 12px; padding: 10px 14px;
  box-shadow: 0 12px 32px -12px rgba(0,0,0,0.6);
  animation: hn-float 6s ease-in-out infinite;
}
.hn-float-top { top: -18px; right: -14px; }
.hn-float-bottom { bottom: -18px; left: -14px; animation-delay: -3s; }
@keyframes hn-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
.hn-float-icon {
  width: 32px; height: 32px; border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
}
.hn-float-title { font-size: 12.5px; font-weight: 800; color: var(--text); }
.hn-float-sub { font-size: 10.5px; color: var(--text2); font-weight: 600; }

@media (max-width: 640px) {
  .hn-float-top { top: -12px; right: 8px; }
  .hn-float-bottom { bottom: -12px; left: 8px; }
}

/* Scroll indicator */
.hn-scroll {
  position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
  display: inline-flex; flex-direction: column; align-items: center; gap: 4px;
  color: var(--text2); text-decoration: none;
  font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  animation: hn-float 3s ease-in-out infinite;
  z-index: 1;
}
.hn-scroll:hover { color: var(--text); }

@media (max-width: 900px) {
  .hn-scroll { position: static; transform: none; margin: 24px auto 32px; display: flex; }
}
`;

export default HeroWithNav;
