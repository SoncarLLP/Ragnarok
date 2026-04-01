"use client";

import { useState } from "react";

const REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "off_topic", label: "Off-topic" },
];

export default function FlagButton({
  postId,
  commentId,
}: {
  postId?: string;
  commentId?: string;
}) {
  const [state, setState] = useState<"idle" | "confirm" | "loading" | "done">("idle");
  const [reason, setReason] = useState("spam");

  async function submit() {
    setState("loading");
    await fetch("/api/community/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        post_id: postId,
        comment_id: commentId,
        reason,
      }),
    }).catch(() => {});
    setState("done");
  }

  if (state === "done") {
    return <span className="text-xs text-amber-400 px-1">Reported</span>;
  }

  if (state === "confirm" || state === "loading") {
    return (
      <span className="flex items-center gap-1">
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={state === "loading"}
          className="text-xs rounded px-1 py-0.5"
          style={{ background: "var(--nrs-card)", border: "1px solid var(--nrs-border-subtle)", color: "var(--nrs-text-body)" }}
        >
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <button
          onClick={submit}
          disabled={state === "loading"}
          className="text-xs px-2 py-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/40 transition disabled:opacity-50"
        >
          {state === "loading" ? "…" : "Report"}
        </button>
        <button
          onClick={() => setState("idle")}
          disabled={state === "loading"}
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
      className="text-xs px-2 py-1 rounded bg-white/5 text-neutral-500 hover:text-amber-400 hover:bg-amber-500/10 transition"
      title="Report this content"
    >
      🚩
    </button>
  );
}
