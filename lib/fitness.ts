/**
 * Fitness Tracker Core Logic
 * XP calculation, class definitions, level system, and anti-abuse caps.
 */

// ── Class Definitions ───────────────────────────────────────
export interface FitnessClass {
  id?: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  primaryExercises: string[];
  xpBonusMultiplier: number;
  offClassReduction: number;
  specialAbilities: Record<string, unknown>;
  displayOrder: number;
}

/** Static class definitions (mirrors the DB seed data) */
export const FITNESS_CLASSES: FitnessClass[] = [
  {
    name: "Warrior", slug: "warrior", icon: "🗡️",
    description: "Masters of strength and power. Warriors forge their body through iron and discipline, specialising in powerlifting, strength training and resistance work.",
    primaryExercises: ["Squats","Deadlifts","Bench Press","Overhead Press","Rows","Weighted Carries"],
    xpBonusMultiplier: 1.5, offClassReduction: 0.6,
    specialAbilities: { bonus_category: "strength", reduced_category: "cardio_only" },
    displayOrder: 1,
  },
  {
    name: "Ranger", slug: "ranger", icon: "🏹",
    description: "Relentless endurance athletes who conquer distance and time. Rangers thrive in the open, pushing cardiovascular limits through running, cycling, swimming and endurance challenges.",
    primaryExercises: ["Running","Cycling","Swimming","Rowing","Hiking","Trail Running"],
    xpBonusMultiplier: 1.5, offClassReduction: 0.6,
    specialAbilities: { bonus_category: "cardio", reduced_category: "strength_only" },
    displayOrder: 2,
  },
  {
    name: "Mage", slug: "mage", icon: "🔮",
    description: "Masters of the mind-body connection. Mages pursue flexibility, mobility and mindful movement, unlocking the body's full range of motion through yoga, stretching and recovery work.",
    primaryExercises: ["Yoga","Pilates","Stretching","Mobility Work","Foam Rolling","Breathwork"],
    xpBonusMultiplier: 1.5, offClassReduction: 0.6,
    specialAbilities: { bonus_category: "flexibility", reduced_category: "high_intensity" },
    displayOrder: 3,
  },
  {
    name: "Rogue", slug: "rogue", icon: "🗝️",
    description: "Fast, explosive and unpredictable. Rogues thrive in high intensity environments, burning maximum calories in minimum time through HIIT, circuit training and interval work.",
    primaryExercises: ["HIIT","Circuit Training","Tabata","Interval Running","Jump Training","Battle Ropes"],
    xpBonusMultiplier: 1.5, offClassReduction: 0.6,
    specialAbilities: { bonus_category: "hiit", reduced_category: "steady_state" },
    displayOrder: 4,
  },
  {
    name: "Paladin", slug: "paladin", icon: "⚔️",
    description: "The all-round champion. Paladins pursue complete physical fitness across all disciplines — strength, cardio, flexibility and endurance. No weakness, no gaps.",
    primaryExercises: ["All Exercise Types"],
    xpBonusMultiplier: 1.2, offClassReduction: 1.0,
    specialAbilities: { bonus_category: "all", no_reduction_penalty: true, balanced_bonus: true },
    displayOrder: 5,
  },
  {
    name: "Druid", slug: "druid", icon: "🌿",
    description: "Connected to the natural world, Druids pursue fitness through outdoor activities, functional movement and nature-based challenges.",
    primaryExercises: ["Hiking","Trail Running","Outdoor Swimming","Rock Climbing","Kayaking","Bodyweight Outdoor Training"],
    xpBonusMultiplier: 1.5, offClassReduction: 0.6,
    specialAbilities: { bonus_category: "outdoor", reduced_category: "gym_machine" },
    displayOrder: 6,
  },
  {
    name: "Berserker", slug: "berserker", icon: "🔥",
    description: "Fearless and ferocious. Berserkers embrace extreme training — CrossFit, functional fitness, Olympic lifting and pushing beyond every limit.",
    primaryExercises: ["CrossFit WODs","Olympic Lifting","Functional Fitness","Kettlebells","Strongman Training"],
    xpBonusMultiplier: 1.5, offClassReduction: 0.6,
    specialAbilities: { bonus_category: "crossfit", reduced_category: "steady_state_cardio" },
    displayOrder: 7,
  },
  {
    name: "Monk", slug: "monk", icon: "🥋",
    description: "Disciplined masters of body and mind. Monks combine martial arts, calisthenics and meditation to achieve perfect control, strength and focus through movement.",
    primaryExercises: ["Martial Arts","Calisthenics","Bodyweight Training","Gymnastics","Meditation","Breathwork"],
    xpBonusMultiplier: 1.5, offClassReduction: 0.6,
    specialAbilities: { bonus_category: "martial_arts", reduced_category: "weighted_machine" },
    displayOrder: 8,
  },
  {
    name: "Shaman", slug: "shaman", icon: "⚡",
    description: "Channelling the power of the elements, Shamans combine explosive power with recovery and mindfulness. A hybrid class for those who train hard and recover harder.",
    primaryExercises: ["Plyometrics","Power Training","Recovery Sessions","Cold Exposure","Sauna","Active Recovery"],
    xpBonusMultiplier: 1.5, offClassReduction: 0.6,
    specialAbilities: { bonus_category: "power_recovery", reduced_category: "pure_endurance" },
    displayOrder: 9,
  },
  {
    name: "Viking", slug: "viking", icon: "🪓",
    description: "The ultimate Ragnarök class. Vikings combine raw strength with endurance and warrior spirit. Rowing, strongman, combat sports and brutal conditioning — this is the class of legends.",
    primaryExercises: ["Rowing","Strongman Events","Combat Sports","Axe Throwing","Obstacle Courses","Rucking"],
    xpBonusMultiplier: 1.6, offClassReduction: 0.7,
    specialAbilities: {
      bonus_category: "viking_activities",
      xp_bonus_rate: 0.6,
      off_class_penalty: 0.3,
      viking_level_up_loyalty_bonus: 10,
    },
    displayOrder: 10,
  },
];

