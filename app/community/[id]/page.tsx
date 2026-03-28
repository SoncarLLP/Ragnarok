import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { normalisePost, POST_SELECT } from "@/lib/community";
import LikeButton from "../LikeButton";
import FollowButton from "../FollowButton";
import CommentSection from "./CommentSection";
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

  const { data: rawComments } = await supabase
    .from("comments")
    .select("id, post_id, user_id, content, created_at, profiles!comments_user_id_fkey(full_name, username, avatar_url)")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  const comments: CommentData[] = (rawComments ?? []).map((c) => ({
    id: c.id,
    post_id: c.post_id,
    user_id: c.user_id,
    content: c.content,
    created_at: c.created_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profiles: Array.isArray(c.profiles) ? (c.profiles as any)[0] : c.profiles,
  }));

  let isLiked = false;
  let isFollowing = false;

  if (user) {
    const [{ data: likeRow }, { data: followRow }] = await Promise.all([
      supabase
        .from("likes")
        .select("post_id")
        .eq("post_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("following_id", post.user_id)
        .maybeSingle(),
    ]);
    isLiked = !!likeRow;
    isFollowing = !!followRow;
  }

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
                <div className="font-medium">{authorName}</div>
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

          {/* Likes */}
          <div className="px-6 py-4 border-t border-white/10">
            <LikeButton
              postId={post.id}
              initialCount={post.like_count}
              initialLiked={isLiked}
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
