"use client";

import { useState } from "react";
import type { MemberRecord } from "./AdminTabs";

function fmtMemberId(id: number | null) {
  return id != null ? String(id).padStart(11, "0") : "—";
}

export default function BannedTab({ members: initial }: { members: MemberRecord[] }) {
  const [members, setMembers] = useState(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const filtered = filter.trim()
    ? members.filter((m) => {
        const q = filter.toLowerCase();
        return (
          (m.full_name?.toLowerCase() ?? "").includes(q) ||
          (m.username?.toLowerCase() ?? "").includes(q) ||
          m.email.toLowerCase().includes(q) ||
          fmtMemberId(m.member_id).includes(q)
        );
      })
    : members;

  async function unban(userId: string) {
    setLoadingId(userId);
    await fetch("/api/admin/members/ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "unban" }),
    });
    setMembers((prev) => prev.filter((m) => m.id !== userId));
    setLoadingId(null);
  }

  if (members.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold mb-4">Banned Members</h2>
        <p className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>No banned members.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Banned Members ({members.length})</h2>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search name, email, or ID…"
          className="ml-auto rounded-md px-3 py-1.5 text-sm outline-none w-56 transition"
          style={{ background: "var(--nrs-card)", border: "1px solid var(--nrs-border)", color: "var(--nrs-text-body)" }}
        />
      </div>

      <div className="space-y-2">
        {filtered.map((m) => (
          <div
            key={m.id}
            className="rounded-lg px-4 py-3 flex items-center justify-between gap-4"
            style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                  {fmtMemberId(m.member_id)}
                </span>
                <span className="text-sm font-medium" style={{ color: "var(--nrs-text)" }}>
                  {m.full_name || m.username || m.email}
                </span>
              </div>
              <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                {m.email}
                {m.username && <span> · @{m.username}</span>}
                <span>
                  {" "}· Banned since{" "}
                  {new Date(m.created_at).toLocaleDateString("en-GB")}
                </span>
              </div>
            </div>
            <button
              disabled={loadingId === m.id}
              onClick={() => unban(m.id)}
              className="shrink-0 text-xs px-3 py-1.5 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50 transition"
            >
              {loadingId === m.id ? "…" : "Lift Ban"}
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-sm" style={{ color: "var(--nrs-text-muted)" }}>No banned members match your search.</div>
        )}
      </div>
    </section>
  );
}
