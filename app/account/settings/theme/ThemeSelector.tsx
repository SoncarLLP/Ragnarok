"use client";

import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

type ThemeDef = {
  id: string;
  name: string;
  description: string;
  accent: string;
  bg: string;
  bg2: string;
  vein: string;
  requiredTier: string | null; // null = always available
  sigil: string;
};

const THEMES: ThemeDef[] = [
  {
    id:           "bronze",
    name:         "Dark & Brooding",
    description:  "The foundation. Ancient stone, ember gold — the world before Ragnarök.",
    accent:       "#c9a84c",
    bg:           "#0a0a0f",
    bg2:          "#2a2a35",
    vein:         "rgba(201,168,76,0.4)",
    requiredTier: null,
    sigil:        "ᛒ",
  },
  {
    id:           "silver",
    name:         "Earthy & Ancient",
    description:  "Deep forest and aged wood. The wisdom of the old world.",
    accent:       "#a07828",
    bg:           "#0b1509",
    bg2:          "#1f2218",
    vein:         "rgba(139,105,20,0.45)",
    requiredTier: "Silver 1",
    sigil:        "ᛋ",
  },
  {
    id:           "gold",
    name:         "Rich & Royal",
    description:  "Royal purple and midnight navy. Power and majesty of the gods.",
    accent:       "#d4a017",
    bg:           "#0f0a1a",
    bg2:          "#1e1832",
    vein:         "rgba(212,160,23,0.45)",
    requiredTier: "Gold 1",
    sigil:        "ᛟ",
  },
  {
    id:           "platinum",
    name:         "Ice & Frost",
    description:  "Arctic blue and silver white. The cold breath of Niflheim.",
    accent:       "#7eb8d4",
    bg:           "#050d1a",
    bg2:          "#131e30",
    vein:         "rgba(200,216,232,0.38)",
    requiredTier: "Platinum 1",
    sigil:        "ᛉ",
  },
  {
    id:           "fire",
    name:         "Fire & Forge",
    description:  "Forge black and molten ember. The fury of Múspellsheim.",
    accent:       "#e8610a",
    bg:           "#0a0500",
    bg2:          "#2a1508",
    vein:         "rgba(232,97,10,0.5)",
    requiredTier: "Platinum 3",
    sigil:        "ᚠ",
  },
  {
    id:           "diamond",
    name:         "Majestic Aurora",
    description:  "Cosmic black and prismatic light. The transcendent vision of Diamond.",
    accent:       "#a78bfa",
    bg:           "#020208",
    bg2:          "#12122a",
    vein:         "rgba(167,139,250,0.4)",
    requiredTier: "Diamond",
    sigil:        "ᛞ",
  },
];

const TIER_ORDER = [
  "Bronze 1", "Bronze 2", "Bronze 3",
  "Silver 1", "Silver 2", "Silver 3",
  "Gold 1",   "Gold 2",   "Gold 3",
  "Platinum 1", "Platinum 2", "Platinum 3",
  "Diamond",
];

function tierIndex(tier: string): number {
  return TIER_ORDER.indexOf(tier);
}

function isThemeUnlocked(theme: ThemeDef, currentTier: string): boolean {
  if (!theme.requiredTier) return true;
  const required = tierIndex(theme.requiredTier);
  const current  = tierIndex(currentTier);
  return current >= required;
}

