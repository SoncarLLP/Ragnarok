"use client";

import { useState } from "react";
import Link from "next/link";
import DeleteButton from "./DeleteButton";
import { getDisplayName } from "@/lib/display-name";

type Post = {
  id: string;
  type: string;
  content: string | null;
  image_url: string | null;
  categories: string[];
  created_at: string;
  profiles: { full_name: string | null; username: string | null; display_name_preference?: string | null } | { full_name: string | null; username: string | null; display_name_preference?: string | null }[] | null;
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  post_id: string;
  profiles: { full_name: string | null; username: string | null; display_name_preference?: string | null } | { full_name: string | null; username: string | null; display_name_preference?: string | null }[] | null;
};

function authorName(profiles: Post["profiles"]): string {
  const p = Array.isArray(profiles) ? profiles[0] : profiles;
  if (!p) return "Unknown";
  return getDisplayName(p);
}

export default function ModerationSection({
  posts: initialPosts,
  comments: initialComments,
  currentUserRole,
}: {
  posts: Post[];
  comments: Comment[];
  currentUserRole: "admin" | "super_admin";
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [comments, setComments] = useState(initialComments);
  const [flagging, setFlagging] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());

  async function flagPost(postId: string) {
    setFlagging(postId);
    await fetch("/api/admin/community/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, action: "flag" }),
    });
    setFlagged((prev) => new Set([...prev, postId]));
    setFlagging(null);
  }

  return (
    <section>
      {!process.env.NEXT_PUBLIC_SUPABASE_URL ? (
        <p className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>Supabase not configured.</p>
      ) : (
        <div className="space-y-8">
          {/* Posts */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--nrs-text-body)" }}>
              Recent Posts ({posts.length})
            </h3>
            {posts.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>No posts yet.</p>
            ) : (
              <div className="space-y-2">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-start justify-between gap-4 rounded-lg px-4 py-3"
                    style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs px-1.5 py-0.5 rounded uppercase" style={{ background: "var(--nrs-panel)", color: "var(--nrs-text-muted)" }}>
                          {post.type}
                        </span>
                        <span className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                          by {authorName(post.profiles)} ·{" "}
                          {new Date(post.created_at).toLocaleDateString("en-GB")}
                        </span>
                      </div>
                      <p className="text-sm truncate" style={{ color: "var(--nrs-text-body)" }}>
                        {post.content ?? (post.image_url ? "[photo]" : "[no content]")}
                      </p>
                      {post.categories.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {post.categories.map((c) => (
                            <span key={c} className="text-xs" style={{ color: "var(--nrs-accent)" }}>
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/community/${post.id}`}
                        className="text-xs transition-colors"
                        style={{ color: "var(--nrs-text-muted)" }}
                        target="_blank"
                      >
                        View
                      </Link>
                      {!flagged.has(post.id) ? (
                        <button
                          disabled={flagging === post.id}
                          onClick={() => flagPost(post.id)}
                          className="text-xs px-2 py-1 rounded disabled:opacity-50 transition"
                          style={{ background: "var(--nrs-card)", color: "var(--nrs-text-muted)", border: "1px solid var(--nrs-border-subtle)" }}
                        >
                          {flagging === post.id ? "…" : "Flag"}
                        </button>
                      ) : (
                        <span className="text-xs px-2 py-1" style={{ color: "var(--nrs-accent)" }}>Flagged</span>
                      )}
                      <DeleteButton
                        type="post"
                        id={post.id}
                        onDeleted={() =>
                          setPosts((prev) => prev.filter((p) => p.id !== post.id))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--nrs-text-body)" }}>
              Recent Comments ({comments.length})
            </h3>
            {comments.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>No comments yet.</p>
            ) : (
              <div className="space-y-2">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex items-start justify-between gap-4 rounded-lg px-4 py-3"
                    style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
                  >
                    <div className="min-w-0">
                      <div className="text-xs mb-0.5" style={{ color: "var(--nrs-text-muted)" }}>
                        by {authorName(comment.profiles)} ·{" "}
                        {new Date(comment.created_at).toLocaleDateString("en-GB")} ·{" "}
                        <Link
                          href={`/community/${comment.post_id}#comments`}
                          className="hover:underline"
                          target="_blank"
                          style={{ color: "var(--nrs-text-muted)" }}
                        >
                          on post
                        </Link>
                      </div>
                      <p className="text-sm truncate" style={{ color: "var(--nrs-text-body)" }}>{comment.content}</p>
                    </div>
                    <DeleteButton
                      type="comment"
                      id={comment.id}
                      onDeleted={() =>
                        setComments((prev) => prev.filter((c) => c.id !== comment.id))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
