"use client";

import { useState, useEffect, useCallback } from "react";
import type { PublishHistoryEntry } from "@/lib/site-management";
import ConfirmModal from "./ConfirmModal";

type Props = {
  entityType: "product" | "site_content";
  entityId: string;
  onReverted?: () => void;
};

export default function PublishHistory({ entityType, entityId, onReverted }: Props) {
  const [entries, setEntries] = useState<PublishHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [revertTarget, setRevertTarget] = useState<string | null>(null);
  const [reverting, setReverting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/site-management/publish-history?entity_type=${entityType}&entity_id=${entityId}`
      );
      const data = await res.json();
      setEntries(data.history ?? []);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const handleRevert = useCallback(async () => {
    if (!revertTarget) return;
    setReverting(true);
    try {
      await fetch("/api/site-management/publish-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history_id: revertTarget }),
      });
      setRevertTarget(null);
      onReverted?.();
      await load();
    } finally {
      setReverting(false);
    }
  }, [revertTarget, load, onReverted]);

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading history…</p>;
  }

  if (entries.length === 0) {
    return <p className="text-sm text-neutral-500">No publish history yet.</p>;
  }

  return (
    <>
      <div className="rounded-xl border border-white/10 divide-y divide-white/5 overflow-hidden">
        {entries.map((entry, i) => (
          <div key={entry.id} className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  i === 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-neutral-500"
                }`}>
                  {i === 0 ? "Current" : `v${entries.length - i}`}
                </span>
                <span className="text-neutral-400 text-xs">
                  {new Date(entry.published_at).toLocaleString("en-GB", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <p className="text-neutral-300 text-xs mt-0.5">
                by {entry.publisher_name ?? "Super Admin"}
                {entry.notes && ` — ${entry.notes}`}
              </p>
            </div>
            {i > 0 && (
              <button
                type="button"
                onClick={() => setRevertTarget(entry.id)}
                disabled={reverting}
                className="shrink-0 text-xs px-3 py-1 rounded-lg border border-white/15 text-neutral-400 hover:text-white hover:border-white/30 transition disabled:opacity-40"
              >
                Revert
              </button>
            )}
          </div>
        ))}
      </div>

      <ConfirmModal
        open={!!revertTarget}
        title="Revert to this version?"
        message="This will overwrite the current live version with this historical snapshot. The change will be immediately live. You can re-publish your latest draft afterwards."
        confirmLabel="Revert"
        confirmDestructive
        onConfirm={handleRevert}
        onCancel={() => setRevertTarget(null)}
      />
    </>
  );
}
