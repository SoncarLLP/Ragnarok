"use client";

interface WorkoutCardProps {
  id: string;
  exerciseName: string;
  exerciseCategory: string;
  className?: string;
  classIcon?: string;
  durationMinutes?: number;
  sets?: number;
  reps?: number;
  weightKg?: number;
  distanceKm?: number;
  intensity: string;
  xpEarned: number;
  pointsEarned: number;
  workoutDate: string;
  notes?: string;
  isPersonalRecord?: boolean;
  compact?: boolean;
}

const INTENSITY_COLORS: Record<string, string> = {
  light:    "text-blue-400",
  moderate: "text-green-400",
  intense:  "text-amber-400",
  maximum:  "text-red-400",
};

const CATEGORY_ICONS: Record<string, string> = {
  strength:    "🏋️",
  cardio:      "🏃",
  flexibility: "🧘",
  hiit:        "⚡",
  outdoor:     "🌿",
  functional:  "🔥",
  martial_arts: "🥋",
  recovery:    "💆",
};

export default function WorkoutCard({
  exerciseName,
  exerciseCategory,
  className,
  classIcon,
  durationMinutes,
  sets,
  reps,
  weightKg,
  distanceKm,
  intensity,
  xpEarned,
  pointsEarned,
  workoutDate,
  notes,
  isPersonalRecord,
  compact = false,
}: WorkoutCardProps) {
  const catIcon = CATEGORY_ICONS[exerciseCategory] ?? "💪";
  const intensityColor = INTENSITY_COLORS[intensity] ?? "text-neutral-400";
  const date = new Date(workoutDate);
  const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  if (compact) {
    return (
      <div
        className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
        style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{catIcon}</span>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: "var(--nrs-text)" }}>
              {exerciseName}
              {isPersonalRecord && <span className="ml-1 text-amber-400 text-xs">🏆 PR</span>}
            </div>
            <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>{dateStr}</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs font-semibold" style={{ color: "var(--nrs-accent)" }}>+{xpEarned} XP</div>
          {pointsEarned > 0 && (
            <div className="text-[10px]" style={{ color: "var(--nrs-text-muted)" }}>+{pointsEarned} pts</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        border: `1px solid ${isPersonalRecord ? "var(--nrs-accent-border)" : "var(--nrs-border-subtle)"}`,
        background: isPersonalRecord ? "var(--nrs-accent-dim)" : "var(--nrs-card)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{catIcon}</span>
          <div className="min-w-0">
            <div className="font-semibold text-sm flex items-center gap-1.5 flex-wrap" style={{ color: "var(--nrs-text)" }}>
              {exerciseName}
              {isPersonalRecord && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/25">
                  🏆 Personal Record
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {classIcon && className && (
                <span className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                  {classIcon} {className}
                </span>
              )}
              <span className={`text-xs capitalize ${intensityColor}`}>{intensity}</span>
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold" style={{ color: "var(--nrs-accent)" }}>+{xpEarned} XP</div>
          {pointsEarned > 0 && (
            <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>+{pointsEarned} pts</div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--nrs-text-muted)" }}>
        {durationMinutes && (
          <span className="flex items-center gap-1">
            ⏱ {durationMinutes} min
          </span>
        )}
        {sets && reps && (
          <span className="flex items-center gap-1">
            💪 {sets}×{reps}
            {weightKg && ` @ ${weightKg}kg`}
          </span>
        )}
        {distanceKm && (
          <span className="flex items-center gap-1">
            📍 {distanceKm.toFixed(2)}km
          </span>
        )}
        <span className="flex items-center gap-1">
          🕐 {timeStr} · {dateStr}
        </span>
      </div>

      {/* Notes */}
      {notes && (
        <div className="text-xs italic" style={{ color: "var(--nrs-text-muted)" }}>
          "{notes}"
        </div>
      )}
    </div>
  );
}
