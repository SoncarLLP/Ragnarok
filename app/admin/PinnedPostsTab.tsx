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
          className="text-xs px-2 py-1 rounded transition"
          style={{ background: "var(--nrs-panel)", color: "var(--nrs-text-muted)" }}
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
      className="text-xs px-3 py-1 rounded transition disabled:opacity-50"
      style={{ background: "var(--nrs-panel)", color: "var(--nrs-text-muted)", border: "1px solid var(--nrs-border-subtle)" }}
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
  const [filter, setFilter] = useState("");

  function handleUnpinned(postId: string) {
    setLocalPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  const filteredPosts = filter.trim()
    ? localPosts.filter((p) => {
        const q = filter.toLowerCase();
        return (
          (p.content?.toLowerCase() ?? "").includes(q) ||
          (p.creator_name?.toLowerCase() ?? "").includes(q) ||
          (p.creator_username?.toLowerCase() ?? "").includes(q) ||
          p.categories.some((c) => c.toLowerCase().includes(q))
        );
      })
    : localPosts;

  if (localPosts.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: "var(--nrs-text-muted)" }}>
        <p className="text-4xl mb-3">📌</p>
        <p>No posts are currently pinned.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <p className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>
          {localPosts.length} pinned post{localPosts.length !== 1 ? "s" : ""}
          {currentUserRole === "admin" && (
            <span className="ml-2" style={{ color: "var(--nrs-text-muted)", opacity: 0.6 }}>
              — contact a super admin to unpin posts
            </span>
          )}
        </p>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search pinned posts…"
          className="ml-auto rounded-md px-3 py-1.5 text-sm outline-none w-56 transition"
          style={{ background: "var(--nrs-card)", border: "1px solid var(--nrs-border)", color: "var(--nrs-text-body)" }}
        />
      </div>

      {filteredPosts.map((post) => {
        const expired =
          !post.pin_indefinite &&
          post.pinned_until &&
          new Date(post.pinned_until) < new Date();

        return (
          <div
            key={post.id}
            className={`rounded-xl p-4 flex items-start gap-4 ${expired ? "opacity-60" : ""}`}
            style={
              expired
                ? { border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-panel)" }
                : { border: "1px solid var(--nrs-accent-border)", background: "var(--nrs-accent-dim)" }
            }
          >
            {/* Pin icon */}
            <span className="text-lg shrink-0 mt-0.5">{expired ? "⏰" : "📌"}</span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)", border: "1px solid var(--nrs-accent-border)" }}
                >
                  Ragnarök Team
                </span>
                <span className="text-xs capitalize" style={{ color: "var(--nrs-text-muted)" }}>{post.type}</span>
                {post.categories.length > 0 && (
                  <span className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                    {post.categories.slice(0, 2).join(", ")}
                  </span>
                )}
              </div>

              {post.content && (
                <p className="text-sm line-clamp-2 mb-2" style={{ color: "var(--nrs-text-body)" }}>{post.content}</p>
              )}
              {!post.content && (
                <p className="text-sm italic mb-2" style={{ color: "var(--nrs-text-muted)" }}>[photo post]</p>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                <span>
                  Posted:{" "}
                  {new Date(post.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span>
                  Pin expires:{" "}
                  <span style={{ color: expired ? "#f87171" : "var(--nrs-accent)" }}>{pinExpiryDate(post)}</span>
                </span>
                <span>
                  Remaining:{" "}
                  <span style={{ color: expired ? "#f87171" : "var(--nrs-text-body)" }}>{pinTimeRemaining(post)}</span>
                </span>
              </div>

              {/* Creator info — super_admin only */}
              {currentUserRole === "super_admin" && post.creator_name && (
                <div className="mt-2 text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                  Created by:{" "}
                  <span style={{ color: "var(--nrs-text-body)" }}>{post.creator_name}</span>
                  {post.creator_username && (
                    <span style={{ color: "var(--nrs-text-muted)", opacity: 0.7 }}> @{post.creator_username}</span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/community/${post.id}`}
                target="_blank"
                className="text-xs px-3 py-1 rounded transition"
                style={{ background: "var(--nrs-panel)", color: "var(--nrs-text-muted)", border: "1px solid var(--nrs-border-subtle)" }}
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
      {filteredPosts.length === 0 && (
        <p className="text-center py-10 text-sm" style={{ color: "var(--nrs-text-muted)" }}>No pinned posts match your search.</p>
      )}
    </div>
  );
}
