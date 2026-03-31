// lib/product-card-theme.ts
// Returns subtle product-themed card styles based on slug and optional DB theme JSONB.
// These are used for all product card instances across the site (homepage, shop, related).

import type { CSSProperties } from "react";
import type { ProductTheme } from "./site-management";
import { DEFAULT_PRODUCT_THEMES } from "./site-management";

/** Fallback accent colours per slug, matching spec. */
const CARD_ACCENT_FALLBACK: Record<string, string> = {
  "freyjas-bloom":    "#c9849c",
  "duemmens-nectar":  "#c9a84c",
  "loki-hell-fire":   "#c9621c",
};

/**
 * Given a product slug and an optional DB-stored theme JSONB,
 * returns the accent colour to use for product card theming.
 * Reads from DB theme → DEFAULT_PRODUCT_THEMES → fallback constant.
 */
export function getProductCardAccent(slug: string, dbTheme?: ProductTheme | null): string {
  if (dbTheme?.accent) return dbTheme.accent;
  if (DEFAULT_PRODUCT_THEMES[slug]?.accent) return DEFAULT_PRODUCT_THEMES[slug].accent;
  return CARD_ACCENT_FALLBACK[slug] ?? "#c9a84c";
}

/** Returns the hex/rgba for the image glow. */
export function getProductCardGlow(slug: string, dbTheme?: ProductTheme | null): string {
  if (dbTheme?.glowColor) return dbTheme.glowColor;
  if (DEFAULT_PRODUCT_THEMES[slug]?.glowColor) return DEFAULT_PRODUCT_THEMES[slug].glowColor;
  const acc = getProductCardAccent(slug, dbTheme);
  return `${acc}55`;
}

/**
 * Returns inline CSS style objects for the various parts of a product card.
 * Designed to be subtle — accent used at low opacity for background tints,
 * with stronger colour for text and interactive elements.
 */
export function getProductCardStyles(slug: string, dbTheme?: ProductTheme | null, isLight = false) {
  const accent = getProductCardAccent(slug, dbTheme);
  const glow   = getProductCardGlow(slug, dbTheme);
  const opacity = isLight ? "0.06" : "0.08";

  return {
    /** Outer card wrapper — very subtle background tint */
    card: {
      "--prd-accent":       accent,
      "--prd-glow":         glow,
      "--prd-bg-tint":      `${accent}${Math.round(parseFloat(opacity) * 255).toString(16).padStart(2, "0")}`,
      backgroundColor:      `color-mix(in srgb, ${accent} ${isLight ? "5%" : "7%"}, var(--nrs-card, #1a1a2e))`,
    } as CSSProperties,

    /** Image container — faint atmospheric glow */
    imageContainer: {
      background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${glow}, transparent)`,
    } as CSSProperties,

    /** Product name */
    name: {
      color: accent,
    } as CSSProperties,

    /** Product price */
    price: {
      color: accent,
    } as CSSProperties,

    /** Add to cart / acquire button border accent */
    button: {
      borderColor: `${accent}60`,
      color:       accent,
    } as CSSProperties,

    /** Card border on hover */
    border: `1px solid ${accent}28`,
    borderHover: `1px solid ${accent}80`,

    accentColor: accent,
  };
}
