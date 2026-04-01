"use client";

import { useState } from "react";
import Link from "next/link";
import type { FlagRecord } from "./AdminTabs";
import DeleteButton from "./DeleteButton";

export default function FlaggedTab({ flags: initialFlags }: { flags: FlagRecord[] }) {
  const [flags, setFlags] = useState(initialFlags);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const filtered = filter.trim()
    ? flags.filter((f) => {
        const q = filter.toLowerCase();
        return (
          (f.post_content?.toLowerCase() ?? "").includes(q) ||
          f.post_author.toLowerCase().includes(q) ||
          (f.reason?.toLowerCase() ?? "").includes(q)
        );
      })
    : flags;

  async function clearFlag(flagId: string, postId: string) {
    setLoadingId(flagId);
    await fetch("/api/admin/community/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, action: "unflag" }),
    });
    setFlags((prev) => prev.filter((f) => f.id !== flagId));
    setLoadingId(null);
  }

  if (flags.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold mb-4">Flagged Posts</h2>
        <p className="text-neutral-500 text-sm">No flagged posts.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Flagged Posts ({flags.length})</h2>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search content or author…"
          className="ml-auto rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-sm outline-none focus:border-white/30 w-56"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((flag) => (
          <div
            key={flag.id}
            className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3 flex items-start gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-neutral-400 uppercase">
                  {flag.post_type}
                </span>
                <span className="text-xs text-neutral-500">
                  by {flag.post_author} ·{" "}
                  {new Date(flag.created_at).toLocaleDateString("en-GB")}
                </span>
              </div>
              <p className="text-sm text-neutral-300 truncate">
                {flag.post_content ?? (flag.post_image_url ? "[photo]" : "[no content]")}
              </p>
              {flag.reason && (
                <p className="text-xs text-rose-300 mt-1">Reason: {flag.reason}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/community/${flag.post_id}`}
                target="_blank"
                className="text-xs text-neutral-400 hover:text-white"
              >
                View
              </Link>
              <button
                disabled={loadingId === flag.id}
                onClick={() => clearFlag(flag.id, flag.post_id)}
                className="text-xs px-2 py-1 rounded bg-white/5 text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition disabled:opacity-50"
              >
                {loadingId === flag.id ? "…" : "Clear"}
              </button>
              <DeleteButton
                type="post"
                id={flag.post_id}
                onDeleted={() => setFlags((prev) => prev.filter((f) => f.post_id !== flag.post_id))}
              />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-neutral-500 text-sm">No flagged posts match your search.</div>
        )}
      </div>
    </section>
  );
}
