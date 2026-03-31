"use client";

import { useState } from "react";
import { ALL_TIERS } from "@/lib/loyalty";

type Props = {
  member: { id: string; name: string; currentTier: string };
  onClose: () => void;
  onPromotion: (userId: string, newTier: string) => void;
};

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "Bronze 1":   { bg: "bg-amber-900/20",   text: "text-amber-700",   border: "border-amber-700/40" },
  "Bronze 2":   { bg: "bg-amber-900/20",   text: "text-amber-700",   border: "border-amber-700/40" },
  "Bronze 3":   { bg: "bg-amber-900/20",   text: "text-amber-700",   border: "border-amber-700/40" },
  "Silver 1":   { bg: "bg-neutral-700/20", text: "text-neutral-300", border: "border-neutral-400/40" },
  "Silver 2":   { bg: "bg-neutral-700/20", text: "text-neutral-300", border: "border-neutral-400/40" },
  "Silver 3":   { bg: "bg-neutral-700/20", text: "text-neutral-300", border: "border-neutral-400/40" },
  "Gold 1":     { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-400/40" },
  "Gold 2":     { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-400/40" },
  "Gold 3":     { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-400/40" },
  "Platinum 1": { bg: "bg-cyan-900/20",    text: "text-cyan-300",    border: "border-cyan-400/40" },
  "Platinum 2": { bg: "bg-cyan-900/20",    text: "text-cyan-300",    border: "border-cyan-400/40" },
  "Platinum 3": { bg: "bg-cyan-900/20",    text: "text-cyan-300",    border: "border-cyan-400/40" },
  "Diamond":    { bg: "bg-violet-900/20",  text: "text-violet-400",  border: "border-violet-400/40" },
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
      <div className="w-full max-w-md bg-neutral-900 rounded-2xl border border-white/10 p-6 shadow-2xl">
        <h3 className="font-semibold text-lg mb-1">Set Loyalty Tier</h3>
        <p className="text-sm text-neutral-400 mb-5">
          Member: <span className="text-white">{member.name}</span>
          <span className="ml-2 text-xs text-neutral-500">
            (current: {member.currentTier})
          </span>
        </p>

        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
          {ALL_TIERS.map((t) => {
            const style = TIER_STYLES[t.tier] ?? TIER_STYLES["Bronze 1"];
            const isSelected = selected === t.tier;
            const isCurrent = member.currentTier === t.tier;
            return (
              <button
                key={t.tier}
                onClick={() => setSelected(t.tier)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition
                  ${isSelected
                    ? `${style.bg} ${style.text} ${style.border} ring-1 ring-current`
                    : "bg-white/3 border-white/10 text-neutral-400 hover:bg-white/8 hover:text-white"
                  }`}
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
          <p className="mt-4 text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
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
            className="flex-1 py-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 disabled:opacity-50 text-sm font-medium transition"
          >
            {loading ? "Updating…" : selected === member.currentTier ? "No change" : `Set to ${selected}`}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 text-neutral-400 hover:text-white text-sm transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
