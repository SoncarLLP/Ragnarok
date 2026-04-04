"use client";

import type { FitnessClass } from "@/lib/fitness";

interface ClassCardProps {
  fitnessClass: FitnessClass & { id: string };
  isActive?: boolean;
  level?: number;
  prestigeCount?: number;
  onSelect?: (classId: string) => void;
  selectable?: boolean;
}

const CLASS_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  warrior:   { border: "border-amber-700/40",   bg: "rgba(180,83,9,0.08)",    text: "#d97706" },
  ranger:    { border: "border-emerald-600/40",  bg: "rgba(5,150,105,0.08)",   text: "#059669" },
  mage:      { border: "border-violet-500/40",   bg: "rgba(139,92,246,0.08)",  text: "#8b5cf6" },
  rogue:     { border: "border-neutral-500/40",  bg: "rgba(115,115,115,0.08)", text: "#737373" },
  paladin:   { border: "border-yellow-400/40",   bg: "rgba(250,204,21,0.08)",  text: "#eab308" },
  druid:     { border: "border-green-600/40",    bg: "rgba(22,163,74,0.08)",   text: "#16a34a" },
  berserker: { border: "border-red-600/40",      bg: "rgba(220,38,38,0.08)",   text: "#dc2626" },
  monk:      { border: "border-orange-600/40",   bg: "rgba(234,88,12,0.08)",   text: "#ea580c" },
  shaman:    { border: "border-blue-500/40",     bg: "rgba(59,130,246,0.08)",  text: "#3b82f6" },
  viking:    { border: "border-red-700/40",      bg: "rgba(185,28,28,0.08)",   text: "#dc2626" },
};

export default function ClassCard({
  fitnessClass,
  isActive = false,
  level,
  prestigeCount = 0,
  onSelect,
  selectable = false,
}: ClassCardProps) {
  const colors = CLASS_COLORS[fitnessClass.slug] ?? CLASS_COLORS.warrior;

  return (
    <div
      onClick={selectable && onSelect ? () => onSelect(fitnessClass.id) : undefined}
      className={`rounded-xl p-4 transition ${selectable ? "cursor-pointer hover:scale-[1.02]" : ""} ${isActive ? "ring-2 ring-[var(--nrs-accent)]" : ""}`}
      style={{
        border: `1px solid ${isActive ? "var(--nrs-accent-border)" : "var(--nrs-border-subtle)"}`,
        background: isActive ? "var(--nrs-accent-dim)" : fitnessClass.slug ? colors.bg : "var(--nrs-card)",
      }}
    >
      {/* Icon + Name */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{fitnessClass.icon}</span>
          <div>
            <div className="font-bold text-sm" style={{ color: colors.text }}>
              {fitnessClass.name}
            </div>
            {isActive && level !== undefined && (
              <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                Level {level}
                {prestigeCount > 0 && <span className="ml-1 text-amber-400">⭐×{prestigeCount}</span>}
              </div>
            )}
          </div>
        </div>
        {isActive && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-emerald-400 border border-emerald-400/30"
            style={{ background: "rgba(52,211,153,0.1)" }}>
            Active
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--nrs-text-muted)" }}>
        {fitnessClass.description}
      </p>

      {/* Class bonus */}
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-400">↑</span>
          <span style={{ color: "var(--nrs-text-muted)" }}>
            {fitnessClass.slug === "paladin"
              ? "+20% XP for all exercise types"
              : fitnessClass.slug === "viking"
              ? "+60% XP for Viking activities"
              : `+50% XP for class exercises`}
          </span>
        </div>
        {fitnessClass.slug !== "paladin" && (
          <div className="flex items-center gap-1.5">
            <span className="text-red-400">↓</span>
            <span style={{ color: "var(--nrs-text-muted)" }}>
              {fitnessClass.slug === "viking" ? "-30%" : "-40%"} XP for off-class exercises
            </span>
          </div>
        )}
        {fitnessClass.slug === "paladin" && (
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400">✦</span>
            <span style={{ color: "var(--nrs-text-muted)" }}>No off-class penalty</span>
          </div>
        )}
        {fitnessClass.slug === "viking" && (
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400">✦</span>
            <span style={{ color: "var(--nrs-text-muted)" }}>+10 loyalty points per level up</span>
          </div>
        )}
      </div>

      {/* Primary exercises preview */}
      <div className="mt-3 flex flex-wrap gap-1">
        {fitnessClass.primaryExercises.slice(0, 4).map((ex) => (
          <span
            key={ex}
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: "var(--nrs-panel)", color: "var(--nrs-text-muted)" }}
          >
            {ex}
          </span>
        ))}
        {fitnessClass.primaryExercises.length > 4 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: "var(--nrs-text-muted)" }}>
            +{fitnessClass.primaryExercises.length - 4} more
          </span>
        )}
      </div>
    </div>
  );
}
