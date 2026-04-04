"use client";

import { useState, useEffect } from "react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  xp_reward: number;
  points_reward: number;
  earned: boolean;
  earnedAt?: string;
}

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  streak:    { label: "Streak",    emoji: "🔥" },
  milestone: { label: "Milestone", emoji: "🏆" },
  pr:        { label: "Records",   emoji: "💪" },
  class:     { label: "Class",     emoji: "⚔️" },
  prestige:  { label: "Prestige",  emoji: "⭐" },
  challenge: { label: "Challenges",emoji: "🎯" },
  guild:     { label: "Guilds",    emoji: "🛡️" },
  social:    { label: "Social",    emoji: "💬" },
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [filter, setFilter]             = useState("all");
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    fetch("/api/fitness/achievements")
      .then((r) => r.json())
      .then((d) => { setAchievements(d.achievements ?? []); setLoading(false); });
  }, []);

  const earnedCount = achievements.filter((a) => a.earned).length;
  const categories  = ["all", ...Object.keys(CATEGORY_LABELS)];

  const filtered = filter === "all"
    ? achievements
    : achievements.filter((a) => a.category === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--nrs-text)" }}>Achievements</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nrs-text-muted)" }}>
          {earnedCount} of {achievements.length} earned
        </p>
      </div>

      {/* Progress bar */}
      {achievements.length > 0 && (
        <div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--nrs-panel)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(earnedCount / achievements.length) * 100}%`, background: "var(--nrs-accent)" }}
            />
          </div>
          <div className="text-xs mt-1 text-right" style={{ color: "var(--nrs-text-muted)" }}>
            {Math.round((earnedCount / achievements.length) * 100)}% complete
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {categories.map((cat) => {
          const info = CATEGORY_LABELS[cat];
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition"
              style={{
                border: `1px solid ${filter === cat ? "var(--nrs-accent-border)" : "var(--nrs-border-subtle)"}`,
                background: filter === cat ? "var(--nrs-accent-dim)" : "var(--nrs-panel)",
                color: filter === cat ? "var(--nrs-accent)" : "var(--nrs-text-muted)",
              }}
            >
              {info ? `${info.emoji} ${info.label}` : "All"}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-8" style={{ color: "var(--nrs-text-muted)" }}>Loading...</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((ach) => (
            <div
              key={ach.id}
              className={`rounded-xl p-4 transition ${!ach.earned ? "opacity-50" : ""}`}
              style={{
                border: `1px solid ${ach.earned ? "var(--nrs-accent-border)" : "var(--nrs-border-subtle)"}`,
                background: ach.earned ? "var(--nrs-accent-dim)" : "var(--nrs-card)",
              }}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{ach.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: "var(--nrs-text)" }}>
                      {ach.name}
                    </span>
                    {ach.earned && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full text-emerald-400 border border-emerald-400/30"
                        style={{ background: "rgba(52,211,153,0.1)" }}>
                        ✓ Earned
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>
                    {ach.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    {ach.xp_reward > 0 && (
                      <span style={{ color: "var(--nrs-accent)" }}>+{ach.xp_reward} XP</span>
                    )}
                    {ach.points_reward > 0 && (
                      <span className="text-amber-400">+{ach.points_reward} pts</span>
                    )}
                    {ach.earned && ach.earnedAt && (
                      <span style={{ color: "var(--nrs-text-muted)" }}>
                        {new Date(ach.earnedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
