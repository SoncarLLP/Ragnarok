"use client";

interface StreakBadgeProps {
  currentStreak: number;
  longestStreak?: number;
  compact?: boolean;
}

export default function StreakBadge({ currentStreak, longestStreak, compact = false }: StreakBadgeProps) {
  const isHot = currentStreak >= 7;
  const isLegendary = currentStreak >= 30;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
          isLegendary ? "text-violet-300 border border-violet-400/30" :
          isHot ? "text-amber-400 border border-amber-400/30" :
          "text-neutral-400 border border-neutral-600/30"
        }`}
        style={{
          background: isLegendary ? "rgba(139,92,246,0.1)" :
                     isHot ? "rgba(251,191,36,0.1)" :
                     "var(--nrs-panel)",
        }}
      >
        {isLegendary ? "⚡" : isHot ? "🔥" : "●"}
        {currentStreak}d
      </span>
    );
  }

  return (
    <div
      className="flex items-center gap-3 rounded-xl p-4"
      style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
    >
      <span className="text-3xl">{isLegendary ? "⚡" : isHot ? "🔥" : "📅"}</span>
      <div>
        <div className="text-2xl font-bold" style={{ color: isLegendary ? "#a78bfa" : isHot ? "#fbbf24" : "var(--nrs-text)" }}>
          {currentStreak} day{currentStreak !== 1 ? "s" : ""}
        </div>
        <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
          Current streak
          {longestStreak !== undefined && longestStreak > 0 && (
            <span className="ml-2">· Best: {longestStreak}d</span>
          )}
        </div>
      </div>
    </div>
  );
}
