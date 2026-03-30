"use client";

/**
 * ProductThemeApplier
 * -------------------
 * Client component that overrides the --nrs-* CSS custom properties on
 * <html> when a product page is active, creating a unique atmospheric
 * theme for each product. On unmount (navigation away) it restores the
 * member's active tier theme with the same 0.6s transition.
 *
 * Usage: render once inside the product page server component, passing
 * the product's theme JSONB data (or undefined to use the default for
 * that slug).
 */

import { useEffect } from "react";
import type { ProductTheme } from "@/lib/site-management";

interface Props {
  theme: ProductTheme;
  children?: React.ReactNode;
}

/**
 * Derive the full set of --nrs-* CSS variables from a ProductTheme.
 * Values that are not stored in the JSONB (e.g. derived alphas) are
 * computed here so that the rest of the UI (cards, buttons, etc.)
 * automatically picks up the right colours.
 */
function themeToVars(t: ProductTheme): Record<string, string> {
  // Derive card-hover as a slightly lighter version of card by mixing in white
  return {
    "--nrs-bg":           t.bg,
    "--nrs-bg-2":         t.bg2,
    "--nrs-card":         t.card,
    "--nrs-card-hover":   t.card, // close enough — no stored variant
    "--nrs-panel":        t.panel,

    "--nrs-accent":       t.accent,
    "--nrs-accent-dim":   t.accentGlow.replace(/[\d.]+\)$/, "0.12)"),
    "--nrs-accent-glow":  t.accentGlow,
    "--nrs-accent-border": t.accentBorder,

    "--nrs-text":         "#ffffff",
    "--nrs-text-body":    "#f0ece4",
    "--nrs-text-muted":   "rgba(240,236,228,0.5)",

    "--nrs-border":       t.accentBorder,
    "--nrs-border-subtle": "rgba(255,255,255,0.06)",

    "--nrs-marble-c1":    t.marbleC1,
    "--nrs-marble-c2":    t.marbleC2,
    "--nrs-marble-vein":  t.marbleVein,
    "--nrs-marble-speed": t.marbleSpeed,

    "--nrs-btn-bg":         t.accentGlow.replace(/[\d.]+\)$/, "0.14)"),
    "--nrs-btn-border":     t.accentBorder,
    "--nrs-btn-hover":      t.accentGlow.replace(/[\d.]+\)$/, "0.26)"),
    "--nrs-btn-primary":    t.accent,
    "--nrs-btn-primary-fg": t.bg,

    "--nrs-hero-overlay": `radial-gradient(ellipse 130% 70% at 50% -5%, ${t.glowColor} 0%, transparent 65%)`,
    "--nrs-header-bg":    `${t.bg}d9`, // ~85% opacity hex
    "--nrs-shadow":       "0 4px 32px rgba(0,0,0,0.7)",
    "--nrs-glow":         `0 0 28px ${t.glowColor}`,
    "--nrs-particle":     t.particleEffect,

    // Heading colour override (used by nrs-heading class and h1–h6)
    "--nrs-heading-color": t.heading,
  };
}

export default function ProductThemeApplier({ theme, children }: Props) {
  useEffect(() => {
    const html = document.documentElement;
    const vars = themeToVars(theme);

    // Enable smooth transition class before applying vars
    html.classList.add("nrs-product-theme-transitioning");

    // Apply inline style overrides (override tier [data-theme] values)
    for (const [key, value] of Object.entries(vars)) {
      html.style.setProperty(key, value);
    }

    // Remove the transition class after the animation completes
    const cleanup = setTimeout(() => {
      html.classList.remove("nrs-product-theme-transitioning");
    }, 700);

    return () => {
      clearTimeout(cleanup);
      // Re-enable transition for the exit animation
      html.classList.add("nrs-product-theme-transitioning");
      // Remove all product theme overrides — tier [data-theme] takes back over
      for (const key of Object.keys(vars)) {
        html.style.removeProperty(key);
      }
      setTimeout(() => {
        html.classList.remove("nrs-product-theme-transitioning");
      }, 700);
    };
  }, [theme]);

  // Render children (the page content) unchanged
  return <>{children}</>;
}
