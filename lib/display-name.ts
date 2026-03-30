/**
 * Resolves the display name for a member based on their display_name_preference.
 *
 * - 'username' (default): show @username (or username without @)
 * - 'real_name': show full_name
 *
 * Falls back gracefully if the preferred value is missing.
 */
export function getDisplayName(profile: {
  full_name?: string | null;
  username?: string | null;
  display_name_preference?: string | null;
}): string {
  if (profile.display_name_preference === "real_name" && profile.full_name) {
    return profile.full_name;
  }
  return profile.username || profile.full_name || "Member";
}
