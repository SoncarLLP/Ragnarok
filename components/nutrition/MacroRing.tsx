"use client";

interface MacroRingProps {
  label: string;
  consumed: number;
  target: number;
  unit?: string;
  color?: string;
  size?: number;
}

export default function MacroRing({
  label, consumed, target, unit = "g", color = "var(--nrs-accent)", size = 80
}: MacroRingProps) {
  const percent = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (percent / 100) * circumference;

  const statusColor =
    percent >= 90 && percent <= 115 ? "#34d399"
    : percent >= 70 && percent <= 130 ? "#fbbf24"
    : "#f87171";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--nrs-panel)" strokeWidth={8}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={statusColor}
          strokeWidth={8}
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
      </svg>
      <div className="text-center -mt-1" style={{ marginTop: `-${size * 0.75}px`, width: size }}>
        <div className="text-xs font-semibold" style={{ color: "var(--nrs-text)" }}>
          {Math.round(consumed)}{unit}
        </div>
        <div className="text-[10px]" style={{ color: "var(--nrs-text-muted)" }}>
          / {target}{unit}
        </div>
      </div>
      <div className="text-xs font-medium mt-1" style={{ color: "var(--nrs-text-muted)", marginTop: `${size * 0.75 - 12}px` }}>
        {label}
      </div>
    </div>
  );
}
