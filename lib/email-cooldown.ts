export const MEMBER_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours
export const MOD_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * Returns true if enough time has passed since lastSentAt (or it was never set),
 * meaning an email can be sent now.
 */
export function cooldownExpired(
  lastSentAt: string | null | undefined,
  cooldownMs: number
): boolean {
  if (!lastSentAt) return true;
  return Date.now() - new Date(lastSentAt).getTime() > cooldownMs;
}
