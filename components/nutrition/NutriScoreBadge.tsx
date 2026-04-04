import { NUTRI_SCORE_COLORS } from "@/lib/nutrition";

interface NutriScoreBadgeProps {
  score: string | null | undefined;
  size?: "sm" | "md" | "lg";
}

export default function NutriScoreBadge({ score, size = "md" }: NutriScoreBadgeProps) {
  if (!score || !NUTRI_SCORE_COLORS[score]) return null;
  const { bg, text } = NUTRI_SCORE_COLORS[score];

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 rounded",
    md: "text-xs px-2 py-1 rounded-md",
    lg: "text-sm px-3 py-1.5 rounded-lg font-bold",
  };

  return (
    <span
      className={`inline-flex items-center font-bold ${sizeClasses[size]}`}
      style={{ background: bg, color: text }}
      title={`Nutri-Score ${score}`}
    >
      {score}
    </span>
  );
}
