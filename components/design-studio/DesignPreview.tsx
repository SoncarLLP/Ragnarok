"use client";

/**
 * DesignPreview
 * Live preview panel showing how the product will look with the current theme.
 * Renders mock product page, product card, and side-by-side views.
 */

import { useState } from "react";
import type { ProductTheme } from "@/lib/site-management";

type PreviewTab = "page" | "card" | "side-by-side";
type PreviewMode = "dark" | "light";
type PreviewSize = "desktop" | "tablet" | "mobile";

interface Props {
  theme: ProductTheme;
  liveTheme: ProductTheme | null;   // currently published theme (for side-by-side)
  productName: string;
  productSlug: string;
  primaryImageUrl: string | null;
  pricePence: number;
}

function hsl(h = 0, s = 0, l = 50) {
  return `hsl(${h},${s}%,${l}%)`;
}

/** Derive card-context (reduced intensity) version of a theme */
function cardTheme(t: ProductTheme) {
  return {
    bg: t.card,
    accent: t.accent,
    accentGlow: t.accentGlow,
    accentBorder: t.accentBorder,
    heading: t.heading,
    bodyColor: t.bodyColor ?? "rgba(240,236,228,0.55)",
    priceColor: t.priceColor ?? t.accent,
    btnBg: t.btnBg ?? t.accent,
    btnText: t.btnText ?? "#000",
    btnBorderRadius: t.btnBorderRadius ?? 8,
    cardBorderColor: t.cardBorderColor ?? t.accentBorder,
    cardBorderWidth: t.cardBorderWidth ?? 1,
    cardHoverGlowColor: t.cardHoverGlowColor ?? t.accentGlow,
    cardHoverGlowIntensity: t.cardHoverGlowIntensity ?? 40,
  };
}

