"use client";

import { useState } from "react";
import { ALL_TIERS } from "@/lib/loyalty";

type Props = {
  member: { id: string; name: string; currentTier: string };
  onClose: () => void;
  onPromotion: (userId: string, newTier: string) => void;
};

export default function TierPromoteModal({ member, onClose, onPromotion }: Props) {
  const [selected, setSelected] = useState(member.currentTier);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    if (selected === member.currentTier) { onClose(); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/members/tier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: member.id, newTier: selected }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to update tier");
      setLoading(false);
      return;
    }
    onPromotion(member.id, selected);
    onClose();
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: "var(--nrs-card)", border: "1px solid var(--nrs-border)" }}>
        <h3 className="font-semibold text-lg mb-1">Set Loyalty Tier</h3>
        <p className="text-sm mb-5" style={{ color: "var(--nrs-text-muted)" }}>
          Member: <span style={{ color: "var(--nrs-text)" }}>{member.name}</span>
          <span className="ml-2 text-xs" style={{ color: "var(--nrs-text-muted)" }}>
            (current: {member.currentTier})
          </span>
        </p>

        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
          {ALL_TIERS.map((t) => {
            const isSelected = selected === t.tier;
            const isCurrent = member.currentTier === t.tier;
            return (
              <button
                key={t.tier}
                onClick={() => setSelected(t.tier)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition"
                style={
                  isSelected
                    ? { background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)", border: "1px solid var(--nrs-accent-border)", outline: "1px solid var(--nrs-accent)" }
                    : { background: "var(--nrs-panel)", color: "var(--nrs-text-muted)", border: "1px solid var(--nrs-border-subtle)" }
                }
              >
                <span className="font-medium">{t.tier}</span>
                <span className="text-xs opacity-60">
                  {isCurrent ? "current" : `${t.min.toLocaleString()}pts`}
                </span>
              </button>
            );
          })}
        </div>

        {selected !== member.currentTier && (
          <p className="mt-4 text-xs rounded-lg px-3 py-2" style={{ color: "var(--nrs-accent)", background: "var(--nrs-accent-dim)", border: "1px solid var(--nrs-accent-border)" }}>
            This will set their tier to <strong>{selected}</strong> and update their
            cumulative points to the minimum for this tier.
            A notification will be sent to the member.
          </p>
        )}

        {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button
            onClick={confirm}
            disabled={loading}
            className="flex-1 py-2 rounded-lg disabled:opacity-50 text-sm font-medium transition"
            style={{ background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)", border: "1px solid var(--nrs-accent-border)" }}
          >
            {loading ? "Updating…" : selected === member.currentTier ? "No change" : `Set to ${selected}`}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm transition"
            style={{ background: "var(--nrs-btn-bg)", color: "var(--nrs-text-muted)", border: "1px solid var(--nrs-border-subtle)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
