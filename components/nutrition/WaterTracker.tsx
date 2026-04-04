"use client";

import { useState } from "react";

interface WaterTrackerProps {
  totalMl: number;
  targetMl: number;
  date: string;
  onAdd: (amount: number) => Promise<void>;
}

const QUICK_AMOUNTS = [150, 250, 330, 500];

export default function WaterTracker({ totalMl, targetMl, date, onAdd }: WaterTrackerProps) {
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);

  const percent = targetMl > 0 ? Math.min(100, Math.round((totalMl / targetMl) * 100)) : 0;
  const glasses = Math.round(totalMl / 250);
  const targetGlasses = Math.round(targetMl / 250);
  const isToday = date === new Date().toISOString().split("T")[0];

  const handleAdd = async (amount: number) => {
    if (loading || amount <= 0) return;
    setLoading(true);
    try {
      await onAdd(amount);
      setCustom("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-xl p-4"
      style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">💧</span>
          <span className="font-medium text-sm" style={{ color: "var(--nrs-text)" }}>Water</span>
        </div>
        <div className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>
          {totalMl}ml / {targetMl}ml
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full mb-2" style={{ background: "var(--nrs-panel)" }}>
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${percent}%`, background: percent >= 100 ? "#34d399" : "#60a5fa" }}
        />
      </div>

      <div className="flex justify-between text-xs mb-3" style={{ color: "var(--nrs-text-muted)" }}>
        <span>🥛 {glasses} / {targetGlasses} glasses</span>
        <span>{percent}%</span>
      </div>

      {/* Quick add buttons */}
      {isToday && (
        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => handleAdd(amount)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg transition font-medium"
              style={{
                background: "var(--nrs-panel)",
                color: "var(--nrs-text-muted)",
                border: "1px solid var(--nrs-border)",
              }}
            >
              +{amount}ml
            </button>
          ))}
          <div className="flex gap-1">
            <input
              type="number"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              placeholder="Custom"
              className="text-xs w-20 px-2 py-1.5 rounded-lg"
              style={{
                background: "var(--nrs-panel)",
                color: "var(--nrs-text)",
                border: "1px solid var(--nrs-border)",
              }}
            />
            <button
              onClick={() => handleAdd(parseInt(custom) || 0)}
              disabled={loading || !custom}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition"
              style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
