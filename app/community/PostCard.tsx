"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import ReactionButton from "./ReactionButton";
import FollowButton from "./FollowButton";
import RoleBadge from "@/components/RoleBadge";
import TierBadge from "@/components/TierBadge";
import type { PostData } from "@/lib/community";

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

function FlagButton({ postId }: { postId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  async function flag() {
    setState("loading");
    await fetch("/api/admin/community/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, action: "flag" }),
    });
    setState("done");
  }
  if (state === "done") return <span className="text-xs text-amber-400 px-1">Flagged</span>;
  return (
    <button
      onClick={flag}
      disabled={state === "loading"}
      className="text-xs px-2 py-1 rounded bg-white/5 text-neutral-500 hover:text-amber-400 hover:bg-amber-500/10 transition disabled:opacity-50"
      title="Flag for review"
    >
      {state === "loading" ? "…" : "🚩"}
    </button>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return <img src={url} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center text-xs font-semibold shrink-0">
      {name.slice(0, 2).toUpperCase()}
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
}: {
  post: PostData;
  userReaction: string | null;
  isFollowing: boolean;
  currentUserId: string | null;
  isAdmin?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [deleted, setDeleted] = useState(false);
  if (deleted) return null;

  function handleShare() {
    navigator.clipboard.writeText(`${window.location.origin}/community/${post.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const authorName = post.author.full_name || post.author.username || "Member";
  const authorHref = post.author.username
    ? `/account/profile/${post.author.username}`
    : "#";

  return (
    <article className="rounded-xl border border-white/10 bg-white/5 overflow-hidden hover:border-white/20 transition">
      {/* Author */}
      <div className="px-4 pt-4 flex items-center justify-between gap-2">
        <Link href={authorHref} className="flex items-center gap-2 min-w-0">
          <Avatar url={post.author.avatar_url} name={authorName} />
          <div className="min-w-0">
            <div className="text-sm font-medium flex items-center gap-1 flex-wrap">
                {authorName}
                <RoleBadge role={post.author.role} />
                <TierBadge tier={post.author.tier} />
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
              className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300"
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
          <div className={`px-4 ${post.type === "photo" ? "pt-3" : ""} text-sm text-neutral-200 leading-relaxed`}>
            {post.type === "recipe" && (
              <div className="text-xs text-amber-400 font-medium uppercase tracking-wide mb-1">
                Recipe
              </div>
            )}
            <p className="line-clamp-5">{post.content}</p>
            {post.type === "recipe" && post.ingredients && (
              <p className="mt-2 text-xs text-neutral-400 line-clamp-2">
                <span className="text-neutral-300 font-medium">Ingredients: </span>
                {post.ingredients}
              </p>
            )}
          </div>
        )}
      </Link>

      {/* Footer */}
      <div className="px-4 py-3 mt-3 border-t border-white/5 flex items-center gap-4">
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

        {isAdmin && <FlagButton postId={post.id} />}
        {isAdmin && <DeleteButton postId={post.id} onDeleted={() => setDeleted(true)} />}

        <button
          onClick={handleShare}
          className={`${isAdmin ? "" : "ml-auto"} flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 1 1 0-2.684m0 2.684 6.632 3.316m-6.632-6 6.632-3.316m0 0a3 3 0 1 0 5.367-2.684 3 3 0 0 0-5.367 2.684zm0 9.316a3 3 0 1 0 5.368 2.684 3 3 0 0 0-5.368-2.684z"
            />
          </svg>
          {copied ? "Copied!" : "Share"}
        </button>
      </div>
    </article>
  );
}
