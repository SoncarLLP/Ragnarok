import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { normalisePost, POST_SELECT } from "@/lib/community";
import type { PostData } from "@/lib/community";
import PostCard from "@/app/community/PostCard";
import FollowButton from "@/app/community/FollowButton";
import RoleBadge from "@/components/RoleBadge";
import TierBadge from "@/components/TierBadge";

export default async function PublicProfilePage(props: unknown) {
  const rawParams =
    props && typeof props === "object" && "params" in props
      ? (props as { params?: unknown }).params
      : undefined;
  const params = rawParams instanceof Promise ? await rawParams : rawParams;
  const username =
    params && typeof params === "object" && "username" in params
      ? String((params as Record<string, unknown>).username)
      : undefined;

  if (!username) return notFound();

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, username, bio, avatar_url, role, tier, member_id")
    .eq("username", username)
    .single();

  if (!profile) return notFound();

  const [
    { count: followerCount },
    { count: followingCount },
    { data: followRow },
    { data: rawPosts },
  ] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profile.id),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profile.id),
    currentUser
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", currentUser.id)
          .eq("following_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("posts") as any)
      .select(POST_SELECT)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts: PostData[] = (rawPosts ?? []).map((p: any) => normalisePost(p));

  let userReactionsMap = new Map<string, string>(); // post_id → emoji
  if (currentUser && posts.length > 0) {
    const { data: reactions } = await supabase
      .from("reactions")
      .select("post_id, emoji")
      .eq("user_id", currentUser.id)
      .not("post_id", "is", null)
      .in(
        "post_id",
        posts.map((p) => p.id)
      );
    userReactionsMap = new Map(
      (reactions ?? []).filter((r) => r.post_id).map((r) => [r.post_id as string, r.emoji])
    );
  }

  const displayName = profile.full_name || profile.username || "Member";
  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link
          href="/community"
          className="inline-block text-sm text-neutral-400 hover:text-white mb-8"
        >
          ← Community
        </Link>

        {/* Profile header */}
        <div className="flex items-start gap-6 mb-10">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-amber-700 flex items-center justify-center text-2xl font-semibold shrink-0">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold flex items-center gap-2 flex-wrap">
                {displayName}
                <RoleBadge role={profile.role} />
                <TierBadge tier={profile.tier} />
              </h1>
              {isOwnProfile ? (
                <Link
                  href="/account/profile"
                  className="text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20"
                >
                  Edit profile
                </Link>
              ) : currentUser ? (
                <FollowButton
                  targetUserId={profile.id}
                  initialFollowing={!!followRow}
                  currentUserId={currentUser.id}
                />
              ) : null}
            </div>

            {profile.username && (
              <div className="text-neutral-400 text-sm mt-0.5">@{profile.username}</div>
            )}
            {profile.bio && (
              <p className="mt-2 text-neutral-300 text-sm leading-relaxed">{profile.bio}</p>
            )}

            {profile.member_id != null && (
              <div className="mt-2 text-xs text-neutral-500 font-mono">
                #{String(profile.member_id).padStart(11, "0")}
              </div>
            )}

            <div className="mt-3 flex gap-6 text-sm">
              <div>
                <span className="font-semibold">{posts.length}</span>{" "}
                <span className="text-neutral-400">posts</span>
              </div>
              <div>
                <span className="font-semibold">{followerCount ?? 0}</span>{" "}
                <span className="text-neutral-400">followers</span>
              </div>
              <div>
                <span className="font-semibold">{followingCount ?? 0}</span>{" "}
                <span className="text-neutral-400">following</span>
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <p className="text-neutral-400 text-center py-16 text-sm">No posts yet.</p>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            {posts.map((post) => (
              <div key={post.id} className="break-inside-avoid mb-4">
                <PostCard
                  post={post}
                  userReaction={userReactionsMap.get(post.id) ?? null}
                  isFollowing={false}
                  currentUserId={currentUser?.id ?? null}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
