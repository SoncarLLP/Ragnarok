/**
 * Normalises a tier value from the database to a human-readable display name.
 * Handles both snake_case DB values ("thrall_1") and already-formatted strings
 * ("Thrall I", "Legendary") so callers don't need to know the storage format.
 */
export function formatTierName(tier: string | null | undefined): string {
  if (!tier) return "";
  // Already properly formatted (starts with uppercase, no underscores)
  if (/^[A-Z]/.test(tier) && !tier.includes("_")) return tier;
  // Convert snake_case → Title Case with space: "thrall_1" → "Thrall I"
  const romanMap: Record<string, string> = { "1": "I", "2": "II", "3": "III" };
  return tier
    .split("_")
    .map((word, i) => {
      if (i > 0 && romanMap[word]) return romanMap[word];
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/** ── 19-Tier Norse/RPG Tier Definitions ───────────────────────
 * Points are the PRIMARY requirement. Fitness level is an
 * additional unlock gate. Both must be met simultaneously.
 *
 * Fitness requirements are for informational display only here —
 * actual gate enforcement happens server-side in the DB trigger.
 */
export const TIERS: {
  tier: string;
  min: number;
  color: string;
  group: string;
  fitnessLevel: number;
  fitnessPrestige: number;
}[] = [
  // ── Thrall (Iron Grey) ──────────────────────────────────────
  { tier: "Thrall I",    min: 0,      color: "text-neutral-500",  group: "thrall",    fitnessLevel: 0, fitnessPrestige: 0 },
  { tier: "Thrall II",   min: 500,    color: "text-neutral-400",  group: "thrall",    fitnessLevel: 0, fitnessPrestige: 0 },
  { tier: "Thrall III",  min: 1000,   color: "text-neutral-400",  group: "thrall",    fitnessLevel: 0, fitnessPrestige: 0 },

  // ── Karl (Wood Brown & Copper) ──────────────────────────────
  { tier: "Karl I",      min: 2000,   color: "text-amber-600",    group: "karl",      fitnessLevel: 5,  fitnessPrestige: 0 },
  { tier: "Karl II",     min: 3500,   color: "text-amber-500",    group: "karl",      fitnessLevel: 10, fitnessPrestige: 0 },
  { tier: "Karl III",    min: 5500,   color: "text-amber-400",    group: "karl",      fitnessLevel: 15, fitnessPrestige: 0 },

  // ── Huscarl (Steel Blue & Silver) ──────────────────────────
  { tier: "Huscarl I",   min: 8000,   color: "text-blue-300",     group: "huscarl",   fitnessLevel: 20, fitnessPrestige: 0 },
  { tier: "Huscarl II",  min: 11000,  color: "text-blue-200",     group: "huscarl",   fitnessLevel: 25, fitnessPrestige: 0 },
  { tier: "Huscarl III", min: 15000,  color: "text-slate-200",    group: "huscarl",   fitnessLevel: 30, fitnessPrestige: 0 },

  // ── Jarl (Rich Purple & Gold) ───────────────────────────────
  { tier: "Jarl I",      min: 20000,  color: "text-purple-300",   group: "jarl",      fitnessLevel: 35, fitnessPrestige: 0 },
  { tier: "Jarl II",     min: 26000,  color: "text-purple-200",   group: "jarl",      fitnessLevel: 38, fitnessPrestige: 0 },
  { tier: "Jarl III",    min: 33000,  color: "text-violet-300",   group: "jarl",      fitnessLevel: 41, fitnessPrestige: 0 },

  // ── Einherjar (Odin's Gold & Raven Black) ──────────────────
  { tier: "Einherjar I",   min: 42000,  color: "text-yellow-400",   group: "einherjar", fitnessLevel: 44, fitnessPrestige: 0 },
  { tier: "Einherjar II",  min: 52000,  color: "text-yellow-300",   group: "einherjar", fitnessLevel: 46, fitnessPrestige: 0 },
  { tier: "Einherjar III", min: 64000,  color: "text-amber-300",    group: "einherjar", fitnessLevel: 48, fitnessPrestige: 0 },

  // ── Valkyrie (Silver White & Divine Gold) ──────────────────
  { tier: "Valkyrie I",    min: 78000,  color: "text-white",        group: "valkyrie",  fitnessLevel: 49, fitnessPrestige: 1 },
  { tier: "Valkyrie II",   min: 95000,  color: "text-white",        group: "valkyrie",  fitnessLevel: 49, fitnessPrestige: 2 },
  { tier: "Valkyrie III",  min: 115000, color: "text-white",        group: "valkyrie",  fitnessLevel: 50, fitnessPrestige: 3 },
];

export const LEGENDARY_TIER = {
  tier: "Legendary",
  min: 150000,
  color: "text-violet-400",
  group: "legendary",
  fitnessLevel: 50,
  fitnessPrestige: 5,
};

export const ALL_TIERS = [...TIERS, LEGENDARY_TIER];

/** @deprecated Use LEGENDARY_TIER. Kept for backward compatibility. */
export const DIAMOND_TIER = LEGENDARY_TIER;

/** Returns the Tailwind colour class for a tier name. */
export function getTierColor(tierName: string): string {
  return ALL_TIERS.find((t) => t.tier === tierName)?.color ?? "text-neutral-400";
}

/** Returns the tier group name (thrall|karl|huscarl|jarl|einherjar|valkyrie|legendary) */
export function getTierGroup(tierName: string): string {
  return ALL_TIERS.find((t) => t.tier === tierName)?.group ?? "thrall";
}

/**
 * Returns the next tier and points still needed to reach it,
 * or null if the member is already at Legendary.
 * Optionally returns fitness requirements for the next tier.
 */
export function getNextTier(
  tierName: string,
  points: number
): { tier: string; needed: number; fitnessLevel: number; fitnessPrestige: number } | null {
  const idx = ALL_TIERS.findIndex((t) => t.tier === tierName);
  if (idx === -1 || idx === ALL_TIERS.length - 1) return null;
  const next = ALL_TIERS[idx + 1];
  return {
    tier: next.tier,
    needed: Math.max(0, next.min - points),
    fitnessLevel: next.fitnessLevel,
    fitnessPrestige: next.fitnessPrestige,
  };
}

/** Returns a 0–100 progress value toward the next tier (points only). */
export function getTierProgress(tierName: string, points: number): number {
  const idx = ALL_TIERS.findIndex((t) => t.tier === tierName);
  if (idx === -1 || idx === ALL_TIERS.length - 1) return 100;
  const current = ALL_TIERS[idx];
  const next = ALL_TIERS[idx + 1];
  return Math.min(100, Math.max(0, ((points - current.min) / (next.min - current.min)) * 100));
}

/**
 * Derive tier name from raw cumulative points alone (client-side fallback).
 * Note: does NOT check fitness requirements — server-side DB is authoritative.
 */
export function tierFromPoints(points: number): string {
  const reversed = [...ALL_TIERS].reverse();
  const match = reversed.find((t) => points >= t.min);
  return match?.tier ?? "Thrall I";
}

/** Friendly description of each tier group for the rewards page. */
export const TIER_GROUP_DESCRIPTIONS: Record<string, string> = {
  thrall:    "Beginning your journey. Every legend starts here.",
  karl:      "A free warrior proving their worth. Fitness unlocks required.",
  huscarl:   "A household warrior of strength and skill.",
  jarl:      "A chieftain of power and influence.",
  einherjar: "The chosen warriors of Odin, destined for Valhalla.",
  valkyrie:  "The divine choosers of the slain. Elite beyond measure.",
  legendary: "Yggdrasil's chosen. The ultimate tier of Ragnarök.",
};

/** Points required per loyalty source (for display on rewards page). */
export const LOYALTY_EARN_RATES = {
  purchase_per_pound:               10,
  signup_bonus:                    200,
  post_reaction_milestone_per_250:   5,
  comment_reaction_per_100:          3,
  workout_logged:                   10,
  class_matched_workout:            20,
  daily_streak:                      5,
  weekly_streak_bonus:              25,
  monthly_streak_bonus:            100,
  personal_record:                  30,
  level_up_min:                     25,
  level_up_max:                    200,
  prestige_achieved:               500,
  weekly_challenge:                 75,
  monthly_challenge:               250,
  fitness_milestone:               100,
  guild_challenge:                  50,
  leaderboard_top1:                100,
  leaderboard_top2:                 75,
  leaderboard_top3:                 50,
  viking_level_up_bonus:            10,
} as const;

/** Reason label map for the points history display. */
export const REASON_LABELS: Record<string, string> = {
  signup_bonus:                     "Welcome bonus",
  purchase:                         "Purchase reward",
  redemption:                       "Points redeemed",
  reaction_milestone_post:          "Post reaction milestone",
  reaction_milestone_comment:       "Comment reaction milestone",
  fitness_workout:                  "Workout logged",
  fitness_class_match:              "Class-matched workout bonus",
  fitness_streak_daily:             "Daily streak bonus",
  fitness_streak_weekly:            "Weekly streak bonus",
  fitness_streak_monthly:           "Monthly streak bonus",
  fitness_personal_record:          "Personal record beaten",
  fitness_level_up:                 "Level up reward",
  fitness_prestige:                 "Prestige achievement",
  fitness_weekly_challenge:         "Weekly challenge completed",
  fitness_monthly_challenge:        "Monthly challenge completed",
  fitness_milestone:                "Fitness milestone",
  fitness_guild_challenge:          "Guild challenge completed",
  fitness_leaderboard:              "Leaderboard top finish",
  fitness_viking_level_bonus:       "Viking level-up bonus",
  fitness_viking_prestige_bonus:    "Viking prestige bonus",
  fitness_achievement:              "Fitness achievement",
};
