/**
 * Extract all @username strings from text, deduplicated and lowercased.
 * Matches @-prefixed alphanumeric strings (letters, digits, underscores, dots, hyphens).
 */
export function extractMentionedUsernames(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9_.-]+)/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}
