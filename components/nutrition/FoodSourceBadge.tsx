interface FoodSourceBadgeProps {
  source: string;
  isVerified?: boolean;
  size?: "sm" | "md";
}

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  open_food_facts:        { label: "Open Food Facts",    color: "#e37b00" },
  open_food_facts_global: { label: "Open Food Facts",    color: "#e37b00" },
  usda:                   { label: "USDA",               color: "#1e4d8c" },
  ragnarok:               { label: "✓ Ragnarök",         color: "var(--nrs-accent)" },
  custom:                 { label: "Custom",             color: "#7c3aed" },
  uk_verified:            { label: "✅ Verified UK Food", color: "#16a34a" },
};

export default function FoodSourceBadge({ source, isVerified, size = "sm" }: FoodSourceBadgeProps) {
  const effectiveSource = isVerified ? "uk_verified" : source;
  const config = SOURCE_CONFIG[effectiveSource] ?? { label: source, color: "var(--nrs-text-muted)" };
  return (
    <span
      className={`inline-flex items-center rounded ${size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"}`}
      style={{ border: `1px solid ${config.color}`, color: config.color, opacity: 0.85 }}
    >
      {config.label}
    </span>
  );
}
