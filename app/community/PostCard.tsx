"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import LikeButton from "./LikeButton";
import FollowButton from "./FollowButton";
import type { PostData } from "@/lib/community";

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
  isLiked,
  isFollowing,
  currentUserId,
}: {
  post: PostData;
  isLiked: boolean;
  isFollowing: boolean;
  currentUserId: string | null;
}) {
  const [copied, setCopied] = useState(false);

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
            <div className="text-sm font-medium truncate">{authorName}</div>
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
        <LikeButton
          postId={post.id}
          initialCount={post.like_count}
          initialLiked={isLiked}
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

        <button
          onClick={handleShare}
          className="ml-auto flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition"
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
