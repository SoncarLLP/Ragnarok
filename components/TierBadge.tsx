import { formatTierName } from "@/lib/loyalty";

/**
 * TierBadge — progressively more impressive visual flair for each of the 13
 * membership tiers. Style and animation intensity escalates with tier level.
 *
 * Accepts raw DB values ("bronze_1") or formatted strings ("Bronze 1") —
 * formatTierName normalises before any comparison.
 */
export default function TierBadge({ tier }: { tier?: string | null }) {
  if (!tier) return null;
  const name = formatTierName(tier);
  if (!name) return null;

  // ── Diamond ────────────────────────────────────────────────────────────────
  // Prismatic rainbow text, cycling multi-colour glow, prominent size
  if (name === "Diamond") {
    return (
      <span
        title="Diamond"
        aria-label="Diamond tier"
        className="tier-badge-diamond inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border border-violet-400/55 shrink-0"
        style={{ background: "rgba(109,40,217,0.12)" }}
      >
        💎{" "}
        <span className="tier-text-rainbow">{name}</span>
      </span>
    );
  }

  // ── Platinum 1–3 ───────────────────────────────────────────────────────────
  // Ice-blue banner with sweeping shimmer, larger than Gold
  if (name.startsWith("Platinum")) {
    return (
      <span
        title={name}
        aria-label={`${name} tier`}
        className="tier-badge-platinum inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-cyan-400/40 text-cyan-200 shrink-0"
      >
        ◆ {name}
      </span>
    );
  }

  // ── Gold 1–3 ───────────────────────────────────────────────────────────────
  // Warm gold text, pulsing outer glow animation
  if (name.startsWith("Gold")) {
    return (
      <span
        title={name}
        aria-label={`${name} tier`}
        className="tier-badge-gold inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-amber-400/45 text-amber-300 shrink-0"
        style={{ background: "rgba(251,191,36,0.1)" }}
      >
        ★ {name}
      </span>
    );
  }

  // ── Silver 1–3 ─────────────────────────────────────────────────────────────
  // Cool silver/slate text, subtle sweeping shimmer on the badge background
  if (name.startsWith("Silver")) {
    return (
      <span
        title={name}
        aria-label={`${name} tier`}
        className="tier-badge-silver inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-slate-400/25 text-slate-300 shrink-0"
      >
        ● {name}
      </span>
    );
  }

  // ── Bronze 1–3 ─────────────────────────────────────────────────────────────
  // Understated warm copper, no animation, slightly smaller and squarer
  if (name.startsWith("Bronze")) {
    return (
      <span
        title={name}
        aria-label={`${name} tier`}
        className="inline-flex items-center gap-1 text-[10px] font-medium px-1 py-0.5 rounded border border-amber-800/35 text-amber-700/90 shrink-0"
        style={{ background: "rgba(120,53,15,0.18)" }}
      >
        · {name}
      </span>
    );
  }

  return null;
}
