export const TIERS: { tier: string; min: number; color: string }[] = [
  { tier: "Bronze 1",   min: 0,    color: "text-amber-700" },
  { tier: "Bronze 2",   min: 250,  color: "text-amber-700" },
  { tier: "Bronze 3",   min: 500,  color: "text-amber-700" },
  { tier: "Silver 1",   min: 750,  color: "text-neutral-300" },
  { tier: "Silver 2",   min: 1050, color: "text-neutral-300" },
  { tier: "Silver 3",   min: 1350, color: "text-neutral-300" },
  { tier: "Gold 1",     min: 1650, color: "text-amber-400" },
  { tier: "Gold 2",     min: 2000, color: "text-amber-400" },
  { tier: "Gold 3",     min: 2350, color: "text-amber-400" },
  { tier: "Platinum 1", min: 2700, color: "text-cyan-300" },
  { tier: "Platinum 2", min: 3100, color: "text-cyan-300" },
  { tier: "Platinum 3", min: 3500, color: "text-cyan-300" },
];

export const DIAMOND_TIER = { tier: "Diamond", min: 4000, color: "text-violet-400" };

export const ALL_TIERS = [...TIERS, DIAMOND_TIER];

/** Returns the Tailwind colour class for a tier name from the database. */
export function getTierColor(tierName: string): string {
  return ALL_TIERS.find((t) => t.tier === tierName)?.color ?? "text-neutral-300";
}

/**
 * Returns the next tier and points still needed to reach it,
 * or null if the member is already at Diamond.
 */
export function getNextTier(
  tierName: string,
  points: number
): { tier: string; needed: number } | null {
  const idx = ALL_TIERS.findIndex((t) => t.tier === tierName);
  if (idx === -1 || idx === ALL_TIERS.length - 1) return null;
  const next = ALL_TIERS[idx + 1];
  return { tier: next.tier, needed: next.min - points };
}

/** Returns a 0–100 progress value toward the next tier. */
export function getTierProgress(tierName: string, points: number): number {
  const idx = ALL_TIERS.findIndex((t) => t.tier === tierName);
  if (idx === -1 || idx === ALL_TIERS.length - 1) return 100;
  const current = ALL_TIERS[idx];
  const next = ALL_TIERS[idx + 1];
  return Math.min(100, ((points - current.min) / (next.min - current.min)) * 100);
}

/**
 * Derive tier name from raw cumulative points (client-side fallback
 * for when the DB-stored tier column is not yet populated).
 */
export function tierFromPoints(points: number): string {
  const match = [...TIERS].reverse().find((t) => points >= t.min);
  if (points >= DIAMOND_TIER.min) return DIAMOND_TIER.tier;
  return match?.tier ?? "Bronze 1";
}
