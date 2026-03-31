"use client";

import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

type ThemeDef = {
  id: string;
  name: string;
  description: string;
  sigil: string;
  requiredTier: string | null;
  // Dark variant swatch colours
  dark: { accent: string; bg: string; bg2: string; vein: string };
  // Light variant swatch colours
  light: { accent: string; bg: string; bg2: string; vein: string };
};

const THEMES: ThemeDef[] = [
  {
    id:           "bronze",
    name:         "Dark & Brooding",
    description:  "The foundation. Ancient stone, ember gold — the world before Ragnarök.",
    sigil:        "ᛒ",
    requiredTier: null,
    dark:  { accent: "#c9a84c", bg: "#0a0a0f", bg2: "#2a2a35", vein: "rgba(201,168,76,0.4)" },
    light: { accent: "#8b6914", bg: "#f4ede0", bg2: "#e8ddc8", vein: "rgba(139,105,20,0.28)" },
  },
  {
    id:           "silver",
    name:         "Earthy & Ancient",
    description:  "Deep forest and aged wood. The wisdom of the old world.",
    sigil:        "ᛋ",
    requiredTier: "Silver 1",
    dark:  { accent: "#a07828", bg: "#0b1509", bg2: "#1f2218", vein: "rgba(139,105,20,0.45)" },
    light: { accent: "#7a4f1e", bg: "#f4ede0", bg2: "#d8e0cc", vein: "rgba(45,74,45,0.28)" },
  },
  {
    id:           "gold",
    name:         "Rich & Royal",
    description:  "Royal purple and midnight navy. Power and majesty of the gods.",
    sigil:        "ᛟ",
    requiredTier: "Gold 1",
    dark:  { accent: "#d4a017", bg: "#0f0a1a", bg2: "#1e1832", vein: "rgba(212,160,23,0.45)" },
    light: { accent: "#8b6914", bg: "#faf6ef", bg2: "#f0e8d5", vein: "rgba(139,105,20,0.28)" },
  },
  {
    id:           "platinum",
    name:         "Ice & Frost",
    description:  "Arctic blue and silver white. The cold breath of Niflheim.",
    sigil:        "ᛉ",
    requiredTier: "Platinum 1",
    dark:  { accent: "#7eb8d4", bg: "#050d1a", bg2: "#131e30", vein: "rgba(200,216,232,0.38)" },
    light: { accent: "#3a7a9a", bg: "#e8f4f8", bg2: "#cce4f0", vein: "rgba(58,122,154,0.28)" },
  },
  {
    id:           "fire",
    name:         "Fire & Forge",
    description:  "Forge black and molten ember. The fury of Múspellsheim.",
    sigil:        "ᚠ",
    requiredTier: "Platinum 3",
    dark:  { accent: "#e8610a", bg: "#0a0500", bg2: "#2a1508", vein: "rgba(232,97,10,0.5)" },
    light: { accent: "#c24a08", bg: "#fdf0e0", bg2: "#f0d8b0", vein: "rgba(194,74,8,0.30)" },
  },
  {
    id:           "diamond",
    name:         "Majestic Aurora",
    description:  "Cosmic black and prismatic light. The transcendent vision of Diamond.",
    sigil:        "ᛞ",
    requiredTier: "Diamond",
    dark:  { accent: "#a78bfa", bg: "#020208", bg2: "#12122a", vein: "rgba(167,139,250,0.4)" },
    light: { accent: "#6040b0", bg: "#fafafa", bg2: "#e8e4f8", vein: "rgba(96,64,176,0.28)" },
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
  return tierIndex(currentTier) >= tierIndex(theme.requiredTier);
}

/** Marble swatch preview */
function Swatch({
  accent,
  bg,
  bg2,
  vein,
  sigil,
  isActive,
  isLocked,
}: {
  accent: string;
  bg: string;
  bg2: string;
  vein: string;
  sigil: string;
  isActive: boolean;
  isLocked: boolean;
}) {
  return (
    <div
      style={{
        width:        "100%",
        height:       "60px",
        borderRadius: "0.5rem",
        background:   `
          radial-gradient(ellipse 150% 80% at 30% 60%, ${vein} 0%, transparent 55%),
          radial-gradient(ellipse 120% 100% at 70% 30%, ${bg2} 0%, transparent 50%),
          ${bg}
        `,
        border:    `1px solid ${accent}${isActive ? "88" : "33"}`,
        position:  "relative",
        overflow:  "hidden",
        opacity:   isLocked ? 0.4 : 1,
      }}
    >
      <span style={{
        position:   "absolute",
        top:        "50%",
        left:       "50%",
        transform:  "translate(-50%, -50%)",
        fontSize:   "1.5rem",
        color:      accent,
        opacity:    isLocked ? 0.5 : 0.6,
        fontFamily: "serif",
        userSelect: "none",
      }}>
        {isLocked ? "🔒" : sigil}
      </span>
      {isActive && (
        <div style={{
          position:   "absolute",
          top:        0,
          left:       0,
          right:      0,
          height:     "3px",
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }} />
      )}
    </div>
  );
}

export default function ThemeSelector({
  currentTier,
  activeTheme,
}: {
  currentTier: string;
  activeTheme: string | null;
}) {
  const { theme: liveTheme, setTheme, isLightModeActive, setLightMode } = useTheme();
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(activeTheme ?? liveTheme ?? "bronze");

  // Which mode is being previewed in the selector (controlled by the local toggle)
  const [previewLight, setPreviewLight] = useState(isLightModeActive);

  const handleSelect = async (themeId: string) => {
    const def = THEMES.find(t => t.id === themeId)!;
    if (!isThemeUnlocked(def, currentTier)) return;

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

  const togglePreviewMode = () => {
    const next = !previewLight;
    setPreviewLight(next);
    // Also toggle the live mode so the page reflects the preview
    setLightMode(next);
  };

  return (
    <div>
      {/* ── Mode toggle at the top ── */}
      <div
        className="flex items-center gap-3 mb-6 p-3 rounded-xl"
        style={{
          background:   "var(--nrs-accent-dim)",
          border:       "1px solid var(--nrs-border-subtle)",
          fontFamily:   "var(--font-ui)",
        }}
      >
        <span style={{ fontSize: "0.8rem", color: "var(--nrs-text-muted)" }}>
          Preview mode:
        </span>
        <button
          onClick={togglePreviewMode}
          style={{
            display:       "flex",
            alignItems:    "center",
            gap:           "0.5rem",
            padding:       "0.3rem 0.75rem",
            borderRadius:  "0.4rem",
            border:        `1px solid var(--nrs-accent-border)`,
            background:    "var(--nrs-card)",
            color:         "var(--nrs-text-body)",
            fontSize:      "0.8rem",
            cursor:        "pointer",
            fontFamily:    "var(--font-ui)",
            transition:    "background 0.2s",
          }}
        >
          <span>{previewLight ? "☀️" : "🌙"}</span>
          <span>{previewLight ? "Light" : "Dark"}</span>
        </button>
        <span style={{ fontSize: "0.75rem", color: "var(--nrs-text-muted)" }}>
          Each tier has a dark and a light variant
        </span>
      </div>

      {/* ── Theme grid: each card shows dark + light swatches side by side ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {THEMES.map((themeDef) => {
          const unlocked = isThemeUnlocked(themeDef, currentTier);
          const isActive = selected === themeDef.id;
          const variant  = previewLight ? themeDef.light : themeDef.dark;

          return (
            <button
              key={themeDef.id}
              onClick={() => unlocked && handleSelect(themeDef.id)}
              disabled={!unlocked || saving}
              aria-pressed={isActive}
              style={{
                background:   variant.bg,
                border:       `2px solid ${isActive ? variant.accent : unlocked ? "rgba(128,128,128,0.15)" : "rgba(128,128,128,0.07)"}`,
                borderRadius: "0.875rem",
                padding:      "1rem",
                cursor:       unlocked ? "pointer" : "not-allowed",
                opacity:      unlocked ? 1 : 0.5,
                textAlign:    "left",
                transition:   "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
                boxShadow:    isActive ? `0 0 20px ${variant.accent}44, 0 0 40px ${variant.accent}18` : "none",
                transform:    isActive ? "translateY(-2px)" : "none",
                position:     "relative",
                overflow:     "hidden",
              }}
            >
              {/* Active bar */}
              {isActive && (
                <div style={{
                  position:   "absolute",
                  top:        0,
                  left:       0,
                  right:      0,
                  height:     "3px",
                  background: `linear-gradient(90deg, transparent, ${variant.accent}, transparent)`,
                }} />
              )}

              {/* Swatch pair: dark | light */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                {/* Dark swatch */}
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize:   "0.6rem",
                    color:      previewLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.5)",
                    fontFamily: "var(--font-ui)",
                    marginBottom: "0.25rem",
                    textAlign:  "center",
                    letterSpacing: "0.05em",
                  }}>
                    DARK
                  </p>
                  <Swatch
                    accent={themeDef.dark.accent}
                    bg={themeDef.dark.bg}
                    bg2={themeDef.dark.bg2}
                    vein={themeDef.dark.vein}
                    sigil={themeDef.sigil}
                    isActive={isActive && !previewLight}
                    isLocked={!unlocked}
                  />
                </div>
                {/* Light swatch */}
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize:   "0.6rem",
                    color:      previewLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.5)",
                    fontFamily: "var(--font-ui)",
                    marginBottom: "0.25rem",
                    textAlign:  "center",
                    letterSpacing: "0.05em",
                  }}>
                    LIGHT
                  </p>
                  <Swatch
                    accent={themeDef.light.accent}
                    bg={themeDef.light.bg}
                    bg2={themeDef.light.bg2}
                    vein={themeDef.light.vein}
                    sigil={themeDef.sigil}
                    isActive={isActive && previewLight}
                    isLocked={!unlocked}
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p style={{
                    fontFamily:    "var(--font-heading)",
                    fontSize:      "0.85rem",
                    fontWeight:    700,
                    letterSpacing: "0.04em",
                    color:         isActive ? variant.accent : previewLight ? "#1a1208" : "#ffffff",
                    marginBottom:  "0.2rem",
                  }}>
                    {themeDef.name}
                  </p>
                  <p style={{
                    fontSize:   "0.72rem",
                    color:      previewLight ? "rgba(45,32,16,0.55)" : "rgba(255,255,255,0.5)",
                    lineHeight: 1.5,
                    fontFamily: "var(--font-ui)",
                  }}>
                    {themeDef.description}
                  </p>
                </div>
                <span style={{ fontSize: "0.95rem", flexShrink: 0, marginTop: "2px" }}>
                  {!unlocked ? "🔒" : isActive ? "✓" : ""}
                </span>
              </div>

              {!unlocked && themeDef.requiredTier && (
                <p style={{
                  marginTop:  "0.5rem",
                  fontSize:   "0.68rem",
                  color:      variant.accent,
                  fontFamily: "var(--font-ui)",
                  opacity:    0.85,
                }}>
                  Requires {themeDef.requiredTier}
                </p>
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
        <p className="text-sm" style={{ color: "#22c55e" }}>
          Theme saved.
        </p>
      )}
      {error && (
        <p className="text-sm" style={{ color: "#ef4444" }}>{error}</p>
      )}

      {/* Reset to auto */}
      <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--nrs-border-subtle)" }}>
        <button
          onClick={() => handleSelect(autoTheme(currentTier))}
          className="text-xs"
          style={{
            color:          "var(--nrs-text-muted)",
            fontFamily:     "var(--font-ui)",
            cursor:         "pointer",
            background:     "none",
            border:         "none",
            textDecoration: "underline",
          }}
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
