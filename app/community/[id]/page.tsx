import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { normalisePost, POST_SELECT, isPostPinned, pinTimeRemaining } from "@/lib/community";
import ReactionButton from "../ReactionButton";
import ShareButton from "../ShareButton";
import FollowButton from "../FollowButton";
import MentionText from "../MentionText";
import CommentSection from "./CommentSection";
import MemberBadge from "@/components/MemberBadge";
import type { CommentData } from "@/lib/community";
import { getDisplayName } from "@/lib/display-name";

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
      "id, post_id, user_id, content, created_at, profiles!comments_user_id_fkey(full_name, username, avatar_url, role, tier, display_name_preference), reactions!comment_id(emoji)"
    )
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  let userPostReaction: string | null = null;
  let userCommentReactionsMap = new Map<string, string>(); // comment_id → emoji
  let isFollowing = false;
  let userRole: string | null = null;

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
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single(),
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

    const [postReactionRes, followRes, profileRes, commentReactionRes] = await Promise.all(queries);
    const { data: prRow } = postReactionRes as { data: { emoji: string } | null };
    const { data: followRow } = followRes as { data: { follower_id: string } | null };
    const { data: profileRow } = profileRes as { data: { role: string } | null };
    userPostReaction = prRow?.emoji ?? null;
    isFollowing = !!followRow;
    userRole = profileRow?.role ?? null;

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

  const isOfficialPost = !!post.post_as_role;
  const pinned = isPostPinned(post);
  const pinLabel = pinned ? pinTimeRemaining(post) : null;

  const authorHref = !isOfficialPost && post.author.username
    ? `/account/profile/${post.author.username}`
    : "#";
  const authorName = getDisplayName(post.author);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href="/community"
          className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white mb-6"
        >
          ← Community
        </Link>

        <article className={`rounded-xl overflow-hidden ${
          isOfficialPost
            ? "border border-amber-500/25 bg-gradient-to-b from-slate-800/70 to-slate-900/80 shadow-lg shadow-black/30"
            : "border border-white/10 bg-white/5"
        }`}>

          {/* Pinned banner — official posts only */}
          {isOfficialPost && pinned && (
            <div className="flex items-center gap-1.5 px-6 py-2 bg-amber-500/15 border-b border-amber-500/20 text-xs text-amber-300">
              <span>📌</span>
              <span>{pinLabel}</span>
            </div>
          )}

          {/* Official Post badge */}
          {isOfficialPost && (
            <div className="px-6 pt-4 pb-0">
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                </svg>
                Official Post
              </span>
            </div>
          )}

          {/* Author */}
          <div className="px-6 pt-4 flex items-center justify-between gap-4">
            {isOfficialPost ? (
              /* SONCAR Team author display — no profile link */
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shrink-0 shadow-md shadow-amber-900/40">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-amber-200">SONCAR Team</div>
                  <div className="text-xs text-neutral-500">
                    {new Date(post.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            ) : (
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
                    <MemberBadge role={post.author.role} tier={post.author.tier} />
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
            )}
            {!isOfficialPost && user && user.id !== post.user_id && (
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
                <MentionText text={post.content} />
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
                      <MentionText text={post.ingredients} />
                    </p>
                  </div>
                )}
                {post.method && (
                  <div>
                    <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-2">
                      Method
                    </h2>
                    <p className="text-neutral-300 text-sm whitespace-pre-wrap leading-relaxed">
                      <MentionText text={post.method} />
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reactions + Share */}
          <div className="px-6 py-4 border-t border-white/10 flex items-center gap-4">
            <ReactionButton
              postId={post.id}
              initialCount={post.reaction_count}
              initialReaction={userPostReaction}
              topReactions={post.top_reactions}
              currentUserId={user?.id ?? null}
            />
            <ShareButton
              postId={post.id}
              postContent={post.content}
              userRole={userRole}
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
