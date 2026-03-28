"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { CommentData } from "@/lib/community";

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function CommentSection({
  postId,
  comments: initial,
  currentUserId,
}: {
  postId: string;
  comments: CommentData[];
  currentUserId: string | null;
}) {
  const [comments, setComments] = useState(initial);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setSubmitting(false);
      return;
    }

    const { data: row, error: err } = await supabase
      .from("comments")
      .insert({ post_id: postId, user_id: user.id, content: content.trim() })
      .select("id, post_id, user_id, content, created_at, profiles(full_name, username, avatar_url)")
      .single();

    if (err || !row) {
      setError(err?.message ?? "Failed to post comment");
    } else {
      setComments((prev) => [
        ...prev,
        {
          id: row.id,
          post_id: row.post_id,
          user_id: row.user_id,
          content: row.content,
          created_at: row.created_at,
          profiles: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
        },
      ]);
      setContent("");
    }
    setSubmitting(false);
  }

  return (
    <div id="comments">
      <h2 className="text-lg font-semibold mb-4">Comments ({comments.length})</h2>

      {currentUserId ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment…"
            rows={3}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/30 resize-none"
          />
          {error && <p className="text-rose-400 text-xs mt-1">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="mt-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 text-sm transition"
          >
            {submitting ? "Posting…" : "Post comment"}
          </button>
        </form>
      ) : (
        <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10 text-sm text-center text-neutral-400">
          <Link href="/auth/login" className="text-amber-400 hover:underline">
            Sign in
          </Link>{" "}
          or{" "}
          <Link href="/auth/signup" className="text-amber-400 hover:underline">
            create an account
          </Link>{" "}
          to leave a comment
        </div>
      )}

      {comments.length === 0 ? (
        <p className="text-neutral-500 text-sm">No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => {
            const name =
              c.profiles?.full_name || c.profiles?.username || "Member";
            const href = c.profiles?.username
              ? `/account/profile/${c.profiles.username}`
              : "#";
            return (
              <div key={c.id} className="flex gap-3">
                <Link href={href} className="shrink-0">
                  {c.profiles?.avatar_url ? (
                    <img
                      src={c.profiles.avatar_url}
                      alt={name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center text-xs font-semibold">
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="flex-1 bg-white/5 rounded-lg px-3 py-2.5">
                  <div className="flex items-baseline gap-2 mb-1">
                    <Link href={href} className="text-sm font-medium hover:underline">
                      {name}
                    </Link>
                    <span className="text-xs text-neutral-500">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-neutral-300 whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
