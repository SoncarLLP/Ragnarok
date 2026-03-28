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
  like_count: number;
  comment_count: number;
};

export type CommentData = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: PostAuthor | null;
};

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
  likes: unknown;
  comments: unknown;
}): PostData {
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
    like_count:
      (p.likes as [{ count: number }] | null)?.[0]?.count ?? 0,
    comment_count:
      (p.comments as [{ count: number }] | null)?.[0]?.count ?? 0,
  };
}

export const POST_SELECT = `
  id, user_id, type, content, image_url, ingredients, method, categories, created_at,
  profiles(full_name, username, avatar_url),
  likes(count),
  comments(count)
` as const;