export default function ThemeSelector({
  currentTier,
  activeTheme,
}: {
  currentTier: string;
  activeTheme: string | null;
}) {
  const { theme: liveTheme, setTheme } = useTheme();
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(activeTheme ?? liveTheme ?? "bronze");

  const handleSelect = async (themeId: string) => {
    if (!isThemeUnlocked(THEMES.find(t => t.id === themeId)!, currentTier)) return;
    setSelected(themeId);
    setTheme(themeId as Parameters<typeof setTheme>[0]);

    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/account/theme", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ theme: themeId }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Could not save theme. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {THEMES.map((theme) => {
          const unlocked  = isThemeUnlocked(theme, currentTier);
          const isActive  = selected === theme.id;

          return (
            <button
              key={theme.id}
              onClick={() => unlocked && handleSelect(theme.id)}
              disabled={!unlocked || saving}
              aria-pressed={isActive}
              style={{
                background:   theme.bg,
                border:       `2px solid ${isActive ? theme.accent : unlocked ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}`,
                borderRadius: "0.875rem",
                padding:      "1.25rem",
                cursor:       unlocked ? "pointer" : "not-allowed",
                opacity:      unlocked ? 1 : 0.45,
                textAlign:    "left",
                transition:   "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
                boxShadow:    isActive ? `0 0 20px ${theme.accent}44, 0 0 40px ${theme.accent}18` : "none",
                transform:    isActive ? "translateY(-2px)" : "none",
                position:     "relative",
                overflow:     "hidden",
              }}
            >
              {/* Marble preview swatch */}
              <div
                style={{
                  width:        "100%",
                  height:       "56px",
                  borderRadius: "0.5rem",
                  marginBottom: "0.875rem",
                  background:   `
                    radial-gradient(ellipse 150% 80% at 30% 60%, ${theme.vein} 0%, transparent 55%),
                    radial-gradient(ellipse 120% 100% at 70% 30%, ${theme.bg2} 0%, transparent 50%),
                    ${theme.bg}
                  `,
                  border:       `1px solid ${theme.accent}33`,
                  position:     "relative",
                  overflow:     "hidden",
                }}
              >
                {/* Sigil overlay */}
                <span style={{
                  position:   "absolute",
                  top:        "50%",
                  left:       "50%",
                  transform:  "translate(-50%, -50%)",
                  fontSize:   "1.75rem",
                  color:      theme.accent,
                  opacity:    0.5,
                  fontFamily: "serif",
                  userSelect: "none",
                }}>
                  {theme.sigil}
                </span>
              </div>

              {/* Theme info */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p style={{
                    fontFamily:    "var(--font-heading)",
                    fontSize:      "0.9rem",
                    fontWeight:    700,
                    letterSpacing: "0.04em",
                    color:         isActive ? theme.accent : "#ffffff",
                    marginBottom:  "0.25rem",
                  }}>
                    {theme.name}
                  </p>
                  <p style={{
                    fontSize:  "0.75rem",
                    color:     "rgba(255,255,255,0.5)",
                    lineHeight: 1.5,
                    fontFamily: "var(--font-ui)",
                  }}>
                    {theme.description}
                  </p>
                </div>

                {/* Lock or check */}
                <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: "2px" }}>
                  {!unlocked ? "🔒" : isActive ? "✓" : ""}
                </span>
              </div>

              {/* Required tier label */}
              {!unlocked && theme.requiredTier && (
                <p style={{
                  marginTop:  "0.625rem",
                  fontSize:   "0.7rem",
                  color:      theme.accent,
                  fontFamily: "var(--font-ui)",
                  opacity:    0.8,
                }}>
                  Requires {theme.requiredTier}
                </p>
              )}

              {/* Active highlight bar */}
              {isActive && (
                <div style={{
                  position:   "absolute",
                  top:        0,
                  left:       0,
                  right:      0,
                  height:     "3px",
                  background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Status messages */}
      {saving && (
        <p className="text-sm" style={{ color: "var(--nrs-text-muted)", fontFamily: "var(--font-ui)" }}>
          Saving theme…
        </p>
      )}
      {saved && (
        <p className="text-sm" style={{ color: "#4ade80" }}>
          Theme saved.
        </p>
      )}
      {error && (
        <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>
      )}

      {/* Reset to auto */}
      <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--nrs-border-subtle)" }}>
        <button
          onClick={() => handleSelect(autoTheme(currentTier))}
          className="text-xs"
          style={{ color: "var(--nrs-text-muted)", fontFamily: "var(--font-ui)", cursor: "pointer", background: "none", border: "none", textDecoration: "underline" }}
        >
          Reset to automatic theme for my tier
        </button>
      </div>
    </div>
  );
}

function autoTheme(tier: string): string {
  const t = tier.toLowerCase();
  if (t.startsWith("diamond"))  return "diamond";
  if (t.startsWith("platinum")) return "platinum";
  if (t.startsWith("gold"))     return "gold";
  if (t.startsWith("silver"))   return "silver";
  return "bronze";
}
