"use client";

import { useState, useEffect } from "react";
import ClassBadge from "@/components/fitness/ClassBadge";
import TierBadge from "@/components/TierBadge";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  tier: string;
  className: string;
  classIcon: string;
  classSlug?: string;
  classLevel: number;
  value: number;
  longestStreak?: number;
  isCurrentUser: boolean;
}

const BOARDS = [
  { type: "xp",      period: "week",    label: "Weekly XP",     emoji: "⚡" },
  { type: "xp",      period: "month",   label: "Monthly XP",    emoji: "📅" },
  { type: "streak",  period: "current", label: "Streak",        emoji: "🔥" },
  { type: "prestige",period: "alltime", label: "Prestige",      emoji: "⭐" },
];

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function LeaderboardPage() {
  const [activeBoard, setActiveBoard] = useState({ type: "xp", period: "week" });
  const [entries, setEntries]         = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/fitness/leaderboard?type=${activeBoard.type}&period=${activeBoard.period}&limit=20`)
      .then((r) => r.json())
      .then((d) => { setEntries(d.leaderboard ?? []); setLoading(false); });
  }, [activeBoard.type, activeBoard.period]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--nrs-text)" }}>Leaderboards</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nrs-text-muted)" }}>
          Who reigns supreme in the realm of Ragnarök?
        </p>
      </div>

      {/* Board selector */}
      <div className="flex gap-2 flex-wrap">
        {BOARDS.map((b) => {
          const isActive = b.type === activeBoard.type && b.period === activeBoard.period;
          return (
            <button
              key={`${b.type}-${b.period}`}
              onClick={() => setActiveBoard({ type: b.type, period: b.period })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition"
              style={{
                border: `1px solid ${isActive ? "var(--nrs-accent-border)" : "var(--nrs-border-subtle)"}`,
                background: isActive ? "var(--nrs-accent-dim)" : "var(--nrs-panel)",
                color: isActive ? "var(--nrs-accent)" : "var(--nrs-text-muted)",
              }}
            >
              <span>{b.emoji}</span>
              <span>{b.label}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8" style={{ color: "var(--nrs-text-muted)" }}>Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8" style={{ color: "var(--nrs-text-muted)" }}>
          No data yet. Be the first to claim the top spot!
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.userId}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${entry.isCurrentUser ? "ring-1 ring-[var(--nrs-accent)]" : ""}`}
              style={{
                border: `1px solid ${entry.rank <= 3 ? "var(--nrs-accent-border)" : "var(--nrs-border-subtle)"}`,
                background: entry.rank <= 3 ? "var(--nrs-accent-dim)" : "var(--nrs-card)",
              }}
            >
              {/* Rank */}
              <div className="text-xl w-8 text-center shrink-0">
                {RANK_MEDALS[entry.rank] ?? (
                  <span className="text-sm font-bold" style={{ color: "var(--nrs-text-muted)" }}>
                    #{entry.rank}
                  </span>
                )}
              </div>

              {/* Name + badges */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm truncate" style={{ color: "var(--nrs-text)" }}>
                    {entry.displayName}
                    {entry.isCurrentUser && (
                      <span className="ml-1 text-xs" style={{ color: "var(--nrs-accent)" }}>(you)</span>
                    )}
                  </span>
                  <TierBadge tier={entry.tier} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs">{entry.classIcon}</span>
                  <span className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                    {entry.className} · Lv.{entry.classLevel}
                  </span>
                </div>
              </div>

              {/* Value */}
              <div className="shrink-0 text-right">
                <div className="font-bold text-sm" style={{ color: "var(--nrs-accent)" }}>
                  {activeBoard.type === "xp"
                    ? `${entry.value.toLocaleString()} XP`
                    : activeBoard.type === "streak"
                    ? `${entry.value}d`
                    : `⭐ ×${entry.value}`}
                </div>
                {activeBoard.type === "streak" && entry.longestStreak && (
                  <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                    Best: {entry.longestStreak}d
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
