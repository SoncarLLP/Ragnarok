"use client";

import type { WarningRecord } from "./AdminTabs";

function fmtMemberId(id: number | null) {
  return id != null ? String(id).padStart(11, "0") : "—";
}

export default function WarningsLog({ warnings }: { warnings: WarningRecord[] }) {
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
      <h2 className="text-lg font-semibold">Warning History ({warnings.length})</h2>

      <div className="space-y-2">
        {warnings.map((w) => (
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
      </div>
    </section>
  );
}
