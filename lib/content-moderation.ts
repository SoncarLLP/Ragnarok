// lib/content-moderation.ts
// Two-layer content moderation:
//   Layer 1 — Word & phrase filter (server-side, DB-backed with hardcoded seed list)
//   Layer 2 — NsfwJS image safety (server-side, no external API)

import type { SupabaseClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// BUILT-IN BLOCKED WORDS SEED LIST
// Context-aware whole-word matching to avoid false positives.
// ─────────────────────────────────────────────────────────────────────────────

export const BUILTIN_BLOCKED_WORDS: string[] = [
  // ── Racial slurs & hate speech ────────────────────────────────────────────
  "nigger", "nigga", "niggas", "chink", "gook", "spic", "spick", "kike",
  "wetback", "coon", "jigaboo", "porch monkey", "sand nigger", "towelhead",
  "raghead", "zipperhead", "cracker", "honky", "redskin", "injun",
  "beaner", "greaseball", "wop", "dago", "guinea", "polack", "kraut",
  "yid", "heeb", "hymie",

  // ── Sexist & misogynistic ─────────────────────────────────────────────────
  "cunt", "slut", "whore", "bitch", "skank", "slag", "harlot", "tramp",
  "trollop", "cow", "hoe", "thot",

  // ── Homophobic & transphobic ──────────────────────────────────────────────
  "faggot", "fag", "dyke", "queer", "tranny", "shemale", "ladyboy",
  "homo", "sodomite", "nancy boy",

  // ── Extreme profanity (contextual – allow in fitness context via whitelist) ─
  "motherfucker", "motherfucking", "cocksucker", "fucktard",
  "shitstain", "asshole", "arsehole", "dumbass", "jackass",
  "dickhead", "shithead", "bastard", "wanker", "tosser", "twat",
  "bellend", "muppet",

  // ── Threats & violent language ────────────────────────────────────────────
  "i will kill you", "i will hurt you", "i want you dead", "die bitch",
  "gonna kill", "gonna murder", "slit your throat", "cut your throat",
  "stab you", "shoot you", "bomb you", "blow you up",

  // ── Sexual harassment ─────────────────────────────────────────────────────
  "send nudes", "send pics", "show me your", "i want to fuck you",
  "i want to rape you", "rape you", "sexual assault",
];

// ─────────────────────────────────────────────────────────────────────────────
// FITNESS INDUSTRY WHITELIST — overrides blocked words
// Common gym/fitness terms that must never be blocked.
// ─────────────────────────────────────────────────────────────────────────────

export const BUILTIN_WHITELIST_WORDS: string[] = [
  "beast", "beastmode", "beast mode", "killer", "killer workout", "kill it",
  "destroy", "crush", "crush it", "savage", "insane", "sick", "brutal",
  "deadlift", "snatch", "jerk", "clean and jerk", "power clean",
  "squat", "beast gains", "beast lift", "kill the workout", "kill the game",
  "destroy your workout", "crush your goals", "savage gains",
  "brutal workout", "insane gains", "sick gains", "sick workout",
  "ass to grass", "atg", "grind", "grinder", "no pain no gain",
  "swole", "pump", "shredded", "ripped", "jacked", "cut",
  "gains", "PR", "PB", "personal record", "personal best",
  "beast mode activated", "lets go", "lets get it", "kill mode",
];

export type ModerationResult = {
  allowed: boolean;
  blockedWords: string[];
  reason: string;
};

/**
 * Checks text content against the blocked words list (with whitelist override).
 * Uses whole-word boundary matching to avoid the Scunthorpe problem.
 *
 * @param text        The content to check
 * @param extraBlocked Additional blocked words from DB (custom additions)
 * @param extraWhitelist Additional whitelisted words from DB (custom additions)
 */
export function checkTextContent(
  text: string,
  extraBlocked: string[] = [],
  extraWhitelist: string[] = []
): ModerationResult {
  if (!text?.trim()) return { allowed: true, blockedWords: [], reason: "" };

  const lower = text.toLowerCase();
  const allBlocked  = [...BUILTIN_BLOCKED_WORDS,  ...extraBlocked];
  const allWhitelist = [...BUILTIN_WHITELIST_WORDS, ...extraWhitelist];

  // Build whitelist regex — if text contains any whitelisted phrase, those
  // segments are exempt from blocking.
  const whitelistMatches = new Set<string>();
  for (const wl of allWhitelist) {
    const escaped = wl.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`\\b${escaped}\\b`, "i");
    if (rx.test(lower)) whitelistMatches.add(wl.toLowerCase());
  }

  const found: string[] = [];

  for (const word of allBlocked) {
    // Skip if this blocked word is covered by a whitelist entry
    const lw = word.toLowerCase();
    const isWhitelisted = [...whitelistMatches].some((wl) =>
      wl.includes(lw) || lw.includes(wl)
    );
    if (isWhitelisted) continue;

    // Multi-word phrases: simple substring check with word boundaries
    if (word.includes(" ")) {
      const escaped = lw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(`\\b${escaped}\\b`, "i");
      if (rx.test(lower)) found.push(word);
    } else {
      // Single word: strict whole-word boundary
      const escaped = lw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i");
      if (rx.test(lower)) found.push(word);
    }
  }

  if (found.length > 0) {
    return {
      allowed: false,
      blockedWords: found,
      reason: "word_filter",
    };
  }

  return { allowed: true, blockedWords: [], reason: "" };
}

