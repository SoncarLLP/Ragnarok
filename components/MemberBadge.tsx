import TierBadge from "./TierBadge";
import { formatTierName } from "@/lib/loyalty";

/**
 * MemberBadge — single component that enforces badge priority rules:
 *
 *   super_admin + Diamond  →  single combined 👑💎 animated crown+diamond badge
 *   super_admin + other    →  👑 crown inline + tier badge
 *   admin + any tier       →  🛡️ shield inline + tier badge
 *   member + any tier      →  tier badge only
 *   (no tier)              →  role emoji only (for admins) or null
 */
export default function MemberBadge({
  role,
  tier,
}: {
  role?: string | null;
  tier?: string | null;
}) {
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin";
  const tierName = formatTierName(tier);

  // ── Combined super_admin + Diamond ─────────────────────────────────────────
  // Single badge that is visually more impressive than standalone Diamond.
  if (isSuperAdmin && tierName === "Diamond") {
    return (
      <span
        title="Super Admin · Diamond"
        aria-label="Super Admin · Diamond"
        className="tier-badge-super-diamond inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border border-violet-400/70 shrink-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(109,40,217,0.28) 50%, rgba(168,85,247,0.22) 100%)",
        }}
      >
        👑{" "}
        <span className="tier-text-rainbow">Diamond</span>
      </span>
    );
  }

  // ── super_admin + other tier ────────────────────────────────────────────────
  if (isSuperAdmin) {
    return (
      <span className="inline-flex items-center gap-1 shrink-0">
        <span title="Super Admin" aria-label="Super Admin" className="text-amber-400 leading-none">
          👑
        </span>
        {tierName && <TierBadge tier={tierName} />}
      </span>
    );
  }

  // ── admin + any tier ────────────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <span className="inline-flex items-center gap-1 shrink-0">
        <span title="Admin" aria-label="Admin" className="text-blue-400 leading-none">
          🛡️
        </span>
        {tierName && <TierBadge tier={tierName} />}
      </span>
    );
  }

  // ── Regular member ──────────────────────────────────────────────────────────
  return tierName ? <TierBadge tier={tierName} /> : null;
}
