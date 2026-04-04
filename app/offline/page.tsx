"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.href = "/";
    } else {
      window.location.reload();
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "var(--nrs-bg, #0a0a0f)" }}
    >
      {/* Decorative rune lines */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 41px)",
        }}
      />

      <div className="relative z-10 max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/icons/icon-192x192.png"
            alt="Ragnarök"
            width={96}
            height={96}
            className="rounded-2xl opacity-80"
          />
        </div>

        {/* Norse-themed heading */}
        <div className="space-y-3">
          <div className="text-5xl">⚡</div>
          <h1
            className="text-3xl font-bold"
            style={{
              color: "var(--nrs-text, #f5f5f0)",
              fontFamily: "var(--font-heading, serif)",
              letterSpacing: "0.05em",
            }}
          >
            The Bridge Is Down
          </h1>
          <p
            className="text-base leading-relaxed"
            style={{ color: "var(--nrs-text-muted, #9ca3af)" }}
          >
            You appear to be offline. Your Ragnarök journey continues when you reconnect.
          </p>
        </div>

        {/* Divider rune */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px" style={{ background: "var(--nrs-border, rgba(255,255,255,0.1))" }} />
          <span style={{ color: "var(--nrs-text-muted, #6b7280)", fontSize: "1.25rem" }}>ᚨ</span>
          <div className="flex-1 h-px" style={{ background: "var(--nrs-border, rgba(255,255,255,0.1))" }} />
        </div>

        {/* Status indicator */}
        <div
          className="rounded-xl p-4 space-y-2"
          style={{
            border: "1px solid var(--nrs-border, rgba(255,255,255,0.1))",
            background: "var(--nrs-card, rgba(255,255,255,0.03))",
          }}
        >
          <div className="flex items-center justify-center gap-2 text-sm">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{
                background: isOnline ? "#34d399" : "#f87171",
                boxShadow: isOnline ? "0 0 6px #34d399" : "0 0 6px #f87171",
              }}
            />
            <span style={{ color: "var(--nrs-text-body, #e5e5e0)" }}>
              {isOnline ? "Connection restored" : "No internet connection"}
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--nrs-text-muted, #6b7280)" }}>
            Any workouts or meals you logged offline will sync automatically when you reconnect.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleRetry}
            className="w-full py-3 rounded-xl font-semibold text-sm transition hover:opacity-90 active:scale-95"
            style={{
              background: "var(--nrs-accent, #c9a84c)",
              color: "var(--nrs-bg, #0a0a0f)",
            }}
          >
            {isOnline ? "Return to Ragnarök →" : "Retry Connection"}
          </button>

          {/* Available offline quick links */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/fitness/log"
              className="py-3 px-4 rounded-xl text-sm font-medium text-center transition hover:opacity-90 active:scale-95"
              style={{
                border: "1px solid var(--nrs-border, rgba(255,255,255,0.1))",
                background: "var(--nrs-panel, rgba(255,255,255,0.05))",
                color: "var(--nrs-text, #f5f5f0)",
              }}
            >
              ⚔️ Log Workout
            </Link>
            <Link
              href="/nutrition/diary"
              className="py-3 px-4 rounded-xl text-sm font-medium text-center transition hover:opacity-90 active:scale-95"
              style={{
                border: "1px solid var(--nrs-border, rgba(255,255,255,0.1))",
                background: "var(--nrs-panel, rgba(255,255,255,0.05))",
                color: "var(--nrs-text, #f5f5f0)",
              }}
            >
              🥗 Log Meal
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs" style={{ color: "var(--nrs-text-muted, #4b5563)" }}>
          Ragnarök · SONCAR Limited
        </p>
      </div>
    </div>
  );
}
