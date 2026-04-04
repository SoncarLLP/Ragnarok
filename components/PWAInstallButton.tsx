"use client";

import { useState, useEffect } from "react";

/**
 * Install App button for the hamburger sidebar.
 * - Android/Chrome/desktop: dispatches "ragnarok:show-install" event (caught by PWAInstallPrompt)
 * - iOS Safari: shows an inline step-by-step modal (beforeinstallprompt is not supported)
 * - Already installed (standalone): shows "App installed ✅"
 */
export default function PWAInstallButton({ onAction }: { onAction?: () => void }) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS]             = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [mounted, setMounted]           = useState(false);

  useEffect(() => {
    setMounted(true);

    const ua = navigator.userAgent;
    setIsIOS(/iphone|ipad|ipod/i.test(ua));

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const onInstalled = () => setIsStandalone(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  // Don't render on server or once installed
  if (!mounted) return null;
  if (isStandalone) {
    return (
      <div
        className="flex items-center gap-4 px-4 py-3.5 text-[15px]"
        style={{ color: "var(--nrs-text-muted)" }}
      >
        <span className="text-xl w-7 shrink-0 text-center">✅</span>
        App installed
      </div>
    );
  }

  function handleClick() {
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Let PWAInstallPrompt handle it (bypasses visit-count gate)
      window.dispatchEvent(new CustomEvent("ragnarok:show-install"));
      onAction?.();
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="nrs-nav-link flex items-center gap-4 px-4 py-3.5 rounded-xl text-[15px] font-medium hover:bg-white/10 active:bg-white/15 transition w-full text-left"
      >
        <span className="text-xl w-7 shrink-0 text-center">📲</span>
        <span className="flex-1">Install App</span>
      </button>

      {/* iOS instructions modal */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center"
          onClick={() => setShowIOSModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Sheet */}
          <div
            className="relative w-full max-w-sm rounded-t-2xl p-6 space-y-4 mx-auto"
            style={{
              background: "var(--nrs-card, #111118)",
              border: "1px solid var(--nrs-accent-border, rgba(201,168,76,0.25))",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 rounded-full mx-auto -mt-1 mb-2" style={{ background: "var(--nrs-border)" }} />

            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base" style={{ color: "var(--nrs-text)" }}>
                Add Ragnarök to Home Screen
              </h3>
              <button
                onClick={() => setShowIOSModal(false)}
                aria-label="Close"
                className="w-7 h-7 flex items-center justify-center rounded-full text-sm hover:bg-white/10 transition"
                style={{ color: "var(--nrs-text-muted)" }}
              >
                ✕
              </button>
            </div>

            <p className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>
              Install the app for the full warrior experience — works offline, loads faster.
            </p>

            <ol className="space-y-3 text-sm" style={{ color: "var(--nrs-text-body)" }}>
              <li className="flex items-start gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
                >
                  1
                </span>
                <span>
                  Tap the <strong>Share</strong> button{" "}
                  <span className="inline-block align-middle text-base">⬆️</span>{" "}
                  at the bottom of Safari
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
                >
                  2
                </span>
                <span>
                  Scroll down and tap <strong>Add to Home Screen</strong>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
                >
                  3
                </span>
                <span>
                  Tap <strong>Add</strong> in the top-right corner — done!
                </span>
              </li>
            </ol>

            <p className="text-xs text-center" style={{ color: "var(--nrs-text-muted)" }}>
              Safari only — Chrome on iOS does not support PWA installation
            </p>

            <button
              onClick={() => { setShowIOSModal(false); onAction?.(); }}
              className="w-full py-3 rounded-xl text-sm font-semibold transition"
              style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