// ── Level System ───────────────────────────────────────────
/** XP required to reach a given level (cumulative from level 1). */
export function totalXpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpPerLevel(i);
  }
  return total;
}

/** XP required for a single level transition (level → level+1). */
export function xpPerLevel(level: number): number {
  if (level <= 9)  return 500;
  if (level <= 19) return 1000;
  if (level <= 29) return 2000;
  if (level <= 39) return 3500;
  if (level <= 49) return 5000;
  return 10000; // level 49 → 50
}

/** Given current level and current XP in that level, return XP needed for next level. */
export function xpToNextLevel(currentLevel: number, currentXp: number): number {
  if (currentLevel >= 50) return 0;
  return xpPerLevel(currentLevel) - currentXp;
}

/** Level up reward XP (scales with level reached). */
export function levelUpXpReward(levelReached: number): number {
  if (levelReached <= 10) return 100;
  if (levelReached <= 20) return 150;
  if (levelReached <= 30) return 200;
  if (levelReached <= 40) return 300;
  if (levelReached <= 49) return 400;
  return 500; // level 50
}

/** Level up reward points (scales with level reached). */
export function levelUpPointsReward(levelReached: number): number {
  if (levelReached <= 10) return 25;
  if (levelReached <= 20) return 50;
  if (levelReached <= 30) return 75;
  if (levelReached <= 40) return 100;
  if (levelReached <= 49) return 150;
  return 200; // level 50
}

/** Prestige level title displayed alongside the class badge. */
export function prestigeLabel(prestigeCount: number): string {
  if (prestigeCount === 0) return "";
  if (prestigeCount === 1) return "⭐";
  if (prestigeCount === 2) return "⭐⭐";
  if (prestigeCount === 3) return "✨⭐✨";
  if (prestigeCount === 4) return "🌟";
  return "💫"; // 5+
}

/** Class title displayed next to member name */
export function classTitle(
  className: string,
  level: number,
  prestigeCount: number
): string {
  const prestige = prestigeLabel(prestigeCount);
  const prefix = prestige ? `${prestige} ` : "";
  return `${prefix}Level ${level} ${className}`;
}

// ── XP Calculation ──────────────────────────────────────────
export interface WorkoutXpInput {
  durationMinutes: number;
  intensity: "light" | "moderate" | "intense" | "maximum";
  isClassMatch: boolean;
  isOffClass: boolean;
  classBonusMultiplier: number; // from fitness_classes
  offClassReduction: number;    // from fitness_classes
  isPaladin: boolean;
  activeEventMultiplier?: number; // from active XP events
}

/** Duration multiplier (stacks with intensity multiplier). */
function durationMultiplier(minutes: number): number {
  if (minutes >= 60) return 1.6;
  if (minutes >= 45) return 1.4;
  if (minutes >= 30) return 1.2;
  return 1.0; // 20-30 min baseline
}

/** Intensity multiplier. */
function intensityMultiplier(intensity: string): number {
  switch (intensity) {
    case "light":    return 0.8;
    case "moderate": return 1.0;
    case "intense":  return 1.2;
    case "maximum":  return 1.5;
    default:         return 1.0;
  }
}

