"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import ReactionButton from "./ReactionButton";
import ShareButton from "./ShareButton";
import FollowButton from "./FollowButton";
import MentionText from "./MentionText";
import MemberBadge from "@/components/MemberBadge";
import FlagButton from "./FlagButton";
import type { PostData } from "@/lib/community";
import { isPostPinned, pinTimeRemaining } from "@/lib/community";
import { getDisplayName } from "@/lib/display-name";

function DeleteButton({ postId, onDeleted }: { postId: string; onDeleted: () => void }) {
  const [state, setState] = useState<"idle" | "loading" | "confirm">("idle");
  async function doDelete() {
    setState("loading");
    await fetch("/api/admin/community/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "post", id: postId }),
    });
    onDeleted();
  }
  if (state === "confirm") {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={doDelete}
          className="text-xs px-2 py-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/40 transition"
        >
          Confirm
        </button>
        <button
          onClick={() => setState("idle")}
          className="text-xs px-2 py-1 rounded bg-white/5 text-neutral-500 hover:text-white transition"
        >
          Cancel
        </button>
      </span>
    );
  }
  return (
    <button
      onClick={() => setState("confirm")}
      disabled={state === "loading"}
      className="text-xs px-2 py-1 rounded bg-white/5 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-50"
      title="Delete post"
    >
      {state === "loading" ? "…" : "🗑️"}
    </button>
  );
}

function PersonalAvatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return <img src={url} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center text-xs font-semibold shrink-0">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

