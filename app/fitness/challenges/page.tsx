"use client";

import { useState, useEffect } from "react";

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_metric: string;
  target_value: number;
  start_date: string;
  end_date: string;
  xp_reward: number;
  points_reward: number;
  fitness_classes?: { name: string; icon: string } | null;
  userProgress: { current_value: number; completed: boolean };
  progressPercent: number;
}

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  weekly:    { label: "Weekly",    emoji: "📅" },
  monthly:   { label: "Monthly",   emoji: "🗓️" },
  class:     { label: "Class",     emoji: "⚔️" },
  community: { label: "Community", emoji: "🌍" },
};

const METRIC_LABELS: Record<string, string> = {
  workouts:          "workouts",
  duration_minutes:  "minutes",
  distance_km:       "km",
  xp:                "XP",
};

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [filter, setFilter]         = useState("all");
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    fetch("/api/fitness/challenges")
      .then((r) => r.json())
      .then((d) => { setChallenges(d.challenges ?? []); setLoading(false); });
  }, []);

  const types = ["all", "weekly", "monthly", "class", "community"];

  const filtered = filter === "all"
    ? challenges
    : challenges.filter((c) => c.challenge_type === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--nrs-text)" }}>Challenges</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nrs-text-muted)" }}>
          Complete challenges to earn bonus XP and loyalty points
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {types.map((t) => {
          const info = TYPE_LABELS[t];
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition"
              style={{
                border: `1px solid ${filter === t ? "var(--nrs-accent-border)" : "var(--nrs-border-subtle)"}`,
                background: filter === t ? "var(--nrs-accent-dim)" : "var(--nrs-panel)",
                color: filter === t ? "var(--nrs-accent)" : "var(--nrs-text-muted)",
              }}
            >
              {info ? `${info.emoji} ${info.label}` : "All"}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-8" style={{ color: "var(--nrs-text-muted)" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8" style={{ color: "var(--nrs-text-muted)" }}>
          No active challenges right now. Check back soon!
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => {
            const typeInfo = TYPE_LABELS[c.challenge_type];
            const metricLabel = METRIC_LABELS[c.target_metric] ?? c.target_metric;
            const daysLeft = Math.max(0, Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000));

            return (
              <div
                key={c.id}
                className="rounded-xl p-5"
                style={{
                  border: `1px solid ${c.userProgress.completed ? "rgba(52,211,153,0.4)" : "var(--nrs-border-subtle)"}`,
                  background: c.userProgress.completed ? "rgba(52,211,153,0.05)" : "var(--nrs-card)",
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">{typeInfo?.emoji ?? "🎯"}</span>
                      <span className="font-semibold text-sm" style={{ color: "var(--nrs-text)" }}>
                        {c.title}
                      </span>
                      {c.userProgress.completed && (
                        <span className="text-xs px-2 py-0.5 rounded-full text-emerald-400 border border-emerald-400/30"
                          style={{ background: "rgba(52,211,153,0.1)" }}>
                          ✓ Completed
                        </span>
                      )}
                      {c.fitness_classes && (
                        <span className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                          {c.fitness_classes.icon} {c.fitness_classes.name} only
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-1" style={{ color: "var(--nrs-text-muted)" }}>{c.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs font-semibold" style={{ color: "var(--nrs-accent)" }}>+{c.xp_reward} XP</div>
                    {c.points_reward > 0 && (
                      <div className="text-xs text-amber-400">+{c.points_reward} pts</div>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                    <span>
                      {c.userProgress.current_value} / {c.target_value} {metricLabel}
                    </span>
                    <span className={daysLeft <= 2 ? "text-red-400" : ""}>
                      {daysLeft === 0 ? "Ends today" : `${daysLeft}d left`}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--nrs-panel)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${c.progressPercent}%`,
                        background: c.userProgress.completed ? "#34d399" : "var(--nrs-accent)",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
