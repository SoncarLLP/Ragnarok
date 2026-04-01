"use client";

import { useState } from "react";
import type { WarningRecord } from "./AdminTabs";

function fmtMemberId(id: number | null) {
  return id != null ? String(id).padStart(11, "0") : "—";
}

export default function WarningsLog({ warnings }: { warnings: WarningRecord[] }) {
  const [filter, setFilter] = useState("");
  if (warnings.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold mb-4">Warning History</h2>
        <p className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>No warnings have been sent yet.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Warning History ({warnings.length})</h2>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search name or message…"
          className="ml-auto rounded-md px-3 py-1.5 text-sm outline-none w-56 transition"
          style={{ background: "var(--nrs-card)", border: "1px solid var(--nrs-border)", color: "var(--nrs-text-body)" }}
        />
      </div>

      {(() => {
        const filtered = filter.trim()
          ? warnings.filter((w) => {
              const q = filter.toLowerCase();
              return (
                w.recipient_name.toLowerCase().includes(q) ||
                w.message.toLowerCase().includes(q) ||
                w.sender_name.toLowerCase().includes(q)
              );
            })
          : warnings;
        return (
      <div className="space-y-2">
        {filtered.map((w) => (
          <div
            key={w.id}
            className="rounded-lg px-4 py-3"
            style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                    {fmtMemberId(w.recipient_member_id)}
                  </span>
                  <span className="text-sm font-medium" style={{ color: "var(--nrs-text)" }}>{w.recipient_name}</span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={
                      w.read_at
                        ? { background: "var(--nrs-panel)", color: "var(--nrs-text-muted)" }
                        : { background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)" }
                    }
                  >
                    {w.read_at ? "Read" : "Unread"}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--nrs-text-body)" }}>{w.message}</p>
              </div>
              <div className="text-right text-xs shrink-0" style={{ color: "var(--nrs-text-muted)" }}>
                <div>{new Date(w.created_at).toLocaleDateString("en-GB")}</div>
                <div className="mt-0.5">by {w.sender_name}</div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-sm" style={{ color: "var(--nrs-text-muted)" }}>No warnings match your search.</div>
        )}
      </div>
        );
      })()}
    </section>
  );
}
