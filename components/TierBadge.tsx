import { formatTierName, getTierGroup } from "@/lib/loyalty";

/**
 * TierBadge — 19-tier Norse/RPG membership tier badges.
 * Visual flair and animation escalates from Thrall → Legendary.
 *
 * Accepts raw DB values or formatted strings — formatTierName normalises.
 */
export default function TierBadge({ tier }: { tier?: string | null }) {
  if (!tier) return null;
  const name = formatTierName(tier);
  if (!name) return null;
  const group = getTierGroup(name);

  // ── Legendary ───────────────────────────────────────────────
  // Full prismatic aurora effect, animated Yggdrasil symbol
  if (name === "Legendary") {
    return (
      <span
        title="Legendary"
        aria-label="Legendary tier"
        className="tier-badge-diamond inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border border-violet-400/55 shrink-0"
        style={{ background: "rgba(109,40,217,0.15)" }}
      >
        <span className="tier-text-rainbow">🌳 Legendary</span>
      </span>
    );
  }

  // ── Valkyrie I–III ──────────────────────────────────────────
  // Silver white + divine gold, animated wings, radiant light
  if (group === "valkyrie") {
    const num = name.split(" ")[1]; // I, II, III
    return (
      <span
        title={name}
        aria-label={`${name} tier`}
        className="tier-badge-platinum inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-white/40 text-white shrink-0"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        🪽 {name}
      </span>
    );
  }

  // ── Einherjar I–III ─────────────────────────────────────────
  // Odin's gold + raven black, animated Valknut, dramatic glow
  if (group === "einherjar") {
    return (
      <span
        title={name}
        aria-label={`${name} tier`}
        className="tier-badge-gold inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-yellow-400/50 text-yellow-300 shrink-0"
        style={{ background: "rgba(250,204,21,0.10)" }}
      >
        ᚢ {name}
      </span>
    );
  }

  // ── Jarl I–III ──────────────────────────────────────────────
  // Rich purple + gold, animated Norse crown, pulsing glow
  if (group === "jarl") {
    return (
      <span
        title={name}
        aria-label={`${name} tier`}
        className="tier-badge-gold inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-purple-400/45 text-purple-200 shrink-0"
        style={{ background: "rgba(168,85,247,0.10)" }}
      >
        ♛ {name}
      </span>
    );
  }

  // ── Huscarl I–III ───────────────────────────────────────────
  // Steel blue + silver, animated shield emblem, strong shimmer
  if (group === "huscarl") {
    return (
      <span
        title={name}
        aria-label={`${name} tier`}
        className="tier-badge-silver inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-blue-400/35 text-blue-200 shrink-0"
        style={{ background: "rgba(59,130,246,0.10)" }}
      >
        🛡 {name}
      </span>
    );
  }

  // ── Karl I–III ──────────────────────────────────────────────
  // Warm wood brown + copper, subtle Viking knotwork, gentle shimmer
  if (group === "karl") {
    return (
      <span
        title={name}
        aria-label={`${name} tier`}
        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-amber-600/40 text-amber-500 shrink-0"
        style={{ background: "rgba(180,83,9,0.12)" }}
      >
        ᚱ {name}
      </span>
    );
  }

  // ── Thrall I–III ────────────────────────────────────────────
  // Dark iron grey, simple runic symbol, no animation
  if (group === "thrall") {
    return (
      <span
        title={name}
        aria-label={`${name} tier`}
        className="inline-flex items-center gap-1 text-[10px] font-medium px-1 py-0.5 rounded border border-neutral-600/35 text-neutral-500 shrink-0"
        style={{ background: "rgba(64,64,64,0.18)" }}
      >
        · {name}
      </span>
    );
  }

  return null;
}
