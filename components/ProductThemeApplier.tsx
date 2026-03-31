"use client";

/**
 * ProductThemeApplier
 * -------------------
 * Client component that overrides the --nrs-* CSS custom properties on
 * <html> when a product page is active, creating a unique atmospheric
 * theme for each product. On unmount (navigation away) it restores the
 * member's active tier theme with the same 0.6s transition.
 *
 * In light mode the same product atmosphere is adapted to a lighter
 * base palette so the page still feels distinctive without being dark.
 *
 * Usage: render once inside the product page server component, passing
 * the product's theme JSONB data (or undefined to use the default for
 * that slug).
 */

import { useEffect } from "react";
import type { ProductTheme } from "@/lib/site-management";
import { useTheme } from "@/components/ThemeProvider";

interface Props {
  theme: ProductTheme;
  /** The product slug — used to look up a bespoke light mode palette. */
  slug?: string;
  children?: React.ReactNode;
}

/**
 * Light-mode product theme overrides keyed by slug.
 * bg/bg2/card/panel are lightened; accent/glow are toned down;
 * heading uses a rich readable colour rather than near-white.
 */
const LIGHT_PRODUCT_THEMES: Record<
  string,
  Partial<{
    bg: string; bg2: string; card: string; panel: string;
    accent: string; accentGlow: string; accentBorder: string;
    heading: string; marbleC1: string; marbleC2: string; marbleVein: string;
    glowColor: string;
  }>
> = {
  "freyjas-bloom": {
    // Warm rose on cream
    bg:           "#fdf5f7",
    bg2:          "#f8eaee",
    card:         "#ffffff",
    panel:        "#f0dfe5",
    accent:       "#a05070",
    accentGlow:   "rgba(160, 80, 112, 0.28)",
    accentBorder: "rgba(160, 80, 112, 0.30)",
    heading:      "#7a3050",
    marbleC1:     "#fdf5f7",
    marbleC2:     "#f8eaee",
    marbleVein:   "rgba(160, 80, 112, 0.16)",
    glowColor:    "rgba(160, 80, 112, 0.20)",
  },
  "duemmens-nectar": {
    // Warm amber on parchment
    bg:           "#fdf6e8",
    bg2:          "#f8ecd0",
    card:         "#ffffff",
    panel:        "#f0e0b8",
    accent:       "#a07010",
    accentGlow:   "rgba(160, 112, 16, 0.28)",
    accentBorder: "rgba(160, 112, 16, 0.30)",
    heading:      "#7a5008",
    marbleC1:     "#fdf6e8",
    marbleC2:     "#f8ecd0",
    marbleVein:   "rgba(160, 112, 16, 0.18)",
    glowColor:    "rgba(160, 112, 16, 0.20)",
  },
  "loki-hell-fire": {
    // Warm ember on cream — softer than dark mode
    bg:           "#fdf2e8",
    bg2:          "#f8e4d0",
    card:         "#fff8f4",
    panel:        "#f0d8c0",
    accent:       "#b84010",
    accentGlow:   "rgba(184, 64, 16, 0.28)",
    accentBorder: "rgba(184, 64, 16, 0.30)",
    heading:      "#902808",
    marbleC1:     "#fdf2e8",
    marbleC2:     "#f8e4d0",
    marbleVein:   "rgba(184, 64, 16, 0.20)",
    glowColor:    "rgba(184, 64, 16, 0.20)",
  },
};

/**
 * Derive the full set of --nrs-* CSS variables from a ProductTheme,
 * optionally blending in light-mode overrides.
 */
function themeToVars(
  t: ProductTheme,
  lightOverrides?: Partial<typeof LIGHT_PRODUCT_THEMES[string]>
): Record<string, string> {
  const o = lightOverrides ?? {};
  const bg    = o.bg    ?? t.bg;
  const bg2   = o.bg2   ?? t.bg2;
  const card  = o.card  ?? t.card;
  const panel = o.panel ?? t.panel;
  const accent       = o.accent       ?? t.accent;
  const accentGlow   = o.accentGlow   ?? t.accentGlow;
  const accentBorder = o.accentBorder ?? t.accentBorder;
  const heading      = o.heading      ?? t.heading;
  const marbleC1     = o.marbleC1     ?? t.marbleC1;
  const marbleC2     = o.marbleC2     ?? t.marbleC2;
  const marbleVein   = o.marbleVein   ?? t.marbleVein;
  const glowColor    = o.glowColor    ?? t.glowColor;

  const isLight = !!lightOverrides;

  return {
    "--nrs-bg":           bg,
    "--nrs-bg-2":         bg2,
    "--nrs-card":         card,
    "--nrs-card-hover":   card,
    "--nrs-panel":        panel,

    "--nrs-accent":       accent,
    "--nrs-accent-dim":   accentGlow.replace(/[\d.]+\)$/, "0.12)"),
    "--nrs-accent-glow":  accentGlow,
    "--nrs-accent-border": accentBorder,

    "--nrs-text":         isLight ? "#1a0a00" : "#ffffff",
    "--nrs-text-body":    isLight ? "#2d1800" : "#f0ece4",
    "--nrs-text-muted":   isLight ? "rgba(45,24,0,0.52)" : "rgba(240,236,228,0.5)",

    "--nrs-border":       accentBorder,
    "--nrs-border-subtle": isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)",

    "--nrs-marble-c1":    marbleC1,
    "--nrs-marble-c2":    marbleC2,
    "--nrs-marble-vein":  marbleVein,
    "--nrs-marble-speed": t.marbleSpeed,

    "--nrs-btn-bg":         accentGlow.replace(/[\d.]+\)$/, "0.14)"),
    "--nrs-btn-border":     accentBorder,
    "--nrs-btn-hover":      accentGlow.replace(/[\d.]+\)$/, "0.26)"),
    "--nrs-btn-primary":    accent,
    "--nrs-btn-primary-fg": isLight ? "#ffffff" : bg,

    "--nrs-hero-overlay": `radial-gradient(ellipse 130% 70% at 50% -5%, ${glowColor} 0%, transparent 65%)`,
    "--nrs-header-bg":    `${bg}d9`,
    "--nrs-shadow":       isLight ? "0 4px 32px rgba(0,0,0,0.10)" : "0 4px 32px rgba(0,0,0,0.7)",
    "--nrs-glow":         `0 0 28px ${glowColor}`,
    "--nrs-particle":     t.particleEffect,

    "--nrs-heading-color": heading,
  };
}

export default function ProductThemeApplier({ theme, slug, children }: Props) {
  const { isLightModeActive } = useTheme();

  useEffect(() => {
    const html = document.documentElement;
    const lightOverrides = isLightModeActive && slug
      ? LIGHT_PRODUCT_THEMES[slug]
      : undefined;
    const vars = themeToVars(theme, lightOverrides);

    html.classList.add("nrs-product-theme-transitioning");

    for (const [key, value] of Object.entries(vars)) {
      html.style.setProperty(key, value);
    }

    const cleanup = setTimeout(() => {
      html.classList.remove("nrs-product-theme-transitioning");
    }, 700);

    return () => {
      clearTimeout(cleanup);
      html.classList.add("nrs-product-theme-transitioning");
      for (const key of Object.keys(vars)) {
        html.style.removeProperty(key);
      }
      setTimeout(() => {
        html.classList.remove("nrs-product-theme-transitioning");
      }, 700);
    };
  // Re-apply when the light mode changes while on the product page
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, isLightModeActive, slug]);

  return <>{children}</>;
}
