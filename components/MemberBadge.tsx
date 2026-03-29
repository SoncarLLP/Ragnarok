import TierBadge from "./TierBadge";

/**
 * MemberBadge — single component that applies badge priority rules:
 *
 *   super_admin + Diamond  →  single combined animated crown+diamond badge
 *   super_admin + other    →  👑 crown + tier badge
 *   admin + any tier       →  🛡️ shield + tier badge
 *   member + any tier      →  tier badge only
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

  // ── Combined super_admin + Diamond ───────────────────────────────────────
  if (isSuperAdmin && tier === "Diamond") {
    return (
      <span
        title="Super Admin · Diamond"
        aria-label="Super Admin · Diamond"
        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full
          border border-violet-400/70
          shadow-[0_0_16px_rgba(167,139,250,0.8),0_0_6px_rgba(251,191,36,0.4),inset_0_0_8px_rgba(167,139,250,0.15)]
          animate-pulse"
        style={{
          animationDuration: "2s",
          background:
            "linear-gradient(135deg,rgba(245,158,11,0.25) 0%,rgba(139,92,246,0.35) 50%,rgba(168,85,247,0.3) 100%)",
          color: "#ede9fe",
        }}
      >
        👑 💎 Diamond
      </span>
    );
  }

  // ── super_admin + other tier ─────────────────────────────────────────────
  if (isSuperAdmin) {
    return (
      <>
        <span title="Super Admin" aria-label="Super Admin" className="text-amber-400 leading-none">
          👑
        </span>
        {tier && <TierBadge tier={tier} />}
      </>
    );
  }

  // ── admin + any tier ─────────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <>
        <span title="Admin" aria-label="Admin" className="text-blue-400 leading-none">
          🛡️
        </span>
        {tier && <TierBadge tier={tier} />}
      </>
    );
  }

  // ── Regular member ───────────────────────────────────────────────────────
  return tier ? <TierBadge tier={tier} /> : null;
}
