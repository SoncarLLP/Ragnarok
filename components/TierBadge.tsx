"use client";

/**
 * TierBadge — shows a visual flair for each of the 13 membership tiers.
 * Style escalates in visual weight as tiers increase.
 */
export default function TierBadge({ tier }: { tier?: string | null }) {
  if (!tier) return null;

  // Diamond — animated glowing badge with crown
  if (tier === "Diamond") {
    return (
      <span
        title="Diamond"
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full
          bg-violet-500/20 text-violet-300 border border-violet-400/40
          shadow-[0_0_8px_rgba(167,139,250,0.4)]
          animate-pulse"
        style={{ animationDuration: "2.5s" }}
      >
        👑 {tier}
      </span>
    );
  }

  // Platinum 1–3 — full banner, ice blue
  if (tier.startsWith("Platinum")) {
    return (
      <span
        title={tier}
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full
          bg-cyan-500/15 text-cyan-300 border border-cyan-400/30"
      >
        ◆ {tier}
      </span>
    );
  }

  // Gold 1–3 — rich gold badge
  if (tier.startsWith("Gold")) {
    return (
      <span
        title={tier}
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full
          bg-amber-400/15 text-amber-300 border border-amber-400/30"
      >
        ★ {tier}
      </span>
    );
  }

  // Silver 1–3 — cool silver badge
  if (tier.startsWith("Silver")) {
    return (
      <span
        title={tier}
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full
          bg-neutral-400/10 text-neutral-300 border border-neutral-400/25"
      >
        ● {tier}
      </span>
    );
  }

  // Bronze 1–3 — warm copper tone, smaller/subtler
  if (tier.startsWith("Bronze")) {
    return (
      <span
        title={tier}
        className="inline-flex items-center gap-1 text-[10px] font-medium px-1 py-0.5 rounded
          text-amber-700/90 bg-amber-900/20 border border-amber-800/30"
      >
        · {tier}
      </span>
    );
  }

  return null;
}
