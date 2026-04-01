"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import MemberBadge from "@/components/MemberBadge";
import ReactionButton from "../ReactionButton";
import MentionTextarea from "../MentionTextarea";
import MentionText from "../MentionText";
import FlagButton from "../FlagButton";
import type { CommentData } from "@/lib/community";
import { getDisplayName } from "@/lib/display-name";

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

    // ── Content moderation check ──────────────────────────────────────
    const modRes = await fetch("/api/moderation/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim(), contentType: "comment" }),
    });
    const modData = await modRes.json();
    if (!modData.allowed) {
      setError(modData.reason ?? "Your comment was blocked by our moderation system.");
      setSubmitting(false);
      return;
    }

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
      .select(
        "id, post_id, user_id, content, created_at, profiles!comments_user_id_fkey(full_name, username, avatar_url, role, tier, display_name_preference)"
      )
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
          reaction_count: 0,
          top_reactions: [],
          user_reaction: null,
        },
      ]);

      // Process @mentions (fire-and-forget)
      if (content.trim().includes("@")) {
        fetch("/api/community/mentions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: content.trim(), comment_id: row.id }),
        }).catch(() => {});
      }

      setContent("");
    }
    setSubmitting(false);
  }

  return (
    <div id="comments">
      <h2 className="text-lg font-semibold mb-4">Comments ({comments.length})</h2>

      {currentUserId ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <MentionTextarea
            value={content}
            onChange={setContent}
            placeholder="Write a comment… use @ to mention a member"
            rows={3}
            className="nrs-textarea w-full"
          />
          {error && <p className="text-rose-400 text-xs mt-1">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="mt-2 px-4 py-2 rounded-lg disabled:opacity-50 text-sm font-medium transition"
            style={{ background: "var(--nrs-btn-bg)", border: "1px solid var(--nrs-btn-border)", color: "var(--nrs-text-body)" }}
          >
            {submitting ? "Posting…" : "Post comment"}
          </button>
        </form>
      ) : (
        <div className="mb-6 p-4 rounded-lg text-sm text-center" style={{ background: "var(--nrs-card)", border: "1px solid var(--nrs-border-subtle)", color: "var(--nrs-text-muted)" }}>
          <Link href="/auth/login" className="font-medium hover:underline" style={{ color: "var(--nrs-accent)" }}>
            Sign in
          </Link>{" "}
          or{" "}
          <Link href="/auth/signup" className="font-medium hover:underline" style={{ color: "var(--nrs-accent)" }}>
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
            const name = c.profiles ? getDisplayName(c.profiles) : "Member";
            const href = c.profiles?.username
              ? `/account/profile/${c.profiles.username}`
              : "#";
            return (
              <div key={c.id} className="flex gap-3">
                <Link href={href} className="shrink-0">
                  {c.profiles?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
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
                <div className="flex-1 rounded-lg px-3 py-2.5" style={{ background: "var(--nrs-card)", border: "1px solid var(--nrs-border-subtle)" }}>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Link
                      href={href}
                      className="text-sm font-medium hover:underline flex items-center gap-1 flex-wrap"
                      style={{ color: "var(--nrs-text-body)" }}
                    >
                      {name}
                      <MemberBadge role={c.profiles?.role} tier={c.profiles?.tier} />
                    </Link>
                    <span className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--nrs-text-body)" }}>
                    <MentionText text={c.content} />
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <ReactionButton
                      commentId={c.id}
                      initialCount={c.reaction_count}
                      initialReaction={c.user_reaction}
                      topReactions={c.top_reactions}
                      currentUserId={currentUserId}
                    />
                    {currentUserId && currentUserId !== c.user_id && (
                      <FlagButton commentId={c.id} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