/**
 * Loads the current blocked words and whitelist from the database.
 * Falls back to built-in lists if DB is unavailable.
 */
export async function getModerationsFromDB(adminClient: SupabaseClient): Promise<{ blocked: string[]; whitelist: string[] }> {
  try {
    const { data } = await adminClient
      .from("moderation_settings")
      .select("key, value")
      .in("key", ["blocked_words", "whitelist_words"]);

    const blockedRow   = data?.find((r) => r.key === "blocked_words");
    const whitelistRow = data?.find((r) => r.key === "whitelist_words");

    return {
      blocked:   Array.isArray(blockedRow?.value)   ? (blockedRow.value   as string[]) : [],
      whitelist: Array.isArray(whitelistRow?.value) ? (whitelistRow.value as string[]) : [],
    };
  } catch {
    return { blocked: [], whitelist: [] };
  }
}

/**
 * Records a moderation block event to the DB log.
 * Fire-and-forget — does not throw.
 */
export async function logModerationEvent(
  adminClient: SupabaseClient,
  userId: string | null,
  contentType: string,
  excerpt: string,
  reason: string,
  blockedWords: string[]
): Promise<void> {
  try {
    await adminClient.from("moderation_log").insert({
      user_id:      userId,
      content_type: contentType,
      excerpt:      excerpt.slice(0, 200),
      reason,
      blocked_words: blockedWords,
    });
  } catch {
    // Non-fatal
  }
}

/**
 * Applies the three-strike system to a user.
 * Returns the new strike count and whether the account was suspended.
 */
export async function applyModerationStrike(
  adminClient: SupabaseClient,
  userId: string
): Promise<{ strikes: number; suspended: boolean }> {
  const { data: profile } = await adminClient
    .from("profiles")
    .select("moderation_strikes, id")
    .eq("id", userId)
    .single();

  if (!profile) return { strikes: 0, suspended: false };

  const newStrikes = (profile.moderation_strikes ?? 0) + 1;
  const suspended  = newStrikes >= 3;

  await adminClient
    .from("profiles")
    .update({
      moderation_strikes: newStrikes,
      ...(suspended ? { status: "suspended" } : {}),
    })
    .eq("id", userId);

  // Notification message based on strike number
  let notifMessage = "";
  if (newStrikes === 1) {
    notifMessage =
      "Your content was blocked by our automated moderation system for violating our community guidelines. This is your first warning — further violations may result in account suspension.";
  } else if (newStrikes === 2) {
    notifMessage =
      "Your content was blocked again for violating community guidelines. This is your second warning. One more violation will result in your account being suspended pending admin review.";
  } else {
    notifMessage =
      "Your content was blocked for a third time. Your account has been suspended pending admin review. A member of our team will be in touch.";
  }

  await adminClient.from("notifications").insert({
    user_id:      userId,
    type:         suspended ? "suspended" : "warning",
    message:      notifMessage,
    link:         "/policies#community-guidelines",
    admin_notice: true,
  });

  // Notify all super admins if account was suspended
  if (suspended) {
    const { data: superAdmins } = await adminClient
      .from("profiles")
      .select("id")
      .eq("role", "super_admin");

    for (const sa of superAdmins ?? []) {
      await adminClient.from("notifications").insert({
        user_id:      sa.id,
        type:         "flagged_content",
        message:      `A member's account has been automatically suspended after 3 moderation strikes. Review in the admin panel.`,
        link:         "/admin",
        admin_notice: false,
      });
    }
  }

  return { strikes: newStrikes, suspended };
}
