import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cookie, X } from "lucide-react";


const STORAGE_KEY = "cookie_consent_v1";

type Consent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const applyConsent = (c: Consent) => {
  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: c.analytics ? "granted" : "denied",
      ad_storage: c.marketing ? "granted" : "denied",
      ad_user_data: c.marketing ? "granted" : "denied",
      ad_personalization: c.marketing ? "granted" : "denied",
    });
  }
};

export const CookieConsent = () => {
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setOpen(true);
    } catch {
      setOpen(true);
    }
    const reopen = () => setOpen(true);
    window.addEventListener("open-cookie-settings", reopen);
    return () => window.removeEventListener("open-cookie-settings", reopen);
  }, []);

  const save = (c: Omit<Consent, "necessary" | "timestamp">) => {
    const consent: Consent = {
      necessary: true,
      analytics: c.analytics,
      marketing: c.marketing,
      timestamp: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch {
      /* ignore */
    }
    applyConsent(consent);
    setOpen(false);
    setShowPrefs(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6 animate-in slide-in-from-bottom duration-300"
    >
      <div className="mx-auto max-w-4xl rounded-lg border border-border bg-card/95 backdrop-blur shadow-2xl">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Cookie className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                We value your privacy
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We use cookies to keep the site secure and, with your consent, to measure
                traffic and improve our service. Necessary cookies are required for the
                app to function. You can accept all, reject non-essential, or customize
                your choices. Read our{" "}
                <a href="/privacy" className="underline text-primary hover:text-primary/80">
                  Privacy Policy
                </a>
                .
              </p>

              {showPrefs && (
                <div className="mt-4 space-y-3 rounded-md border border-border bg-background/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Strictly necessary</p>
                      <p className="text-xs text-muted-foreground">
                        Required for authentication and core functionality. Always on.
                      </p>
                    </div>
                    <Switch checked disabled aria-label="Necessary cookies (always on)" />
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Analytics</p>
                      <p className="text-xs text-muted-foreground">
                        Anonymous usage statistics (Google Analytics) to help us improve.
                      </p>
                    </div>
                    <Switch
                      checked={analytics}
                      onCheckedChange={setAnalytics}
                      aria-label="Analytics cookies"
                    />
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Marketing</p>
                      <p className="text-xs text-muted-foreground">
                        Used to measure ad performance. Off by default.
                      </p>
                    </div>
                    <Switch
                      checked={marketing}
                      onCheckedChange={setMarketing}
                      aria-label="Marketing cookies"
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                {!showPrefs ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPrefs(true)}
                    >
                      Customize
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => save({ analytics: false, marketing: false })}
                    >
                      Reject non-essential
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => save({ analytics: true, marketing: true })}
                    >
                      Accept all
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => save({ analytics: false, marketing: false })}
                    >
                      Reject non-essential
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => save({ analytics, marketing })}
                    >
                      Save preferences
                    </Button>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => save({ analytics: false, marketing: false })}
              aria-label="Close and reject non-essential cookies"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
