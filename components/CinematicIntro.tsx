"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const STORAGE_KEY = "ragnarok_intro_seen_v1";

export default function CinematicIntro() {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<"active" | "fading" | "done">("active");

  useEffect(() => {
    // Only show on first visit (not on every page load)
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (seen) return;
    } catch {
      return;
    }
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;

    // Total cinematic duration ~3.8s, then fade out
    const fadeTimer = setTimeout(() => setPhase("fading"), 3200);
    const doneTimer = setTimeout(() => {
      setPhase("done");
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    }, 4200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [visible]);

  const skip = () => {
    setPhase("fading");
    setTimeout(() => {
      setPhase("done");
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    }, 500);
  };

  if (!visible || phase === "done") return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position:   "fixed",
        inset:      0,
        zIndex:     9999,
        background: "#000",
        display:    "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow:   "hidden",
        animation:  phase === "fading"
          ? "nrs-intro-fade-out 1s ease-out forwards"
          : undefined,
        pointerEvents: phase === "fading" ? "none" : "all",
      }}
    >
      {/* Lightning flash layer */}
      <div style={{
        position:   "absolute",
        inset:      0,
        background: "rgba(201,168,76,0.06)",
        animation:  "nrs-intro-lightning 3.8s ease-out forwards",
        pointerEvents: "none",
      }} />

      {/* Rune symbols flash */}
      <div style={{
        position:   "absolute",
        inset:      0,
        display:    "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize:   "8rem",
        letterSpacing: "2rem",
        color:      "rgba(201,168,76,0.7)",
        animation:  "nrs-intro-rune-flash 3.8s ease-out forwards",
        fontFamily: "serif",
        userSelect: "none",
        pointerEvents: "none",
      }}>
        ᚱ ᚷ ᚾ ᚱ
      </div>

      {/* Logo emerges */}
      <div style={{
        animation: "nrs-intro-logo-emerge 3.8s ease-out forwards",
        display:   "flex",
        flexDirection: "column",
        alignItems: "center",
        gap:       "1.5rem",
        position:  "relative",
        zIndex:    1,
      }}>
        <Image
          src="/soncar-logo-ragnarok.png"
          alt="Ragnarök"
          width={220}
          height={220}
          priority
          style={{
            filter:    "drop-shadow(0 0 40px rgba(201,168,76,0.6)) drop-shadow(0 0 80px rgba(201,168,76,0.25))",
            height:    "14rem",
            width:     "auto",
          }}
        />

        {/* Tagline */}
        <div style={{
          animation:   "nrs-intro-tagline 3.8s ease-out forwards",
          textAlign:   "center",
        }}>
          <p style={{
            fontFamily:    "'Cinzel', serif",
            fontSize:      "1.1rem",
            letterSpacing: "0.35em",
            color:         "rgba(201,168,76,0.9)",
            textTransform: "uppercase",
            marginBottom:  "0.4rem",
          }}>
            The Age of Ragnarök Begins
          </p>
          <div style={{
            height:     "1px",
            background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)",
            margin:     "0.75rem auto",
            width:      "280px",
          }} />
        </div>
      </div>

      {/* Skip button */}
      <button
        onClick={skip}
        style={{
          position:    "absolute",
          bottom:      "2rem",
          right:       "2rem",
          background:  "transparent",
          border:      "1px solid rgba(201,168,76,0.3)",
          borderRadius: "0.375rem",
          color:       "rgba(201,168,76,0.6)",
          padding:     "0.375rem 0.875rem",
          fontSize:    "0.75rem",
          fontFamily:  "system-ui, sans-serif",
          letterSpacing: "0.08em",
          cursor:      "pointer",
          transition:  "color 0.2s, border-color 0.2s",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.color = "rgba(201,168,76,1)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201,168,76,0.6)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.color = "rgba(201,168,76,0.6)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201,168,76,0.3)";
        }}
      >
        Skip
      </button>
    </div>
  );
}
