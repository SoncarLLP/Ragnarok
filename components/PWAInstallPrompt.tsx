"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY_VISITS     = "ragnarok_pwa_visits";
const STORAGE_KEY_DISMISSED  = "ragnarok_pwa_dismissed_at";
const STORAGE_KEY_INSTALLED  = "ragnarok_pwa_installed";
const DISMISS_COOLDOWN_MS    = 7 * 24 * 60 * 60 * 1000; // 7 days

function shouldShowPrompt(): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEY_INSTALLED)) return false;
    const dismissedAt = localStorage.getItem(STORAGE_KEY_DISMISSED);
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < DISMISS_COOLDOWN_MS) return false;
    const visits = parseInt(localStorage.getItem(STORAGE_KEY_VISITS) ?? "0");
    return visits >= 3;
  } catch {
    return false;
  }
}

function incrementVisit() {
  try {
    const visits = parseInt(localStorage.getItem(STORAGE_KEY_VISITS) ?? "0");
    localStorage.setItem(STORAGE_KEY_VISITS, String(visits + 1));
  } catch {}
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    setIsIOS(ios);

    // Detect standalone mode
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Don't show if already in standalone / installed
    if (standalone) {
      try { localStorage.setItem(STORAGE_KEY_INSTALLED, "1"); } catch {}
      return;
    }

    // Increment visit count
    incrementVisit();

    // Capture the install prompt for Android/Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (shouldShowPrompt()) {
        setTimeout(() => setShowPrompt(true), 2000); // small delay after load
      }
    };
    window.addEventListener("beforeinstallprompt", handler);

    // For iOS, we show a manual guide prompt
    if (ios && shouldShowPrompt()) {
      setTimeout(() => setShowPrompt(true), 2000);
    }

    // Track installs
    window.addEventListener("appinstalled", () => {
      try { localStorage.setItem(STORAGE_KEY_INSTALLED, "1"); } catch {}
      setShowPrompt(false);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Also trigger after fitness/nutrition tracker usage
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/fitness") || path.startsWith("/nutrition")) {
      try {
        const visits = parseInt(localStorage.getItem(STORAGE_KEY_VISITS) ?? "0");
        if (visits < 3) {
          localStorage.setItem(STORAGE_KEY_VISITS, "3");
        }
      } catch {}
    }
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        try { localStorage.setItem(STORAGE_KEY_INSTALLED, "1"); } catch {}
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    try { localStorage.setItem(STORAGE_KEY_DISMISSED, String(Date.now())); } catch {}
    setShowPrompt(false);
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className="fixed inset-0 z-40 bg-black/40 sm:hidden"
        onClick={handleDismiss}
      />

      {/* Prompt: bottom sheet on mobile, banner on desktop */}
      <div
        className={`fixed z-50 transition-all duration-300
          sm:bottom-4 sm:right-4 sm:left-auto sm:max-w-sm sm:rounded-2xl
          bottom-0 left-0 right-0 rounded-t-2xl`}
        style={{
          background: "var(--nrs-card, #111118)",
          border: "1px solid var(--nrs-accent-border, rgba(201,168,76,0.2))",
          boxShadow: "0 -4px 30px rgba(0,0,0,0.4)",
        }}
      >
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <Image
              src="/icons/icon-72x72.png"
              alt="Ragnarök"
              width={52}
              height={52}
              className="rounded-xl shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base" style={{ color: "var(--nrs-text)" }}>
                Ragnarök
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>
                Add to your home screen for the full warrior experience
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 text-lg leading-none p-1"
              style={{ color: "var(--nrs-text-muted)" }}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>

          {/* Benefits */}
          <div className="space-y-1.5">
            {[
              "⚡ Log workouts offline",
              "🥗 Track nutrition anywhere",
              "🔔 Get training reminders",
              "⚔️ Full-screen warrior mode",
            ].map((benefit) => (
              <div key={benefit} className="text-xs flex items-center gap-2" style={{ color: "var(--nrs-text-body)" }}>
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px" style={{ background: "var(--nrs-border)" }} />

          {isIOS && !deferredPrompt ? (
            // iOS manual instructions
            <div className="space-y-2">
              <p className="text-xs font-medium" style={{ color: "var(--nrs-text)" }}>
                Install on iOS:
              </p>
              <ol className="text-xs space-y-1" style={{ color: "var(--nrs-text-muted)" }}>
                <li>1. Tap the <strong>Share</strong> button (⬆️) in Safari</li>
                <li>2. Scroll down and tap <strong>Add to Home Screen</strong></li>
                <li>3. Tap <strong>Add</strong> in the top-right corner</li>
              </ol>
              <button
                onClick={handleDismiss}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition"
                style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
              >
                Got it
              </button>
            </div>
          ) : (
            // Android / Chrome install button
            <div className="flex gap-2">
              <button
                onClick={handleDismiss}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition"
                style={{
                  border: "1px solid var(--nrs-border)",
                  color: "var(--nrs-text-muted)",
                  background: "transparent",
                }}
              >
                Not now
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
              >
                Install App
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
