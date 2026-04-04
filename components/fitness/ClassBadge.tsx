"use client";

import { badgeLevelTier, prestigeLabel } from "@/lib/fitness";

interface ClassBadgeProps {
  className: string;
  classIcon: string;
  level: number;
  prestigeCount?: number;
  size?: "sm" | "md" | "lg";
  showPrestige?: boolean;
}

/**
 * ClassBadge — RPG class badge displayed on profiles and community posts.
 * Visual flair escalates with level and prestige:
 *   Levels 1-10:  Simple icon + level number
 *   Levels 11-25: Animated icon with subtle glow
 *   Levels 26-40: Full animated badge with class colours
 *   Levels 41-50: Premium animated badge with elaborate effects
 *   Prestige:     Stars alongside badge
 */
export default function ClassBadge({
  className,
  classIcon,
  level,
  prestigeCount = 0,
  size = "sm",
  showPrestige = true,
}: ClassBadgeProps) {
  const visualTier = badgeLevelTier(level);
  const prestige   = showPrestige ? prestigeLabel(prestigeCount) : "";

  const sizeClass = {
    sm: "text-[10px] px-1.5 py-0.5 gap-1",
    md: "text-xs px-2 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  }[size];

  const iconSize = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }[size];

  // Premium (41-50) — elaborate animated
  if (visualTier === "premium") {
    return (
      <span
        title={`${prestige ? prestige + " " : ""}Level ${level} ${className}`}
        aria-label={`${className} class, level ${level}${prestigeCount > 0 ? `, prestige ${prestigeCount}` : ""}`}
        className={`tier-badge-diamond inline-flex items-center rounded-full border border-violet-400/40 font-bold shrink-0 ${sizeClass}`}
        style={{ background: "rgba(109,40,217,0.12)" }}
      >
        <span className={iconSize}>{classIcon}</span>
        <span className="tier-text-rainbow">{className}</span>
        <span className="text-neutral-400">Lv.{level}</span>
        {prestige && <span>{prestige}</span>}
      </span>
    );
  }

  // Animated (26-40) — full animated with class colour
  if (visualTier === "animated") {
    return (
      <span
        title={`${prestige ? prestige + " " : ""}Level ${level} ${className}`}
        aria-label={`${className} class, level ${level}`}
        className={`tier-badge-gold inline-flex items-center rounded-full border border-amber-400/40 text-amber-300 font-semibold shrink-0 ${sizeClass}`}
        style={{ background: "rgba(251,191,36,0.08)" }}
      >
        <span className={iconSize}>{classIcon}</span>
        <span>{className}</span>
        <span className="text-neutral-400">Lv.{level}</span>
        {prestige && <span>{prestige}</span>}
      </span>
    );
  }

  // Glow (11-25) — subtle animated glow
  if (visualTier === "glow") {
    return (
      <span
        title={`${prestige ? prestige + " " : ""}Level ${level} ${className}`}
        aria-label={`${className} class, level ${level}`}
        className={`tier-badge-silver inline-flex items-center rounded-full border border-slate-400/30 text-slate-300 font-semibold shrink-0 ${sizeClass}`}
      >
        <span className={iconSize}>{classIcon}</span>
        <span>{className}</span>
        <span className="text-neutral-500">Lv.{level}</span>
        {prestige && <span>{prestige}</span>}
      </span>
    );
  }

  // Basic (1-10) — simple, no animation
  return (
    <span
      title={`Level ${level} ${className}`}
      aria-label={`${className} class, level ${level}`}
      className={`inline-flex items-center rounded border border-neutral-600/35 text-neutral-400 font-medium shrink-0 ${sizeClass}`}
      style={{ background: "rgba(64,64,64,0.15)" }}
    >
      <span className={iconSize}>{classIcon}</span>
      <span>{className}</span>
      <span className="text-neutral-600">Lv.{level}</span>
      {prestige && <span>{prestige}</span>}
    </span>
  );
}
