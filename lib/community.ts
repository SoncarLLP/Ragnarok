export const CATEGORIES = [
  "Fitness & Training",
  "Food & Nutrition",
  "Life Updates",
  "Recipes",
  "Progress Photos",
  "Motivation",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type PostType = "text" | "photo" | "recipe";

export type PostAuthor = {
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role?: string | null;
  tier?: string | null;
  account_mode?: string | null;
};

export type PostData = {
  id: string;
  user_id: string;
  type: PostType;
  content: string | null;
  image_url: string | null;
  ingredients: string | null;
  method: string | null;
  categories: string[];
  created_at: string;
  author: PostAuthor;
  reaction_count: number;
  top_reactions: string[];
  comment_count: number;
};

export type CommentData = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: PostAuthor | null;
  reaction_count: number;
  top_reactions: string[];
  user_reaction: string | null;
};

/** Compute top N emoji types from a flat array of reaction rows. */
function computeTopReactions(
  reactions: { emoji: string }[] | null,
  n = 3
): string[] {
  if (!reactions || reactions.length === 0) return [];
  const counts: Record<string, number> = {};
  for (const r of reactions) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([emoji]) => emoji);
}

/** Normalise the raw Supabase row (with embedded counts) into a clean PostData. */
export function normalisePost(p: {
  id: string;
  user_id: string;
  type: string;
  content: string | null;
  image_url: string | null;
  ingredients: string | null;
  method: string | null;
  categories: string[] | null;
  created_at: string;
  profiles: PostAuthor | PostAuthor[] | null;
  reactions: { emoji: string }[] | null;
  comments: unknown;
}): PostData {
  const reactionRows = p.reactions ?? [];
  return {
    id: p.id,
    user_id: p.user_id,
    type: p.type as PostType,
    content: p.content,
    image_url: p.image_url,
    ingredients: p.ingredients,
    method: p.method,
    categories: p.categories ?? [],
    created_at: p.created_at,
    author: Array.isArray(p.profiles)
      ? (p.profiles[0] ?? { full_name: null, username: null, avatar_url: null })
      : (p.profiles ?? { full_name: null, username: null, avatar_url: null }),
    reaction_count: reactionRows.length,
    top_reactions: computeTopReactions(reactionRows),
    comment_count:
      (p.comments as [{ count: number }] | null)?.[0]?.count ?? 0,
  };
}

export const POST_SELECT = `
  id, user_id, type, content, image_url, ingredients, method, categories, created_at,
  profiles!posts_user_id_fkey(full_name, username, avatar_url, role, tier, account_mode),
  reactions!post_id(emoji),
  comments(count)
` as const;
