"use client";

import { useEffect, useState, useRef } from "react";
import { formatTierName } from "@/lib/loyalty";

const TIER_ORDER = [
  "Bronze 1", "Bronze 2", "Bronze 3",
  "Silver 1", "Silver 2", "Silver 3",
  "Gold 1",   "Gold 2",   "Gold 3",
  "Platinum 1", "Platinum 2", "Platinum 3",
  "Diamond",
];

// Themes that unlock at first entry into a tier family
const TIER_THEME_UNLOCKS: Record<string, { theme: string; sigil: string; color: string; glowColor: string }> = {
  "Silver 1":   { theme: "silver",   sigil: "ᚦ", color: "#a07828",  glowColor: "rgba(160,120,40,0.6)"  },
  "Gold 1":     { theme: "gold",     sigil: "ᛟ", color: "#d4a017",  glowColor: "rgba(212,160,23,0.7)"  },
  "Platinum 1": { theme: "platinum", sigil: "ᛉ", color: "#7eb8d4",  glowColor: "rgba(126,184,212,0.7)" },
  "Diamond":    { theme: "diamond",  sigil: "ᛞ", color: "#a78bfa",  glowColor: "rgba(167,139,250,0.7)" },
};

interface TierRevealProps {
  userId: string;
  currentTier: string;
  tierRevealsSeen: Record<string, boolean>;
}

export default function TierReveal({ userId, currentTier, tierRevealsSeen }: TierRevealProps) {
  const [revealTier, setRevealTier] = useState<string | null>(null);
  const [phase, setPhase] = useState<"active" | "fading" | "done">("active");
  const markedRef = useRef(false);

  useEffect(() => {
    const normalised = formatTierName(currentTier);
    const tierKey = normalised.replace(" ", "_").toLowerCase();

    // Only show reveal for tiers that unlock a new theme
    const unlockEntry = TIER_THEME_UNLOCKS[normalised];
    if (!unlockEntry) return;

    // Check if already seen
    if (tierRevealsSeen?.[tierKey]) return;

    setRevealTier(normalised);
  }, [currentTier, tierRevealsSeen]);

  useEffect(() => {
    if (!revealTier || markedRef.current) return;
    markedRef.current = true;

    const fadeTimer = setTimeout(() => setPhase("fading"), 3400);
    const doneTimer = setTimeout(() => {
      setPhase("done");
      // Mark as seen in the DB
      const tierKey = revealTier.replace(" ", "_").toLowerCase();
      fetch("/api/account/tier-reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierKey }),
      }).catch(() => {});
    }, 4200);

    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [revealTier, userId]);

  if (!revealTier || phase === "done") return null;

  const unlock = TIER_THEME_UNLOCKS[revealTier];
  if (!unlock) return null;

  return (
    <div
      aria-live="polite"
      style={{
        position:        "fixed",
        inset:           0,
        zIndex:          9998,
        background:      "#000",
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        justifyContent:  "center",
        overflow:        "hidden",
        animation:       phase === "fading"
          ? "nrs-reveal-fade-out 0.8s ease-out forwards"
          : undefined,
      }}
    >
      {/* Marble sweep */}
      <div style={{
        position:   "absolute",
        inset:      0,
        background: `linear-gradient(135deg, transparent 0%, ${unlock.glowColor} 50%, transparent 100%)`,
        animation:  "nrs-reveal-marble-sweep 1.2s ease-out 0.8s forwards",
        transform:  "translateX(-100%)",
        opacity:    0,
        pointerEvents: "none",
      }} />

      {/* Rune swirl */}
      <div style={{
        position:   "absolute",
        fontSize:   "6rem",
        color:      unlock.color,
        animation:  "nrs-reveal-rune-spin 1.8s ease-out forwards",
        fontFamily: "serif",
        opacity:    0,
        letterSpacing: "1rem",
        userSelect: "none",
        pointerEvents: "none",
      }}>
        ᚱ {unlock.sigil} ᚷ
      </div>

      {/* Tier name blazes */}
      <div style={{
        animation:     "nrs-reveal-tier-blaze 3.4s ease-out 0.6s forwards",
        opacity:       0,
        textAlign:     "center",
        position:      "relative",
        zIndex:        1,
      }}>
        <p style={{
          fontFamily:    "'Cinzel', serif",
          fontSize:      "0.85rem",
          letterSpacing: "0.4em",
          color:         "rgba(255,255,255,0.6)",
          textTransform: "uppercase",
          marginBottom:  "0.75rem",
        }}>
          Tier Unlocked
        </p>
        <h1 style={{
          fontFamily:    "'Cinzel', serif",
          fontSize:      "clamp(2.5rem, 8vw, 5rem)",
          fontWeight:    900,
          letterSpacing: "0.2em",
          color:         unlock.color,
          textShadow:    `0 0 30px ${unlock.glowColor}, 0 0 60px ${unlock.glowColor}`,
          margin:        0,
          lineHeight:    1.1,
        }}>
          {revealTier}
        </h1>
        <div style={{
          height:     "1px",
          background: `linear-gradient(90deg, transparent, ${unlock.color}, transparent)`,
          margin:     "1rem auto",
          width:      "320px",
        }} />
        <p style={{
          fontFamily:    "'Cinzel', serif",
          fontSize:      "0.8rem",
          letterSpacing: "0.3em",
          color:         "rgba(255,255,255,0.45)",
          textTransform: "uppercase",
        }}>
          A new theme has been unlocked
        </p>
      </div>
    </div>
  );
}