function MockProductCard({
  theme,
  productName,
  pricePence,
  primaryImageUrl,
  reduced = false,
}: {
  theme: ProductTheme;
  productName: string;
  pricePence: number;
  primaryImageUrl: string | null;
  reduced?: boolean;
}) {
  const ct = cardTheme(theme);
  const tintOpacity = reduced ? 0.06 : (theme.cardBgTintOpacity ?? 8) / 100;
  const cardBg = ct.bg;
  const borderColor = ct.cardBorderColor ?? ct.accentBorder;
  const price = `£${(pricePence / 100).toFixed(2)}`;
  const glowColor = ct.accentGlow;

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        background: cardBg,
        border: `${ct.cardBorderWidth}px solid ${borderColor}`,
        boxShadow: `0 4px 24px ${glowColor}`,
        width: "100%",
        maxWidth: 240,
      }}
    >
      {/* Image placeholder */}
      <div
        className="w-full flex items-center justify-center text-3xl"
        style={{
          height: 140,
          background: `linear-gradient(135deg, ${theme.marbleC1 ?? theme.bg}, ${theme.marbleC2 ?? theme.bg2})`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {primaryImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={primaryImageUrl} alt={productName} className="w-full h-full object-contain" />
        ) : (
          <span style={{ opacity: tintOpacity + 0.3, fontSize: "2.5rem" }}>✦</span>
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: ct.accentGlow,
            opacity: tintOpacity,
          }}
        />
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <h3
          className="text-sm font-semibold leading-tight"
          style={{
            color: ct.heading,
            fontFamily: "var(--font-heading, serif)",
            fontWeight: theme.headingWeight ?? "700",
          }}
        >
          {productName}
        </h3>
        <p className="text-xs" style={{ color: ct.bodyColor }}>
          Premium Norse supplement blend
        </p>
        <div className="flex items-center justify-between mt-auto pt-2">
          <span
            className="text-base font-bold"
            style={{ color: ct.priceColor, fontFamily: "var(--font-heading, serif)" }}
          >
            {price}
          </span>
          <button
            type="button"
            className="text-xs px-3 py-1.5 font-semibold"
            style={{
              background: ct.btnBg,
              color: ct.btnText ?? "#000",
              borderRadius: ct.btnBorderRadius,
              boxShadow: theme.btnGlow ? `0 0 10px ${ct.accentGlow}` : undefined,
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function MockProductPage({
  theme,
  productName,
  productSlug,
  pricePence,
  primaryImageUrl,
  mode,
}: {
  theme: ProductTheme;
  productName: string;
  productSlug: string;
  pricePence: number;
  primaryImageUrl: string | null;
  mode: PreviewMode;
}) {
  const price = `£${(pricePence / 100).toFixed(2)}`;
  const glowPos = theme.glowPosition ?? "center";
  const glowEnabled = theme.glowEnabled !== false;
  const marbleEnabled = theme.marbleEnabled !== false;

  const glowPosStyle: Record<string, string> = {
    center:  "50% 50%",
    top:     "50% 10%",
    bottom:  "50% 90%",
    left:    "10% 50%",
    right:   "90% 50%",
  };

  const bgStyle: React.CSSProperties = {
    background: `linear-gradient(${theme.bgGradientDirection ?? "to bottom"}, ${theme.bg}, ${theme.bg2 ?? theme.bg})`,
    position: "relative",
    overflow: "hidden",
  };

  const glowStyle: React.CSSProperties = glowEnabled ? {
    position: "absolute",
    inset: 0,
    background: `radial-gradient(ellipse 70% 60% at ${glowPosStyle[glowPos] ?? "50% 50%"}, ${theme.glowColor ?? "rgba(0,0,0,0)"}, transparent)`,
    pointerEvents: "none",
    zIndex: 0,
    opacity: (theme.glowIntensity ?? 40) / 100,
  } : {};

  const marbleStyle: React.CSSProperties = marbleEnabled ? {
    position: "absolute",
    inset: 0,
    background: `radial-gradient(ellipse at 20% 40%, ${theme.marbleC1}, transparent 60%), radial-gradient(ellipse at 80% 60%, ${theme.marbleC2}, transparent 60%)`,
    opacity: 0.6,
    pointerEvents: "none",
    zIndex: 0,
  } : {};

  const headingColor = theme.heading ?? "#ffffff";
  const bodyColor = theme.bodyColor ?? "rgba(240,236,228,0.6)";
  const priceColor = theme.priceColor ?? theme.accent;
  const btnBg = theme.btnBg ?? theme.accent;
  const btnText = theme.btnText ?? (mode === "light" ? "#000" : "#000");
  const btnRadius = theme.btnBorderRadius ?? 8;
  const knotworkEnabled = theme.knotworkEnabled ?? false;
  const knotColor = theme.knotworkColor ?? theme.accent;
  const knotThickness = theme.knotworkThickness ?? 2;

  return (
    <div
      className="text-sm overflow-hidden"
      style={{ ...bgStyle, minHeight: 420, fontFamily: "var(--font-body, serif)" }}
    >
      {/* Marble layer */}
      {marbleEnabled && <div style={marbleStyle} />}
      {/* Glow layer */}
      {glowEnabled && <div style={glowStyle} />}

      {/* Knotwork border */}
      {knotworkEnabled && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            border: `${knotThickness}px solid ${knotColor}`,
            opacity: (theme.knotworkGlowIntensity ?? 50) / 100,
            borderRadius: 12,
            pointerEvents: "none",
            zIndex: 1,
            boxShadow: theme.knotworkGlow ? `inset 0 0 12px ${knotColor}, 0 0 12px ${knotColor}` : undefined,
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 p-5 grid grid-cols-[1fr_1fr] gap-5 items-start">
        {/* Image */}
        <div
          className="rounded-xl overflow-hidden flex items-center justify-center"
          style={{
            height: 200,
            background: `linear-gradient(135deg, ${theme.marbleC1 ?? theme.bg}, ${theme.marbleC2 ?? theme.bg2})`,
          }}
        >
          {primaryImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={primaryImageUrl} alt={productName} className="w-full h-full object-contain" />
          ) : (
            <span style={{ color: theme.accent, opacity: 0.5, fontSize: "3rem" }}>✦</span>
          )}
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div>
            <h1
              className="text-lg font-bold leading-tight mb-1"
              style={{
                color: headingColor,
                fontFamily: "var(--font-heading, serif)",
                fontWeight: theme.headingWeight ?? "700",
              }}
            >
              {productName}
            </h1>
            <div className="h-px" style={{ background: theme.accentBorder }} />
          </div>

          <p className="text-xs leading-relaxed" style={{ color: bodyColor }}>
            A premium Norse-crafted supplement blend, formulated for peak performance and mythic vitality.
          </p>

          <div
            className="text-2xl font-bold"
            style={{ color: priceColor, fontFamily: "var(--font-heading, serif)" }}
          >
            {price}
          </div>

          <div className="space-y-2">
            <button
              type="button"
              className="w-full py-2 text-sm font-semibold"
              style={{
                background: btnBg,
                color: btnText,
                borderRadius: btnRadius,
                boxShadow: theme.btnGlow ? `0 0 16px ${theme.btnGlowColor ?? theme.accentGlow}` : undefined,
              }}
            >
              Add to Cart
            </button>
            <button
              type="button"
              className="w-full py-2 text-xs"
              style={{
                border: `1px solid ${theme.accentBorder}`,
                color: theme.accent,
                borderRadius: btnRadius,
                background: "transparent",
              }}
            >
              View full details
            </button>
          </div>

          {/* Accent bar */}
          <div
            className="text-xs px-2 py-1 rounded-full inline-block"
            style={{
              background: theme.accentBorder,
              color: theme.accent,
              border: `1px solid ${theme.accentBorder}`,
            }}
          >
            ✦ In Stock · {productSlug}
          </div>
        </div>
      </div>

      {/* Particle dots indicator */}
      {theme.particleEffect !== "none" && (
        <div className="relative z-10 px-5 pb-3 text-xs" style={{ color: theme.accent, opacity: 0.6 }}>
          ✦ Particle effect: {theme.particleEffect}
          {theme.particleDensity !== undefined && ` · density ${theme.particleDensity}`}
        </div>
      )}
    </div>
  );
}

export default function DesignPreview({
  theme,
  liveTheme,
  productName,
  productSlug,
  primaryImageUrl,
  pricePence,
}: Props) {
  const [tab, setTab] = useState<PreviewTab>("page");
  const [mode, setMode] = useState<PreviewMode>("dark");
  const [size, setSize] = useState<PreviewSize>("desktop");

  const sizeClass: Record<PreviewSize, string> = {
    desktop: "w-full",
    tablet:  "w-[768px] max-w-full mx-auto",
    mobile:  "w-[390px] max-w-full mx-auto",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Preview toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 flex-wrap">
        {/* Tab switcher */}
        <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
          {(["page", "card", "side-by-side"] as PreviewTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 capitalize transition ${
                tab === t
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {t === "side-by-side" ? "Side by side" : t === "page" ? "Full page" : "Card"}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Light/dark mode */}
        <button
          type="button"
          onClick={() => setMode((m) => m === "dark" ? "light" : "dark")}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 text-neutral-400 hover:text-white transition"
          title="Toggle light/dark preview"
        >
          {mode === "dark" ? "☀ Light" : "☾ Dark"}
        </button>

        {/* Responsive size */}
        <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
          {(["desktop", "tablet", "mobile"] as PreviewSize[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              title={s}
              className={`px-2.5 py-1.5 transition ${
                size === s ? "bg-white/10 text-white" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {s === "desktop" ? "🖥" : s === "tablet" ? "📱" : "📲"}
            </button>
          ))}
        </div>
      </div>

      {/* Preview area */}
      <div
        className="flex-1 overflow-auto p-4"
        style={{ background: mode === "light" ? "#f0ede6" : "#0e0e14" }}
      >
        {tab === "page" && (
          <div className={sizeClass[size]}>
            <MockProductPage
              theme={theme}
              productName={productName}
              productSlug={productSlug}
              pricePence={pricePence}
              primaryImageUrl={primaryImageUrl}
              mode={mode}
            />
          </div>
        )}

        {tab === "card" && (
          <div className={`${sizeClass[size]} flex flex-wrap gap-4 justify-center py-4`}>
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-neutral-500">Shop card</p>
              <MockProductCard
                theme={theme}
                productName={productName}
                pricePence={pricePence}
                primaryImageUrl={primaryImageUrl}
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-neutral-500">Featured card (subtle)</p>
              <MockProductCard
                theme={theme}
                productName={productName}
                pricePence={pricePence}
                primaryImageUrl={primaryImageUrl}
                reduced
              />
            </div>
          </div>
        )}

        {tab === "side-by-side" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs text-neutral-500 text-center">
                {liveTheme ? "Live (published)" : "Default theme"}
              </p>
              <MockProductPage
                theme={liveTheme ?? theme}
                productName={productName}
                productSlug={productSlug}
                pricePence={pricePence}
                primaryImageUrl={primaryImageUrl}
                mode={mode}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-amber-400 text-center">Draft (your changes)</p>
              <MockProductPage
                theme={theme}
                productName={productName}
                productSlug={productSlug}
                pricePence={pricePence}
                primaryImageUrl={primaryImageUrl}
                mode={mode}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
