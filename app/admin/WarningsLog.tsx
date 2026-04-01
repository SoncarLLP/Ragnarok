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
        <p className="text-neutral-500 text-sm">No warnings have been sent yet.</p>
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
          className="ml-auto rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-sm outline-none focus:border-white/30 w-56"
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
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs text-neutral-500">
                    {fmtMemberId(w.recipient_member_id)}
                  </span>
                  <span className="text-sm font-medium">{w.recipient_name}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      w.read_at
                        ? "bg-white/5 text-neutral-500"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {w.read_at ? "Read" : "Unread"}
                  </span>
                </div>
                <p className="text-sm text-neutral-300">{w.message}</p>
              </div>
              <div className="text-right text-xs text-neutral-500 shrink-0">
                <div>{new Date(w.created_at).toLocaleDateString("en-GB")}</div>
                <div className="mt-0.5">by {w.sender_name}</div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-neutral-500 text-sm">No warnings match your search.</div>
        )}
      </div>
        );
      })()}
    </section>
  );
}
