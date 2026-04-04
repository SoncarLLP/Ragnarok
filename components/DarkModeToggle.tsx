"use client";

import { useTheme } from "@/components/ThemeProvider";
import { useRef } from "react";

/**
 * Sun / Moon toggle button rendered in the site header.
 *
 * - Animates smoothly between ☀️ (light) and 🌙 (dark) states.
 * - For signed-in users, saves preference to DB via /api/account/theme/mode.
 * - For guests, saves preference to localStorage (key: nrs_light_mode).
 */
export default function DarkModeToggle({
  isSignedIn,
}: {
  isSignedIn: boolean;
}) {
  const { isLightModeActive, setLightMode } = useTheme();
  const spinRef = useRef<HTMLSpanElement>(null);

  const toggle = async () => {
    const newMode = !isLightModeActive;

    // Trigger spin animation
    if (spinRef.current) {
      spinRef.current.classList.remove("nrs-mode-icon-spin");
      // Force reflow to restart animation
      void spinRef.current.offsetWidth;
      spinRef.current.classList.add("nrs-mode-icon-spin");
    }

    setLightMode(newMode);

    if (isSignedIn) {
      try {
        await fetch("/api/account/theme/mode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lightMode: newMode }),
        });
      } catch {
        // Fallback to localStorage if API fails
        localStorage.setItem("nrs_light_mode", newMode ? "light" : "dark");
      }
    } else {
      localStorage.setItem("nrs_light_mode", newMode ? "light" : "dark");
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={
        isLightModeActive ? "Switch to dark mode" : "Switch to light mode"
      }
      title={isLightModeActive ? "Dark mode" : "Light mode"}
      className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/10 transition-colors shrink-0"
      style={{
        color: "var(--nrs-text-muted)",
      }}
    >
      <span
        ref={spinRef}
        className="nrs-mode-icon text-lg leading-none select-none"
        aria-hidden="true"
      >
        {isLightModeActive ? "☀️" : "🌙"}
      </span>
    </button>
  );
}
