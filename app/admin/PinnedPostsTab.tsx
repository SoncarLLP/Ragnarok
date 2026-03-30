"use client";

import { useState } from "react";
import Link from "next/link";

export type PinnedPostRecord = {
  id: string;
  content: string | null;
  type: string;
  created_at: string;
  pinned_until: string | null;
  pin_indefinite: boolean;
  categories: string[];
  // Only populated for super_admins
  creator_name: string | null;
  creator_username: string | null;
};

function pinTimeRemaining(record: PinnedPostRecord): string {
  if (record.pin_indefinite) return "Indefinite";
  if (!record.pinned_until) return "—";
  const ms = new Date(record.pinned_until).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 1) return `${days} days`;
  if (days === 1) return "1 day";
  if (hours > 1) return `${hours} hours`;
  return "< 1 hour";
}

function pinExpiryDate(record: PinnedPostRecord): string {
  if (record.pin_indefinite) return "Never expires";
  if (!record.pinned_until) return "—";
  return new Date(record.pinned_until).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function UnpinButton({ postId, onUnpinned }: { postId: string; onUnpinned: () => void }) {
  const [state, setState] = useState<"idle" | "confirm" | "loading">("idle");

  async function doUnpin() {
    setState("loading");
    const res = await fetch("/api/admin/posts/unpin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId }),
    });
    if (res.ok) {
      onUnpinned();
    } else {
      const data = await res.json();
      alert(data.error ?? "Failed to unpin");
      setState("idle");
    }
  }

  if (state === "confirm") {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={doUnpin}
          className="text-xs px-2 py-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/40 transition"
        >
          Confirm unpin
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
      className="text-xs px-3 py-1 rounded bg-white/5 text-neutral-400 hover:text-amber-300 hover:bg-amber-500/10 border border-white/10 transition disabled:opacity-50"
    >
      {state === "loading" ? "Unpinning…" : "Unpin"}
    </button>
  );
}

export default function PinnedPostsTab({
  posts,
  currentUserRole,
}: {
  posts: PinnedPostRecord[];
  currentUserRole: "admin" | "super_admin";
}) {
  const [localPosts, setLocalPosts] = useState(posts);

  function handleUnpinned(postId: string) {
    setLocalPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  if (localPosts.length === 0) {
    return (
      <div className="text-center py-16 text-neutral-500">
        <p className="text-4xl mb-3">📌</p>
        <p>No posts are currently pinned.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-400 mb-4">
        {localPosts.length} pinned post{localPosts.length !== 1 ? "s" : ""}
        {currentUserRole === "admin" && (
          <span className="ml-2 text-neutral-600">
            — contact a super admin to unpin posts
          </span>
        )}
      </p>

      {localPosts.map((post) => {
        const expired =
          !post.pin_indefinite &&
          post.pinned_until &&
          new Date(post.pinned_until) < new Date();

        return (
          <div
            key={post.id}
            className={`rounded-xl border p-4 flex items-start gap-4 ${
              expired
                ? "border-white/5 bg-white/3 opacity-60"
                : "border-amber-500/20 bg-slate-800/50"
            }`}
          >
            {/* Pin icon */}
            <span className="text-lg shrink-0 mt-0.5">{expired ? "⏰" : "📌"}</span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/25 font-medium">
                  SONCAR Team
                </span>
                <span className="text-xs text-neutral-500 capitalize">{post.type}</span>
                {post.categories.length > 0 && (
                  <span className="text-xs text-neutral-500">
                    {post.categories.slice(0, 2).join(", ")}
                  </span>
                )}
              </div>

              {post.content && (
                <p className="text-sm text-neutral-200 line-clamp-2 mb-2">{post.content}</p>
              )}
              {!post.content && (
                <p className="text-sm text-neutral-500 italic mb-2">[photo post]</p>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                <span>
                  Posted:{" "}
                  {new Date(post.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span>
                  Pin expires: <span className={expired ? "text-rose-400" : "text-amber-300/80"}>{pinExpiryDate(post)}</span>
                </span>
                <span>
                  Remaining: <span className={expired ? "text-rose-400" : "text-neutral-300"}>{pinTimeRemaining(post)}</span>
                </span>
              </div>

              {/* Creator info — super_admin only */}
              {currentUserRole === "super_admin" && post.creator_name && (
                <div className="mt-2 text-xs text-neutral-500">
                  Created by:{" "}
                  <span className="text-neutral-300">{post.creator_name}</span>
                  {post.creator_username && (
                    <span className="text-neutral-600"> @{post.creator_username}</span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/community/${post.id}`}
                target="_blank"
                className="text-xs px-3 py-1 rounded bg-white/5 text-neutral-400 hover:text-white border border-white/10 transition"
              >
                View →
              </Link>
              {currentUserRole === "super_admin" && (
                <UnpinButton
                  postId={post.id}
                  onUnpinned={() => handleUnpinned(post.id)}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
