"use client";

import { xpPerLevel, xpToNextLevel } from "@/lib/fitness";

interface XPBarProps {
  level: number;
  currentXp: number;
  className?: string;
  showNumbers?: boolean;
  compact?: boolean;
}

/**
 * XPBar — shows progress toward the next fitness class level.
 * At level 50 (max), shows "MAX LEVEL" state.
 * Can prestige at level 50.
 */
export default function XPBar({
  level,
  currentXp,
  className = "",
  showNumbers = true,
  compact = false,
}: XPBarProps) {
  const isMaxLevel = level >= 50;
  const needed     = isMaxLevel ? 0 : xpPerLevel(level);
  const progress   = isMaxLevel ? 100 : Math.min(100, (currentXp / needed) * 100);
  const remaining  = isMaxLevel ? 0 : xpToNextLevel(level, currentXp);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-xs shrink-0 font-mono" style={{ color: "var(--nrs-text-muted)" }}>
          Lv.{level}
        </span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--nrs-panel)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "var(--nrs-accent)" }}
          />
        </div>
        {!isMaxLevel && (
          <span className="text-[10px] shrink-0" style={{ color: "var(--nrs-text-muted)" }}>
            {remaining} XP
          </span>
        )}
        {isMaxLevel && (
          <span className="text-[10px] shrink-0 text-amber-400 font-semibold">MAX</span>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showNumbers && (
        <div className="flex items-center justify-between text-xs" style={{ color: "var(--nrs-text-muted)" }}>
          <span>
            Level {level}
            {isMaxLevel ? " (Max)" : ""}
          </span>
          {!isMaxLevel ? (
            <span>{currentXp.toLocaleString()} / {needed.toLocaleString()} XP</span>
          ) : (
            <span className="text-amber-400 font-semibold">Prestige Available ⭐</span>
          )}
        </div>
      )}
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--nrs-panel)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${progress}%`,
            background: isMaxLevel
              ? "linear-gradient(90deg, #f59e0b, #ef4444)"
              : "var(--nrs-accent)",
          }}
        />
      </div>
      {showNumbers && !isMaxLevel && (
        <div className="text-right text-xs" style={{ color: "var(--nrs-text-muted)" }}>
          {remaining.toLocaleString()} XP to Level {level + 1}
        </div>
      )}
    </div>
  );
}
