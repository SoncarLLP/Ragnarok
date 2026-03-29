import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, normalisePost, POST_SELECT } from "@/lib/community";
import type { Category, PostData } from "@/lib/community";
import CategoryFilter from "./CategoryFilter";
import PostCard from "./PostCard";
import CreatePostButton from "./CreatePostButton";
import NavWrapper from "@/components/NavWrapper";

export default async function CommunityPage(props: unknown) {
  // Next.js 15: searchParams is a Promise
  const rawSP =
    props && typeof props === "object" && "searchParams" in props
      ? (props as { searchParams?: unknown }).searchParams
      : undefined;
  const sp = rawSP instanceof Promise ? await rawSP : rawSP;
  const category =
    sp && typeof sp === "object" && "category" in sp
      ? String((sp as Record<string, unknown>).category)
      : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Build post query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("posts") as any)
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(60);

  if (category && (CATEGORIES as readonly string[]).includes(category)) {
    query = query.contains("categories", [category as Category]);
  }

  const { data: rawPosts, error: postsError } = await query;

  // Current user's reactions + follows
  let userReactionsMap = new Map<string, string>(); // post_id → emoji
  let followedIds = new Set<string>();
  let isAdmin = false;
  let userRole: string | null = null;

  if (user) {
    const [{ data: reactions }, { data: follows }, { data: myProfile }] = await Promise.all([
      supabase
        .from("reactions")
        .select("post_id, emoji")
        .eq("user_id", user.id)
        .not("post_id", "is", null),
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
      supabase.from("profiles").select("role").eq("id", user.id).single(),
    ]);
    userReactionsMap = new Map(
      (reactions ?? [])
        .filter((r) => r.post_id)
        .map((r) => [r.post_id as string, r.emoji])
    );
    followedIds = new Set(follows?.map((f) => f.following_id) ?? []);
    userRole = myProfile?.role ?? null;
    isAdmin = userRole === "admin" || userRole === "super_admin";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts: PostData[] = (rawPosts ?? []).map((p: any) => normalisePost(p));

  // Followed users' posts first, then the rest
  const sorted = [
    ...posts.filter((p) => followedIds.has(p.user_id)),
    ...posts.filter((p) => !followedIds.has(p.user_id)),
  ];

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold tracking-wide">
              SONCAR
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-300 text-sm">Community</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/account"
                  className="text-sm text-neutral-400 hover:text-white hidden sm:block"
                >
                  My Account
                </Link>
                <CreatePostButton userId={user.id} />
              </>
            ) : (
              <Link
                href="/auth/login"
                className="text-sm px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
              >
                Sign in to post
              </Link>
            )}
            <NavWrapper />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Community</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Training tips, recipes, progress and more from the SONCAR community
          </p>
        </div>

        <CategoryFilter activeCategory={category} />

        {postsError && (
          <div className="mt-6 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            Query error: {postsError.message} (code: {postsError.code})
          </div>
        )}

        {sorted.length === 0 ? (
          <div className="mt-16 text-center text-neutral-400">
            <p>No posts yet{category ? ` in "${category}"` : ""}.</p>
            {user ? (
              <p className="mt-2 text-sm">Be the first — click + New Post above!</p>
            ) : (
              <p className="mt-2 text-sm">
                <Link href="/auth/signup" className="text-amber-400 hover:underline">
                  Create an account
                </Link>{" "}
                to start posting.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-6 columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
            {sorted.map((post) => (
              <div key={post.id} className="break-inside-avoid mb-4">
                <PostCard
                  post={post}
                  userReaction={userReactionsMap.get(post.id) ?? null}
                  isFollowing={followedIds.has(post.user_id)}
                  currentUserId={user?.id ?? null}
                  isAdmin={isAdmin}
                  userRole={userRole}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
