export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

export const TIERS: { tier: Tier; min: number; color: string }[] = [
  { tier: "Bronze",   min: 0,    color: "text-amber-700" },
  { tier: "Silver",   min: 500,  color: "text-neutral-300" },
  { tier: "Gold",     min: 1000, color: "text-amber-400" },
  { tier: "Platinum", min: 2500, color: "text-cyan-300" },
];

/** Diamond is reserved for admin and super_admin accounts. */
export const DIAMOND_TIER = {
  tier: "Diamond" as Tier,
  min: Infinity,
  color: "text-violet-400",
};

export function getTier(points: number) {
  return [...TIERS].reverse().find((t) => points >= t.min) ?? TIERS[0];
}

/**
 * Returns the effective display tier, overriding to Diamond for admin/super_admin.
 */
export function getEffectiveTier(points: number, role?: string | null) {
  if (role === "admin" || role === "super_admin") return DIAMOND_TIER;
  return getTier(points);
}

/** Returns points needed to reach the next tier, or null if already at max. */
export function getNextTier(
  points: number,
  role?: string | null
): { tier: Tier; needed: number } | null {
  if (role === "admin" || role === "super_admin") return null;
  const next = TIERS.find((t) => t.min > points);
  if (!next) return null;
  return { tier: next.tier, needed: next.min - points };
}

/** 0-100 progress toward the next tier. */
export function getTierProgress(points: number): number {
  const current = getTier(points);
  const next = TIERS.find((t) => t.min > points);
  if (!next) return 100;
  return ((points - current.min) / (next.min - current.min)) * 100;
}
