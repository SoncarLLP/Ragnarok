"use client";

type TierGroup = "bronze" | "silver" | "gold" | "platinum" | "fire" | "diamond";

function resolveTierGroup(tier: string | null | undefined): TierGroup {
  if (!tier) return "bronze";
  const t = tier.toLowerCase();
  if (t.startsWith("bronze"))   return "bronze";
  if (t.startsWith("silver"))   return "silver";
  if (t.startsWith("gold"))     return "gold";
  if (t.startsWith("platinum")) return "platinum";
  if (t.startsWith("fire"))     return "fire";
  if (t === "diamond")          return "diamond";
  return "bronze";
}

type Props = {
  /** The stored numerical points value. */
  points: number;
  /** The member's role — if "super_admin", renders ∞ instead of the number. */
  role?: string | null;
  /**
   * The member's current tier name (e.g. "Gold 2", "Diamond").
   * Determines the animation variant shown for super_admin members.
   */
  tier?: string | null;
  /** Extra Tailwind classes applied to the outer element. */
  className?: string;
};

/**
 * Renders loyalty points for a member.
 *
 * - Regular members: displays the numeric value (e.g. "1,250").
 * - Super admins:    displays an animated ∞ symbol styled to match the
 *   member's active tier theme.  The stored DB value is preserved as a
 *   tooltip so it remains inspectable.
 */
export default function PointsDisplay({ points, role, tier, className = "" }: Props) {
  if (role === "super_admin") {
    const group = resolveTierGroup(tier);
    return (
      <span
        className={`nrs-inf-tier-${group} inline-flex items-center ${className}`}
        title={`${points.toLocaleString()} pts (stored)`}
        aria-label="Unlimited points"
      >
        <span className="nrs-infinity-symbol">∞</span>
      </span>
    );
  }

  return <span className={className}>{points.toLocaleString()}</span>;
}