/**
 * Calculate XP earned for a single workout log.
 * Base XP: 25 (class match) or 15 (off-class)
 * Multipliers stack multiplicatively.
 */
export function calculateWorkoutXp(input: WorkoutXpInput): number {
  const baseXp = 25;

  // Duration × intensity multipliers (applied first)
  const durMult  = durationMultiplier(input.durationMinutes);
  const intenMult = intensityMultiplier(input.intensity);

  let xp = baseXp * durMult * intenMult;

  // Class match / off-class adjustment
  if (input.isClassMatch) {
    xp *= input.classBonusMultiplier;
  } else if (input.isOffClass && !input.isPaladin) {
    xp *= input.offClassReduction;
  }

  // Active XP event multiplier
  if (input.activeEventMultiplier && input.activeEventMultiplier > 1) {
    xp *= input.activeEventMultiplier;
  }

  return Math.round(xp);
}

/** Calculate loyalty points earned for a workout. */
export function calculateWorkoutPoints(isClassMatch: boolean): number {
  return isClassMatch ? 20 : 10;
}

// ── XP Anti-Abuse Caps ──────────────────────────────────────
export const XP_CAPS = {
  workouts_per_day:             1,    // only first workout per day counts toward base cap
  max_xp_per_day:             200,
  max_xp_per_week:            500,
  max_prs_per_day:              3,
  pr_per_exercise_cooldown_days: 7,
  max_pr_xp_per_week:         150,
  max_workout_duration_hours:   4,
  suspicious_daily_xp_threshold: 500,
  suspicious_daily_workouts:    3,
  high_earner_weekly_xp:      1000,
} as const;

/** Check if a duration is suspiciously long (> 4 hours). */
export function isSuspiciousDuration(durationMinutes: number): boolean {
  return durationMinutes > XP_CAPS.max_workout_duration_hours * 60;
}

// ── Category → Class Tag Mapping ───────────────────────────
export const CATEGORY_CLASS_MAP: Record<string, string[]> = {
  strength:    ["warrior", "berserker", "viking"],
  cardio:      ["ranger", "rogue", "druid"],
  flexibility: ["mage", "druid", "shaman"],
  hiit:        ["rogue", "berserker"],
  outdoor:     ["druid", "ranger", "viking"],
  functional:  ["berserker", "viking", "shaman"],
  martial_arts: ["monk", "rogue"],
  recovery:    ["shaman", "mage"],
};

/** Determine if an exercise category matches the given class slug. */
export function isClassMatch(exerciseCategory: string, classSlug: string): boolean {
  const classTags = CATEGORY_CLASS_MAP[exerciseCategory] ?? [];
  return classTags.includes(classSlug);
}

// ── Leaderboard Types ─────────────────────────────────────
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatar?: string;
  className: string;
  classIcon: string;
  classLevel: number;
  value: number;      // XP, streak days, prestige count depending on board
  tier: string;
}

// ── Challenge Types ────────────────────────────────────────
export type ChallengeType = "weekly" | "monthly" | "class" | "community";
export type ChallengeMetric = "workouts" | "duration_minutes" | "distance_km" | "xp";

// ── Body Tracking Types ────────────────────────────────────
export interface BodyMeasurement {
  id?: string;
  weight_kg?: number;
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  left_arm_cm?: number;
  right_arm_cm?: number;
  left_thigh_cm?: number;
  right_thigh_cm?: number;
  body_fat_percentage?: number;
  energy_rating?: number; // 1-5
  mood_rating?: number;   // 1-5
  sleep_hours?: number;
  water_litres?: number;
  notes?: string;
  measured_at: string;
}

// ── Prestige Visual Tiers ─────────────────────────────────
export function prestigeVisualTier(count: number): string {
  if (count === 0) return "none";
  if (count === 1) return "silver";
  if (count === 2) return "gold";
  if (count === 3) return "animated";
  if (count === 4) return "class_emblem";
  return "legendary";
}

// ── Class Badge Level Visual Tier ─────────────────────────
export function badgeLevelTier(level: number): "basic" | "glow" | "animated" | "premium" {
  if (level <= 10) return "basic";
  if (level <= 25) return "glow";
  if (level <= 40) return "animated";
  return "premium";
}

// ── Profile Particle Effect by Class ─────────────────────
export const CLASS_PARTICLE_EFFECTS: Record<string, string> = {
  warrior:   "sparks",
  ranger:    "wind",
  mage:      "sparkles",
  rogue:     "shadows",
  paladin:   "holy_light",
  druid:     "nature",
  berserker: "fire",
  monk:      "chi_rings",
  shaman:    "lightning",
  viking:    "runes",
};