/** Official Ragnarök Team avatar — amber shield icon */
function SoncarTeamAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shrink-0 shadow-md shadow-amber-900/40">
      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
      </svg>
    </div>
  );
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function PostCard({
  post,
  userReaction,
  isFollowing,
  currentUserId,
  isAdmin = false,
  userRole,
}: {
  post: PostData;
  userReaction: string | null;
  isFollowing: boolean;
  currentUserId: string | null;
  isAdmin?: boolean;
  userRole?: string | null;
}) {
  const [deleted, setDeleted] = useState(false);
  if (deleted) return null;

  const isOfficialPost = !!post.post_as_role;
  const pinned = isPostPinned(post);
  const pinLabel = pinned ? pinTimeRemaining(post) : null;

  // Only super_admin can delete official posts
  const canDelete = isAdmin && (!isOfficialPost || userRole === "super_admin");

  const authorName = getDisplayName(post.author);
  const authorHref = !isOfficialPost && post.author.username
    ? `/account/profile/${post.author.username}`
    : "#";

  if (isOfficialPost) {
    // ── Official Ragnarök Team post ─────────────────────────────────
    return (
      <article className="rounded-xl border border-amber-500/25 bg-gradient-to-b from-slate-800/70 to-slate-900/80 overflow-hidden shadow-lg shadow-black/30">
        {/* Pinned banner */}
        {pinned && (
          <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500/15 border-b border-amber-500/20 text-xs text-amber-300">
            <span>📌</span>
            <span>{pinLabel}</span>
          </div>
        )}

        {/* Official Post badge */}
        <div className="px-4 pt-3 pb-0">
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 font-medium">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
            Official Post
          </span>
        </div>

        {/* Author — always Ragnarök Team */}
        <div className="px-4 pt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <SoncarTeamAvatar />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-amber-200">Ragnarök Team</div>
              <div className="text-xs text-neutral-500">{timeAgo(post.created_at)}</div>
            </div>
          </div>
        </div>

        {/* Categories */}
        {post.categories.length > 0 && (
          <div className="px-4 pt-2 flex flex-wrap gap-1">
            {post.categories.map((cat) => (
              <span
                key={cat}
                className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)" }}
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Body */}
        <Link href={`/community/${post.id}`} className="block mt-3">
          {post.type === "photo" && post.image_url && (
            <Image
              src={post.image_url}
              alt="Post photo"
              width={600}
              height={400}
              className="w-full object-cover"
            />
          )}
          {post.content && (
            <div className={`px-4 ${post.type === "photo" ? "pt-3" : ""} text-sm leading-relaxed`} style={{ color: "var(--nrs-text-body)" }}>
              {post.type === "recipe" && (
                <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--nrs-accent)" }}>
                  Recipe
                </div>
              )}
              <p className="line-clamp-5">
                <MentionText text={post.content ?? ""} linkable={false} />
              </p>
              {post.type === "recipe" && post.ingredients && (
                <p className="mt-2 text-xs line-clamp-2" style={{ color: "var(--nrs-text-muted)" }}>
                  <span className="font-medium" style={{ color: "var(--nrs-text-body)" }}>Ingredients: </span>
                  {post.ingredients}
                </p>
              )}
            </div>
          )}
        </Link>

        {/* Footer */}
        <div className="px-4 py-3 mt-3 border-t border-amber-500/10 flex items-center gap-4">
          <ReactionButton
            postId={post.id}
            initialCount={post.reaction_count}
            initialReaction={userReaction}
            topReactions={post.top_reactions}
            currentUserId={currentUserId}
          />
          <Link
            href={`/community/${post.id}#comments`}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {post.comment_count}
          </Link>

          {canDelete && (
            <span className="flex items-center gap-1">
              <DeleteButton postId={post.id} onDeleted={() => setDeleted(true)} />
              <span className="text-xs text-neutral-600 hidden sm:inline">protected</span>
            </span>
          )}
          {isAdmin && !canDelete && post.post_as_role && (
            <span className="text-xs text-neutral-600 hidden sm:inline">protected</span>
          )}

          <div className="ml-auto">
            <ShareButton postId={post.id} postContent={post.content} userRole={userRole} />
          </div>
        </div>
      </article>
    );
  }

  // ── Regular member post ───────────────────────────────────────────
  return (
    <article className="nrs-card rounded-xl overflow-hidden transition">
      {/* Author */}
      <div className="px-4 pt-4 flex items-center justify-between gap-2">
        <Link href={authorHref} className="flex items-center gap-2 min-w-0">
          <PersonalAvatar url={post.author.avatar_url} name={authorName} />
          <div className="min-w-0">
            <div className="text-sm font-medium flex items-center gap-1 flex-wrap">
                {authorName}
                <MemberBadge role={post.author.role} tier={post.author.tier} />
              </div>
            <div className="text-xs text-neutral-500">{timeAgo(post.created_at)}</div>
          </div>
        </Link>
        {currentUserId && currentUserId !== post.user_id && (
          <FollowButton
            targetUserId={post.user_id}
            initialFollowing={isFollowing}
            currentUserId={currentUserId}
            compact
          />
        )}
      </div>

      {/* Categories */}
      {post.categories.length > 0 && (
        <div className="px-4 pt-2 flex flex-wrap gap-1">
          {post.categories.map((cat) => (
            <span
              key={cat}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)" }}
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Body — links to detail page */}
      <Link href={`/community/${post.id}`} className="block mt-3">
        {post.type === "photo" && post.image_url && (
          <Image
            src={post.image_url}
            alt="Post photo"
            width={600}
            height={400}
            className="w-full object-cover"
          />
        )}
        {post.content && (
          <div className={`px-4 ${post.type === "photo" ? "pt-3" : ""} text-sm leading-relaxed`} style={{ color: "var(--nrs-text-body)" }}>
            {post.type === "recipe" && (
              <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--nrs-accent)" }}>
                Recipe
              </div>
            )}
            <p className="line-clamp-5"><MentionText text={post.content ?? ""} linkable={false} /></p>
            {post.type === "recipe" && post.ingredients && (
              <p className="mt-2 text-xs line-clamp-2" style={{ color: "var(--nrs-text-muted)" }}>
                <span className="font-medium" style={{ color: "var(--nrs-text-body)" }}>Ingredients: </span>
                {post.ingredients}
              </p>
            )}
          </div>
        )}
      </Link>

      {/* Footer */}
      <div className="px-4 py-3 mt-3 flex items-center gap-4" style={{ borderTop: "1px solid var(--nrs-border-subtle)" }}>
        <ReactionButton
          postId={post.id}
          initialCount={post.reaction_count}
          initialReaction={userReaction}
          topReactions={post.top_reactions}
          currentUserId={currentUserId}
        />

        <Link
          href={`/community/${post.id}#comments`}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {post.comment_count}
        </Link>

        {currentUserId && currentUserId !== post.user_id && (
          <FlagButton postId={post.id} />
        )}
        {canDelete && <DeleteButton postId={post.id} onDeleted={() => setDeleted(true)} />}

        <div className={isAdmin ? "" : "ml-auto"}>
          <ShareButton
            postId={post.id}
            postContent={post.content}
            userRole={userRole}
          />
        </div>
      </div>
    </article>
  );
}
