import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { normalisePost, POST_SELECT } from "@/lib/community";
import ReactionButton from "../ReactionButton";
import FollowButton from "../FollowButton";
import CommentSection from "./CommentSection";
import RoleBadge from "@/components/RoleBadge";
import TierBadge from "@/components/TierBadge";
import type { CommentData } from "@/lib/community";

export default async function PostPage(props: unknown) {
  const rawParams =
    props && typeof props === "object" && "params" in props
      ? (props as { params?: unknown }).params
      : undefined;
  const params = rawParams instanceof Promise ? await rawParams : rawParams;
  const id =
    params && typeof params === "object" && "id" in params
      ? String((params as Record<string, unknown>).id)
      : undefined;

  if (!id) return notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw } = await (supabase.from("posts") as any)
    .select(POST_SELECT)
    .eq("id", id)
    .single();

  if (!raw) return notFound();

  const post = normalisePost(raw);

  // Fetch comments with their reactions embedded
  const { data: rawComments } = await supabase
    .from("comments")
    .select(
      "id, post_id, user_id, content, created_at, profiles!comments_user_id_fkey(full_name, username, avatar_url, role, tier), reactions!comment_id(emoji)"
    )
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  let userPostReaction: string | null = null;
  let userCommentReactionsMap = new Map<string, string>(); // comment_id → emoji
  let isFollowing = false;

  if (user) {
    const commentIds = (rawComments ?? []).map((c) => c.id);
    const queries: PromiseLike<unknown>[] = [
      supabase
        .from("reactions")
        .select("emoji")
        .eq("post_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("following_id", post.user_id)
        .maybeSingle(),
    ];
    if (commentIds.length > 0) {
      queries.push(
        supabase
          .from("reactions")
          .select("comment_id, emoji")
          .eq("user_id", user.id)
          .not("comment_id", "is", null)
          .in("comment_id", commentIds)
      );
    }

    const [postReactionRes, followRes, commentReactionRes] = await Promise.all(queries);
    const { data: prRow } = postReactionRes as { data: { emoji: string } | null };
    const { data: followRow } = followRes as { data: { follower_id: string } | null };
    userPostReaction = prRow?.emoji ?? null;
    isFollowing = !!followRow;

    if (commentReactionRes) {
      const { data: crRows } = commentReactionRes as {
        data: { comment_id: string; emoji: string }[] | null;
      };
      userCommentReactionsMap = new Map(
        (crRows ?? []).map((r) => [r.comment_id, r.emoji])
      );
    }
  }

  // Build comment reaction summaries
  function computeTopReactions(reactions: { emoji: string }[] | null, n = 3): string[] {
    if (!reactions || reactions.length === 0) return [];
    const counts: Record<string, number> = {};
    for (const r of reactions) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([emoji]) => emoji);
  }

  const comments: CommentData[] = (rawComments ?? []).map((c) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reactionRows = (c as any).reactions as { emoji: string }[] | null ?? [];
    return {
      id: c.id,
      post_id: c.post_id,
      user_id: c.user_id,
      content: c.content,
      created_at: c.created_at,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profiles: Array.isArray(c.profiles) ? (c.profiles as any)[0] : c.profiles,
      reaction_count: reactionRows.length,
      top_reactions: computeTopReactions(reactionRows),
      user_reaction: userCommentReactionsMap.get(c.id) ?? null,
    };
  });

  const authorHref = post.author.username
    ? `/account/profile/${post.author.username}`
    : "#";
  const authorName = post.author.full_name || post.author.username || "Member";

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href="/community"
          className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white mb-6"
        >
          ← Community
        </Link>

        <article className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          {/* Author */}
          <div className="px-6 pt-6 flex items-center justify-between gap-4">
            <Link href={authorHref} className="flex items-center gap-3">
              {post.author.avatar_url ? (
                <img
                  src={post.author.avatar_url}
                  alt={authorName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-amber-700 flex items-center justify-center text-sm font-semibold shrink-0">
                  {authorName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-medium flex items-center gap-1.5 flex-wrap">
                  {authorName}
                  <RoleBadge role={post.author.role} />
                  <TierBadge tier={post.author.tier} />
                </div>
                <div className="text-xs text-neutral-500">
                  {new Date(post.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
            </Link>
            {user && user.id !== post.user_id && (
              <FollowButton
                targetUserId={post.user_id}
                initialFollowing={isFollowing}
                currentUserId={user.id}
              />
            )}
          </div>

          {/* Categories */}
          {post.categories.length > 0 && (
            <div className="px-6 pt-3 flex flex-wrap gap-1">
              {post.categories.map((cat) => (
                <span
                  key={cat}
                  className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="px-6 py-5">
            {post.type === "photo" && post.image_url && (
              <Image
                src={post.image_url}
                alt="Post photo"
                width={800}
                height={600}
                className="w-full rounded-lg object-cover mb-5"
              />
            )}

            {post.content && (
              <p className="text-neutral-200 leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>
            )}

            {post.type === "recipe" && (
              <div className="mt-6 space-y-5">
                {post.ingredients && (
                  <div>
                    <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-2">
                      Ingredients
                    </h2>
                    <p className="text-neutral-300 text-sm whitespace-pre-wrap leading-relaxed">
                      {post.ingredients}
                    </p>
                  </div>
                )}
                {post.method && (
                  <div>
                    <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-2">
                      Method
                    </h2>
                    <p className="text-neutral-300 text-sm whitespace-pre-wrap leading-relaxed">
                      {post.method}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reactions */}
          <div className="px-6 py-4 border-t border-white/10">
            <ReactionButton
              postId={post.id}
              initialCount={post.reaction_count}
              initialReaction={userPostReaction}
              topReactions={post.top_reactions}
              currentUserId={user?.id ?? null}
            />
          </div>
        </article>

        {/* Comments */}
        <div className="mt-10">
          <CommentSection
            postId={post.id}
            comments={comments}
            currentUserId={user?.id ?? null}
          />
        </div>
      </div>
    </main>
  );
}
